"""Database and journal.

Two kinds of data, kept apart:
- Scan results (`files`): disposable, recomputed by scanning. Re-scans touch only this table.
- Mine (songs, versions, tags, groups, verdicts, links): every change goes into the journal first, through
  `Store.record`, and is then applied to the database. Delete the database and `Store` rebuilds all of it
  from the journal when it next opens.
"""
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone

SCHEMA_VERSION = 1

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS changes (id TEXT PRIMARY KEY, kind TEXT NOT NULL, ts TEXT NOT NULL);

-- Scan results. file_key is 'hash:<full hash>' once known, else 'src:<original path>|<size>'.
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY,
    file_key TEXT NOT NULL UNIQUE,
    hash TEXT UNIQUE,
    code TEXT UNIQUE,
    orig_name TEXT NOT NULL,
    orig_path TEXT NOT NULL,
    size INTEGER,
    mtime REAL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'missing_at_source')),
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL
);

-- Mine. Rebuilt from the journal.
CREATE TABLE IF NOT EXISTS songs (id TEXT PRIMARY KEY, title TEXT NOT NULL, ts TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    song_id TEXT NOT NULL REFERENCES songs(id),
    file_key TEXT NOT NULL,
    orig_name TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0,
    ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    song_id TEXT NOT NULL REFERENCES songs(id),
    version_id TEXT REFERENCES versions(id),
    text TEXT NOT NULL,
    at_sec REAL,
    ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL CHECK (state IN ('confirmed', 'rejected')),
    ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL REFERENCES groups(id),
    song_id TEXT NOT NULL REFERENCES songs(id),
    PRIMARY KEY (group_id, song_id)
);
CREATE TABLE IF NOT EXISTS verdicts (
    file_key TEXT PRIMARY KEY,
    verdict TEXT NOT NULL CHECK (verdict IN ('keep', 'not_mine')),
    ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    version_id TEXT NOT NULL REFERENCES versions(id),
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('proposed', 'confirmed', 'rejected')),
    ts TEXT NOT NULL
);
"""

MINE_TABLES = ("songs", "versions", "tags", "groups", "group_members", "verdicts", "links")

# kind -> keys its data must have
REQUIRED = {
    "song_new": ("song_id", "version_id", "file_key", "orig_name"),
    "tag_add": ("tag_id", "song_id", "text"),
    "tag_remove": ("tag_id",),
    "verdict": ("file_key", "verdict"),
    "group": ("group_id", "state", "song_ids"),
    "link": ("link_id", "version_id", "kind", "target", "state"),
}
CHOICES = {
    "verdict": ("verdict", ("keep", "not_mine")),
    "group": ("state", ("confirmed", "rejected")),
    "link": ("state", ("proposed", "confirmed", "rejected")),
}


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


class Store:
    def __init__(self, db_path, journal_path):
        self.journal_path = journal_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.conn.executescript(SCHEMA)
        self.conn.execute("INSERT OR IGNORE INTO meta VALUES ('schema_version', ?)", (str(SCHEMA_VERSION),))
        self.conn.commit()
        self.journal_path.touch(exist_ok=True)
        self.known_ids = set()
        self._catch_up()

    def close(self):
        self.conn.close()

    # --- journal -------------------------------------------------------------------------------

    def _read_journal(self):
        """Every entry in order. A torn last line (crash mid-write) is skipped; damage anywhere else is an error."""
        with open(self.journal_path, encoding="utf-8") as f:
            lines = f.read().split("\n")
        if lines and lines[-1] == "":
            lines.pop()
        for n, line in enumerate(lines):
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                if n == len(lines) - 1:
                    return
                raise ValueError(f"Journal line {n + 1} is damaged; refusing to guess.")

    def _append(self, entry):
        with open(self.journal_path, "a+b") as f:
            if f.tell() > 0:
                f.seek(-1, os.SEEK_END)
                if f.read(1) != b"\n":  # torn last line: start a fresh line
                    f.write(b"\n")
            f.write((json.dumps(entry, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8"))
            f.flush()
            os.fsync(f.fileno())

    def _catch_up(self):
        """Apply journal entries the database hasn't seen: a lost database, or a crash between journal and database."""
        applied = {r["id"] for r in self.conn.execute("SELECT id FROM changes")}
        with self.conn:
            for entry in self._read_journal():
                self.known_ids.add(entry["id"])
                if entry["id"] not in applied:
                    self._apply(entry)
                    applied.add(entry["id"])

    # --- the one function that records a change of mine ------------------------------------------

    def record(self, kind, data, change_id=None):
        """Journal first, then database. Returns False if this id was already recorded (nothing happens)."""
        change_id = change_id or str(uuid.uuid4())
        if change_id in self.known_ids:
            return False
        self._validate(kind, data)
        entry = {"id": change_id, "ts": now(), "kind": kind, "data": data}
        self._append(entry)
        self.known_ids.add(change_id)
        with self.conn:
            self._apply(entry)
        return True

    def _validate(self, kind, data):
        if kind not in REQUIRED:
            raise ValueError(f"Unknown kind of change: {kind!r}")
        missing = [k for k in REQUIRED[kind] if k not in data]
        if missing:
            raise ValueError(f"{kind} is missing {missing}")
        if kind in CHOICES:
            field, allowed = CHOICES[kind]
            if data[field] not in allowed:
                raise ValueError(f"{kind} {field} must be one of {allowed}")
        c = self.conn
        if kind == "tag_add":
            if not c.execute("SELECT 1 FROM songs WHERE id=?", (data["song_id"],)).fetchone():
                raise ValueError("Tag is for a song that doesn't exist.")
            vid = data.get("version_id")
            if vid and not c.execute("SELECT 1 FROM versions WHERE id=? AND song_id=?", (vid, data["song_id"])).fetchone():
                raise ValueError("Tag names a version that isn't one of that song's versions.")
        elif kind == "group":
            for sid in data["song_ids"]:
                if not c.execute("SELECT 1 FROM songs WHERE id=?", (sid,)).fetchone():
                    raise ValueError("Group names a song that doesn't exist.")
        elif kind == "link":
            if not c.execute("SELECT 1 FROM versions WHERE id=?", (data["version_id"],)).fetchone():
                raise ValueError("Link is for a version that doesn't exist.")

    def _apply(self, entry):
        kind, d, ts = entry["kind"], entry["data"], entry["ts"]
        c = self.conn
        if kind == "song_new":
            c.execute("INSERT OR IGNORE INTO songs VALUES (?,?,?)", (d["song_id"], d.get("title") or d["orig_name"], ts))
            c.execute("INSERT OR IGNORE INTO versions VALUES (?,?,?,?,?,?)",
                      (d["version_id"], d["song_id"], d["file_key"], d["orig_name"], 1, ts))
        elif kind == "tag_add":
            c.execute("INSERT OR REPLACE INTO tags VALUES (?,?,?,?,?,?)",
                      (d["tag_id"], d["song_id"], d.get("version_id"), d["text"], d.get("at_sec"), ts))
        elif kind == "tag_remove":
            c.execute("DELETE FROM tags WHERE id=?", (d["tag_id"],))
        elif kind == "verdict":
            c.execute("INSERT OR REPLACE INTO verdicts VALUES (?,?,?)", (d["file_key"], d["verdict"], ts))
        elif kind == "group":
            c.execute("INSERT OR REPLACE INTO groups VALUES (?,?,?)", (d["group_id"], d["state"], ts))
            c.execute("DELETE FROM group_members WHERE group_id=?", (d["group_id"],))
            c.executemany("INSERT INTO group_members VALUES (?,?)", [(d["group_id"], s) for s in d["song_ids"]])
        elif kind == "link":
            c.execute("INSERT OR REPLACE INTO links VALUES (?,?,?,?,?,?)",
                      (d["link_id"], d["version_id"], d["kind"], d["target"], d["state"], ts))
        else:
            raise ValueError(f"Journal has an unknown kind of change: {kind!r}")
        c.execute("INSERT INTO changes VALUES (?,?,?)", (entry["id"], kind, ts))

    # --- scan results: never touches anything of mine ---------------------------------------------

    def upsert_file(self, file_key, orig_name, orig_path, size, mtime, full_hash=None, code=None):
        """Add or update one scanned file. Touches only `files`."""
        stamp = now()
        with self.conn:
            self.conn.execute(
                """INSERT INTO files (file_key, hash, code, orig_name, orig_path, size, mtime, first_seen, last_seen)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(file_key) DO UPDATE SET orig_name=excluded.orig_name, orig_path=excluded.orig_path,
                       size=excluded.size, mtime=excluded.mtime, status='present', last_seen=excluded.last_seen""",
                (file_key, full_hash, code, orig_name, orig_path, size, mtime, stamp, stamp))

    def snapshot(self):
        """All of mine, as plain rows, for comparing before and after a rebuild."""
        out = {}
        for table in MINE_TABLES:
            out[table] = [tuple(r) for r in self.conn.execute(f"SELECT * FROM {table} ORDER BY 1, 2")]
        return out
