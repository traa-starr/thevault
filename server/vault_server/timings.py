"""The phone's own timings (Phase 3, NEXT D): how long a search takes and how long Next takes to make sound.

The app sends them best effort to POST /timings. They go in `timings.jsonl` in the library folder: not the database, not
the journal, nothing to restore. Numbers only: the phone never sends search text or titles, and anything else is dropped.
`vault_cli.py timings <library>` prints typical and slow-end numbers.
"""
import json
import statistics
from datetime import datetime, timezone
from pathlib import Path

TIMINGS_NAME = "timings.jsonl"
KEPT_LINES = 5000  # the newest; older ones are dropped when the file is rewritten
MAX_SAMPLES = 200  # per report
PATHS = ("session", "sort", "library")


def _clean(sample):
    """One sample as the server keeps it, or None. Only known kinds and plain numbers survive."""
    if not isinstance(sample, dict):
        return None
    ms = sample.get("ms")
    if isinstance(ms, bool) or not isinstance(ms, (int, float)) or not 0 <= ms < 600000:
        return None
    if sample.get("kind") == "search":
        tags = sample.get("tags")
        if isinstance(tags, bool) or not isinstance(tags, int) or tags < 0:
            return None
        return {"kind": "search", "ms": round(float(ms), 1), "tags": tags}
    if sample.get("kind") == "next" and sample.get("path") in PATHS:
        return {"kind": "next", "ms": round(float(ms), 1), "path": sample["path"]}
    return None


def write_timings(root, body):
    """Appends one report from the phone. Returns how many samples were kept. Raises ValueError for a non-report."""
    if not isinstance(body, dict) or not isinstance(body.get("samples"), list):
        raise ValueError("That isn't a timings report.")
    version = body.get("version")
    version = version[:40] if isinstance(version, str) else ""
    kept = [one for one in (_clean(s) for s in body["samples"][:MAX_SAMPLES]) if one]
    if not kept:
        return 0
    at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    path = Path(root) / TIMINGS_NAME
    with open(path, "a", encoding="utf-8") as f:
        for one in kept:
            f.write(json.dumps({"at": at, "version": version, **one}) + "\n")
    _trim(path)
    return len(kept)


def _trim(path):
    lines = path.read_text(encoding="utf-8").splitlines()
    if len(lines) > KEPT_LINES:
        path.write_text("\n".join(lines[-KEPT_LINES:]) + "\n", encoding="utf-8")


def _read(root):
    path = Path(root) / TIMINGS_NAME
    if not path.exists():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            one = _clean(json.loads(line))
        except ValueError:
            continue
        if one:
            out.append(one)
    return out


def _spread(values):
    values = sorted(values)
    slow = values[min(len(values) - 1, int(len(values) * 0.95))]
    return f"typical {statistics.median(values):.0f} ms, slow end {slow:.0f} ms, worst {values[-1]:.0f} ms ({len(values)} times)"


def timings_report(root):
    """Lines for the `timings` command."""
    samples = _read(root)
    if not samples:
        return ["No timings from the phone yet. Search or tap Next on the phone; it sends them when it goes to the background."]
    lines = []
    searches = [s for s in samples if s["kind"] == "search"]
    if searches:
        lines.append(f"Search: {_spread([s['ms'] for s in searches])}, about {searches[-1]['tags']:,} tags")
    else:
        lines.append("Search: none yet")
    for path in PATHS:
        nexts = [s["ms"] for s in samples if s["kind"] == "next" and s["path"] == path]
        if nexts:
            over = sum(1 for ms in nexts if ms > 1000)
            lines.append(f"Next to first sound, {path}: {_spread(nexts)}; over 1 s: {over}")
    return lines
