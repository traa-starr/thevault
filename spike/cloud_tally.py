"""Read-only tally for the cloud tidy memo (ROADMAP 5.0b): which songs in a music folder are mine, which have a Vault
library copy, and sizes. Reads the Vault database only (names and sizes it already holds); opens no music file.

Run: python spike/cloud_tally.py <library folder> <music root>   (writes spike/output/cloud-tally.txt: song names)
"""
import sqlite3
import sys
from pathlib import Path

lib, root = Path(sys.argv[1]), sys.argv[2].rstrip("\\/") + "\\"
conn = sqlite3.connect(f"file:{(lib / 'vault.db').as_posix()}?mode=ro", uri=True)
rows = conn.execute("""
    SELECT s.path, s.name, s.size, s.cloud_only, s.status, p.song_id, COALESCE(f.value, 'unknown') AS mine,
           i.song_id IS NOT NULL AS in_library, v.verdict
    FROM sources s LEFT JOIN song_places p USING (path)
    LEFT JOIN song_fields f ON f.song_id=p.song_id AND f.field='mine'
    LEFT JOIN imported i ON i.song_id=p.song_id
    LEFT JOIN verdicts v ON v.file_key=s.file_key
    WHERE substr(s.path, 1, ?) = ?""", (len(root), root)).fetchall()
gb = lambda rs: f"{sum(r[2] for r in rs) / 1e9:.2f} GB"
groups = {
    "mine, with a Vault library copy": [r for r in rows if r[6] == "mine" and r[7]],
    "mine, NO library copy": [r for r in rows if r[6] == "mine" and not r[7]],
    "not mine (hidden)": [r for r in rows if r[6] == "not mine" or r[8] == "not_mine"],
    "unsorted / likely mine": [r for r in rows if r[6] in ("unknown", "likely mine") and r[8] != "not_mine"],
}
out = [f"Files under the music root: {len(rows)}, {gb(rows)}; cloud-only now: {sum(r[3] for r in rows)}; "
       f"gone since last scan: {sum(r[4] != 'present' for r in rows)}"]
for name, rs in groups.items():
    out.append(f"{name}: {len(rs)} files, {gb(rs)}")
out.append(f"skipped copies (a duplicate of a kept file): {sum(r[8] == 'skip' for r in rows)}")
summary = list(out)
for name in ("mine, NO library copy", "unsorted / likely mine"):
    out.append(f"\n## {name}")
    out += [f"{r[2] / 1e6:7.1f} MB  {r[0][len(root):]}" for r in sorted(groups[name], key=lambda r: r[0])]
Path("spike/output").mkdir(parents=True, exist_ok=True)
Path("spike/output/cloud-tally.txt").write_text("\n".join(out) + "\n", encoding="utf-8")
print("\n".join(summary))
