"""The phone's own timings (Phase 3, NEXT D): how long a search takes and how long Next takes to make sound.

The app sends them best effort to POST /timings. They go in `timings.jsonl` in the library folder: not the database, not
the journal, nothing to restore. Numbers only: the phone never sends search text or titles, and anything else is dropped.
`vault_cli.py timings <library>` prints typical and slow-end numbers, and judges each play path (play first, 2026-11-08):
PASS when its typical is within 2x Sort cards' and none took over 1 s, counting only the newest app code's samples.
"""
import json
import re
import statistics
from datetime import datetime, timezone
from pathlib import Path

TIMINGS_NAME = "timings.jsonl"
KEPT_LINES = 5000  # the newest; older ones are dropped when the file is rewritten
MAX_SAMPLES = 200  # per report
PATHS = ("session", "sort", "library", "previous", "lockscreen", "search", "restore")
STAGES = ("load", "seek", "start")  # where a start's time went, in ms (the rest is the app's own thread)
SOURCES = ("phone", "stream")
EXT = re.compile(r"[a-z0-9]{0,5}")
PHONE_COUNT_NAME = "phone-copies-count.json"  # what the phone last said it holds; rewritten whole, nothing to restore
WHERE = ("open", "locked")
COUNTS = ("reports", "redraws", "net", "writes", "phone", "stream")
# Per minute of playing (energy, 2026-11-09). reports: iOS tells the app the time twice a second while a song plays,
# 120 a minute; the app can't lower that without a rebuild, so the ceiling only catches something adding to it.
# redraws: locked, only a song change, a pause or trouble may draw (a 3-minute song is under 1 a minute; 6 leaves room
# for skipping); open, the seek bar moves on each report. net and writes: nothing should poll while a song plays.
CEILINGS = {"locked": {"reports": 130, "redraws": 6, "net": 2, "writes": 6},
            "open": {"reports": 130, "redraws": 135, "net": 6, "writes": 8}}
MIN_ENERGY_MIN = 5  # fewer minutes of playing and it isn't judged yet
MIN_SAMPLES = 5  # fewer and a path isn't judged yet
LIMIT_MS = 1000
TIMES_SORT = 2


def _ms(value):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and 0 <= value < 600000


def _clean(sample):
    """One sample as the server keeps it, or None. Only known kinds and plain numbers survive."""
    if not isinstance(sample, dict):
        return None
    ms = sample.get("ms")
    if not _ms(ms):
        return None
    if sample.get("kind") == "energy" and sample.get("where") in WHERE and ms >= 1000:
        counts = {k: sample.get(k) for k in COUNTS}
        if any(isinstance(v, bool) or not isinstance(v, int) or not 0 <= v < 1000000 for v in counts.values()):
            return None
        return {"kind": "energy", "ms": round(float(ms)), "where": sample["where"], **counts}
    if sample.get("kind") == "search":
        tags = sample.get("tags")
        if isinstance(tags, bool) or not isinstance(tags, int) or tags < 0:
            return None
        return {"kind": "search", "ms": round(float(ms), 1), "tags": tags}
    if sample.get("kind") == "next" and sample.get("path") in PATHS:
        out = {"kind": "next", "ms": round(float(ms), 1), "path": sample["path"]}
        out.update({k: round(float(sample[k]), 1) for k in STAGES if _ms(sample.get(k))})
        if isinstance(sample.get("reseek"), bool):
            out["reseek"] = sample["reseek"]
        if sample.get("src") in SOURCES:
            out["src"] = sample["src"]
        if isinstance(sample.get("ext"), str) and EXT.fullmatch(sample["ext"]):
            out["ext"] = sample["ext"]
        return out
    return None


def write_timings(root, body):
    """Appends one report from the phone. Returns how many samples were kept. Raises ValueError for a non-report."""
    if not isinstance(body, dict) or not isinstance(body.get("samples"), list):
        raise ValueError("That isn't a timings report.")
    version = body.get("version")
    version = version[:40] if isinstance(version, str) else ""
    kept = [one for one in (_clean(s) for s in body["samples"][:MAX_SAMPLES]) if one]
    _write_phone_count(root, body.get("copies"))
    if not kept:
        return 0
    at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    path = Path(root) / TIMINGS_NAME
    with open(path, "a", encoding="utf-8") as f:
        for one in kept:
            f.write(json.dumps({"at": at, "version": version, **one}) + "\n")
    _trim(path)
    return len(kept)


def _write_phone_count(root, copies):
    """The phone's own count of Mine songs it holds, sent along with its timings: two plain numbers or nothing."""
    if not isinstance(copies, dict):
        return
    stored, wanted = copies.get("stored"), copies.get("wanted")
    if any(isinstance(v, bool) or not isinstance(v, int) or not 0 <= v < 1000000 for v in (stored, wanted)):
        return
    at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    (Path(root) / PHONE_COUNT_NAME).write_text(json.dumps({"stored": stored, "wanted": wanted, "at": at}), encoding="utf-8")


def read_phone_count(root):
    """{stored, wanted, at} as the phone last said, or None."""
    try:
        data = json.loads((Path(root) / PHONE_COUNT_NAME).read_text(encoding="utf-8"))
        return {"stored": int(data["stored"]), "wanted": int(data["wanted"]), "at": str(data["at"])}
    except (OSError, ValueError, KeyError, TypeError):
        return None


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
            one["version"] = line_version(line)
            out.append(one)
    return out


def line_version(line):
    try:
        version = json.loads(line).get("version")
    except ValueError:
        return ""
    return version if isinstance(version, str) else ""


def _spread(values):
    values = sorted(values)
    slow = values[min(len(values) - 1, int(len(values) * 0.95))]
    return f"typical {statistics.median(values):.0f} ms, slow end {slow:.0f} ms, worst {values[-1]:.0f} ms ({len(values)} times)"


def judge(samples, path, sort_typical):
    """PASS, FAIL or 'not enough yet' for one path's Next-to-first-sound samples (ms), against Sort cards' typical."""
    if len(samples) < MIN_SAMPLES:
        return f"not enough yet ({len(samples)} of {MIN_SAMPLES})"
    typical = statistics.median(samples)
    over = sum(1 for ms in samples if ms > LIMIT_MS)
    why = []
    if sort_typical is not None and path != "sort" and typical > TIMES_SORT * sort_typical:
        why.append(f"typical over {TIMES_SORT}x Sort's {sort_typical:.0f} ms")
    if over:
        why.append(f"{over} over 1 s")
    return f"FAIL ({', '.join(why)})" if why else "PASS"


def _stages(samples):
    """Typical load / seek / start, and the rest (the app's own thread), when the phone sent them."""
    staged = [s for s in samples if all(k in s for k in STAGES)]
    if not staged:
        return ""
    parts = {k: statistics.median(s[k] for s in staged) for k in STAGES}
    rest = statistics.median(s["ms"] - sum(s[k] for k in STAGES) for s in staged)
    reseeks = sum(1 for s in staged if s.get("reseek"))
    return (f"    where it went (typical): load {parts['load']:.0f}, seek {parts['seek']:.0f}, start {parts['start']:.0f}, "
            f"app {max(rest, 0):.0f} ms; second seek {reseeks} of {len(staged)}")


def _sources(samples):
    """Typical per source: the phone's copies by file type, and the stream."""
    groups = {}
    for s in samples:
        if "src" in s:
            name = f"phone {s.get('ext') or '?'}" if s["src"] == "phone" else "stream"
            groups.setdefault(name, []).append(s["ms"])
    if len(groups) < 1:
        return ""
    return "    by source: " + ", ".join(f"{k} {statistics.median(v):.0f} ms ({len(v)})" for k, v in sorted(groups.items()))


def energy_lines(samples):
    """What kept the phone awake per minute of playing, screen open and locked apart, judged against CEILINGS."""
    energy = [s for s in samples if s["kind"] == "energy"]
    if not energy:
        return ["Energy while playing: none yet (the phone sends it after a minute or more of playing)"]
    newest = energy[-1]["version"]
    now = [s for s in energy if s["version"] == newest]
    phone, stream = sum(s["phone"] for s in now), sum(s["stream"] for s in now)
    lines = [f"Energy while playing, app code {newest or 'unnamed'}, per minute. Plays: {phone} from the phone's copy, {stream} streamed"]
    for where in WHERE:
        mine = [s for s in now if s["where"] == where]
        minutes = sum(s["ms"] for s in mine) / 60000
        if not mine:
            lines.append(f"  {where}: none yet")
            continue
        per = {k: sum(s[k] for s in mine) / minutes for k in CEILINGS[where]}
        over = [f"{k} over {CEILINGS[where][k]}" for k in per if per[k] > CEILINGS[where][k]]
        verdict = (f"not enough yet ({minutes:.0f} of {MIN_ENERGY_MIN} min)" if minutes < MIN_ENERGY_MIN
                   else f"FAIL ({', '.join(over)})" if over else "PASS")
        lines.append(f"  {where} ({minutes:.0f} min): wake-ups {per['reports']:.0f}, redraws {per['redraws']:.1f}, "
                     f"network calls {per['net']:.1f}, file writes {per['writes']:.1f}. {verdict}")
    return lines


def timings_report(root):
    """Lines for the `timings` command (and REPORT's timings block)."""
    samples = _read(root)
    if not samples:
        return ["No timings from the phone yet. Search or tap Next on the phone; it sends them when it goes to the background."]
    lines = []
    searches = [s for s in samples if s["kind"] == "search"]
    if searches:
        lines.append(f"Search: {_spread([s['ms'] for s in searches])}, about {searches[-1]['tags']:,} tags")
    else:
        lines.append("Search: none yet")
    lines.extend(energy_lines(samples))
    count = read_phone_count(root)
    if count:
        lines.append(f"Mine songs on the phone: {count['stored']:,} of {count['wanted']:,} (the phone said so at {count['at']})")
    nexts = [s for s in samples if s["kind"] == "next"]
    if not nexts:
        return lines
    # only the newest app code is judged: older numbers are from code that's gone
    newest = nexts[-1]["version"]
    now = [s for s in nexts if s["version"] == newest]
    lines.append(f"Tap to first sound, app code {newest or 'unnamed'} ({len(now)} of {len(nexts)} samples; older code not judged). "
                 f"Pass: typical within {TIMES_SORT}x Sort, none over 1 s")
    sort = [s["ms"] for s in now if s["path"] == "sort"]
    sort_typical = statistics.median(sort) if len(sort) >= MIN_SAMPLES else None
    for path in PATHS:
        mine = [s for s in now if s["path"] == path]
        if not mine:
            lines.append(f"  {path}: none yet")
            continue
        values = [s["ms"] for s in mine]
        over = sum(1 for ms in values if ms > LIMIT_MS)
        lines.append(f"  {path}: {_spread(values)}; over 1 s: {over}. {judge(values, path, sort_typical)}")
        lines.extend(line for line in (_stages(mine), _sources(mine)) if line)
    return lines
