"""Database and journal.

Two kinds of data, kept apart:
- Scan results (`files`): disposable, recomputed by scanning. Re-scans touch only this table.
- Mine (songs, versions, tags, groups, verdicts, links): every change goes into the journal first, through
  `Store.record`, and is then applied to the database. Delete the database and `Store` rebuilds all of it
  from the journal when it next opens.

The write lock lets the server and laptop commands take turns, one journal-and-database write at a time.
"""
import json
import msvcrt
import os
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

SCHEMA_VERSION = 4
LOCK_NAME = "write.lock"
LOCK_WAIT_SECONDS = 5

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

-- One row per place a file was found. Byte-identical copies share a file_key but each has its own row here.
CREATE TABLE IF NOT EXISTS sources (
    path TEXT PRIMARY KEY,
    file_key TEXT NOT NULL,
    folder TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    mtime REAL NOT NULL,
    cloud_only INTEGER NOT NULL,
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
-- Which song each place belongs to. 'likely' is a cloud-only file matched by name and size only, never sure.
CREATE TABLE IF NOT EXISTS song_places (
    path TEXT PRIMARY KEY,
    song_id TEXT NOT NULL REFERENCES songs(id),
    state TEXT NOT NULL CHECK (state IN ('sure', 'likely')),
    why TEXT NOT NULL,
    ts TEXT NOT NULL
);
-- Title, date, source and mine status. origin says whether it's a guess from the file or mine; basis says where a guess came from.
CREATE TABLE IF NOT EXISTS song_fields (
    song_id TEXT NOT NULL REFERENCES songs(id),
    field TEXT NOT NULL CHECK (field IN ('title', 'date', 'source', 'mine')),
    value TEXT NOT NULL,
    origin TEXT NOT NULL CHECK (origin IN ('guess', 'manual')),
    basis TEXT,
    ts TEXT NOT NULL,
    PRIMARY KEY (song_id, field)
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
    verdict TEXT NOT NULL CHECK (verdict IN ('keep', 'not_mine', 'skip')),
    copy_of TEXT,
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
-- Versions: each song in a family points straight at its Main, the Main at itself. A plain song has no row.
-- Added without a schema bump: an older database just gets the empty table, which is right, as no journal line fills it yet.
CREATE TABLE IF NOT EXISTS song_family (
    song_id TEXT PRIMARY KEY REFERENCES songs(id),
    main_id TEXT NOT NULL REFERENCES songs(id),
    ts TEXT NOT NULL
);
-- Mains I picked by hand with Make main: that family keeps it. Any other family's Main is its newest version.
-- Added without a schema bump, like song_family: an older database gets the empty table, then the journal fills it.
CREATE TABLE IF NOT EXISTS family_pick (main_id TEXT PRIMARY KEY REFERENCES songs(id), ts TEXT NOT NULL);
-- The library's own copy of each Mine song: `audio/<code>/<name>`, checked by fingerprint (sha256) when made. src_* is
-- the original it came from, so a rerun knows it hasn't changed without reading it again. Added without a schema bump.
CREATE TABLE IF NOT EXISTS imported (
    song_id TEXT PRIMARY KEY REFERENCES songs(id),
    hash TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    src_path TEXT NOT NULL,
    src_size INTEGER NOT NULL,
    src_mtime REAL NOT NULL,
    ts TEXT NOT NULL
);
"""

MINE_TABLES = ("songs", "versions", "song_places", "song_fields", "tags", "groups", "group_members", "verdicts", "links", "song_family",
               "family_pick", "imported")

# kind -> keys its data must have
REQUIRED = {
    "song_new": ("song_id", "version_id", "file_key", "orig_name"),
    "tag_add": ("tag_id", "song_id", "text"),
    "tag_remove": ("tag_id",),
    "verdict": ("file_key", "verdict"),
    "group": ("group_id", "state", "song_ids"),
    "link": ("link_id", "version_id", "kind", "target", "state"),
    "sorting_applied": (),
    "song_place": ("path", "song_id", "state", "why"),
    "song_merge": ("from_id", "into_id"),
    "version_key": ("version_id", "file_key"),
    "song_field": ("song_id", "field", "value", "origin"),
    "song_field_restore": ("song_id", "field", "value"),
    "family": ("songs", "before"),
    "imported": ("song_id",),  # with hash, code, name, size, src_*; or dropped: true when the song is no longer Mine
}
CHOICES = {
    "song_place": ("state", ("sure", "likely")),
    "song_field": ("origin", ("guess", "manual")),
    "verdict": ("verdict", ("keep", "not_mine", "skip")),
    "group": ("state", ("confirmed", "rejected")),
    "link": ("state", ("proposed", "confirmed", "rejected")),
}


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


class Busy(Exception):
    """Something else held the write lock for too long. Nothing was written; try again."""


_held = threading.local()


@contextmanager
def write_lock(path, wait=LOCK_WAIT_SECONDS):
    """One writer at a time, across threads and programs. The same thread can take it again inside itself.
    Windows drops the lock if the holder crashes, so it can't get stuck."""
    held = _held.__dict__.setdefault("paths", set())
    key = str(path)
    if key in held:
        yield
        return
    with open(path, "a+b") as f:
        f.seek(0)
        give_up = time.monotonic() + wait
        while True:
            try:
                msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
                break
            except OSError:
                if time.monotonic() >= give_up:
                    raise Busy("Another write is still running.") from None
                time.sleep(0.05)
        held.add(key)
        try:
            yield
        finally:
            held.discard(key)
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)


class Store:
    def __init__(self, db_path, journal_path):
        self.journal_path = journal_path
        self.lock_path = journal_path.with_name(LOCK_NAME)
        with write_lock(self.lock_path):
            self.conn = self._connect(db_path)
            try:
                self.conn.execute("PRAGMA foreign_keys=ON")
                self.conn.executescript(SCHEMA)
                self.conn.execute("INSERT OR IGNORE INTO meta VALUES ('schema_version', ?)", (str(SCHEMA_VERSION),))
                self.conn.commit()
                self.journal_path.touch(exist_ok=True)
                self.known_ids = set()
                self._entries = None  # (journal size, entries), so a sweep's Undo doesn't reread the journal per song
                self._catch_up()
            except BaseException:
                self.conn.close()
                raise

    @staticmethod
    def _connect(db_path):
        """An older database is thrown away: scan results get rescanned and mine comes back from the journal."""
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        has_meta = conn.execute("SELECT 1 FROM sqlite_master WHERE name='meta'").fetchone()
        row = has_meta and conn.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
        if row and int(row["value"]) < SCHEMA_VERSION:
            conn.close()
            os.unlink(db_path)
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
        return conn

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
        with write_lock(self.lock_path):
            if change_id in self.known_ids:
                return False
            self._validate(kind, data)
            entry = {"id": change_id, "ts": now(), "kind": kind, "data": data}
            size = os.path.getsize(self.journal_path)
            self._append(entry)
            self.known_ids.add(change_id)
            if self._entries and self._entries[0] == size:
                self._entries[1].append(entry)
                self._entries = (os.path.getsize(self.journal_path), self._entries[1])
            with self.conn:
                self._apply(entry)
        return True

    def manual_mine_line(self, song_id):
        """The data of the journal line that set this song's current manual mine value, or None. Each restore cancels
        the latest line not yet cancelled, so restores unwind in order. Follows songs that were merged into this one."""
        size = os.path.getsize(self.journal_path)
        if not self._entries or self._entries[0] != size:  # another program wrote to it
            self._entries = (size, list(self._read_journal()))
        ids, cancelled = {song_id}, 0
        for entry in reversed(self._entries[1]):
            kind, d = entry["kind"], entry["data"]
            if kind == "song_merge" and d["into_id"] in ids:
                ids.add(d["from_id"])
            elif kind == "song_field_restore" and d["song_id"] in ids and d["field"] == "mine":
                cancelled += 1
            elif kind == "song_field" and d["song_id"] in ids and d["field"] == "mine" and d["origin"] == "manual":
                if not cancelled:
                    return d
                cancelled -= 1
        return None

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
        elif kind in ("song_place", "song_field", "song_field_restore"):
            if not c.execute("SELECT 1 FROM songs WHERE id=?", (data["song_id"],)).fetchone():
                raise ValueError(f"{kind} is for a song that doesn't exist.")
            if kind == "song_field" and data["field"] not in ("title", "date", "source", "mine"):
                raise ValueError("song_field must be title, date, source or mine.")
            if kind == "song_field_restore":
                if data["field"] != "mine":
                    raise ValueError("song_field_restore only handles mine.")
                if data["value"] is not None and data.get("origin") not in ("guess", "manual"):
                    raise ValueError("song_field_restore needs a guess or manual origin to put back.")
        elif kind == "imported":
            if not c.execute("SELECT 1 FROM songs WHERE id=?", (data["song_id"],)).fetchone():
                raise ValueError("imported is for a song that doesn't exist.")
            if not data.get("dropped") and any(k not in data for k in ("hash", "code", "name", "size", "src_path", "src_size", "src_mtime")):
                raise ValueError("imported needs the copy's hash, code, name, size and where it came from.")
        elif kind == "song_merge":
            for sid in (data["from_id"], data["into_id"]):
                if not c.execute("SELECT 1 FROM songs WHERE id=?", (sid,)).fetchone():
                    raise ValueError("Merge names a song that doesn't exist.")

    def _merge_songs(self, old, into):
        """Everything of mine on the old song moves to the one it joined. My manual values win over guesses."""
        c = self.conn
        c.execute("UPDATE versions SET song_id=?, is_current=0 WHERE song_id=?", (into, old))
        c.execute("UPDATE song_places SET song_id=? WHERE song_id=?", (into, old))
        c.execute("UPDATE tags SET song_id=? WHERE song_id=?", (into, old))
        c.execute("INSERT OR IGNORE INTO group_members SELECT group_id, ? FROM group_members WHERE song_id=?", (into, old))
        c.execute("DELETE FROM group_members WHERE song_id=?", (old,))
        c.execute("""INSERT OR REPLACE INTO song_fields
                     SELECT ?, field, value, origin, basis, ts FROM song_fields f WHERE song_id=? AND origin='manual'
                     AND NOT EXISTS (SELECT 1 FROM song_fields m WHERE m.song_id=? AND m.field=f.field AND m.origin='manual')""",
                  (into, old, into))
        c.execute("DELETE FROM song_fields WHERE song_id=?", (old,))
        c.execute("UPDATE song_family SET main_id=? WHERE main_id=?", (into, old))
        c.execute("UPDATE OR IGNORE song_family SET song_id=? WHERE song_id=?", (into, old))
        c.execute("DELETE FROM song_family WHERE song_id=?", (old,))
        c.execute("UPDATE OR IGNORE family_pick SET main_id=? WHERE main_id=?", (into, old))
        c.execute("DELETE FROM family_pick WHERE main_id=?", (old,))
        c.execute("UPDATE OR IGNORE imported SET song_id=? WHERE song_id=?", (into, old))
        c.execute("DELETE FROM imported WHERE song_id=?", (old,))
        c.execute("DELETE FROM songs WHERE id=?", (old,))
        c.execute("UPDATE songs SET title=COALESCE((SELECT value FROM song_fields WHERE song_id=? AND field='title'), title) WHERE id=?",
                  (into, into))

    def _apply(self, entry):
        kind, d, ts = entry["kind"], entry["data"], entry["ts"]
        c = self.conn
        if kind == "song_new":
            c.execute("INSERT OR IGNORE INTO songs VALUES (?,?,?)", (d["song_id"], d.get("title") or d["orig_name"], ts))
            c.execute("INSERT OR IGNORE INTO versions VALUES (?,?,?,?,?,?)",
                      (d["version_id"], d["song_id"], d["file_key"], d["orig_name"], 1, ts))
            # one journal line, so a crash can't leave a song with no places
            c.executemany("INSERT OR REPLACE INTO song_places VALUES (?,?,?,?,?)",
                          [(p["path"], d["song_id"], p["state"], p["why"], ts) for p in d.get("places", [])])
        elif kind == "song_place":
            c.execute("INSERT OR REPLACE INTO song_places VALUES (?,?,?,?,?)", (d["path"], d["song_id"], d["state"], d["why"], ts))
        elif kind == "song_merge":
            self._merge_songs(d["from_id"], d["into_id"])
        elif kind == "version_key":
            c.execute("UPDATE versions SET file_key=? WHERE id=?", (d["file_key"], d["version_id"]))
        elif kind == "song_field":
            cur = c.execute("SELECT origin FROM song_fields WHERE song_id=? AND field=?", (d["song_id"], d["field"])).fetchone()
            if not (cur and cur["origin"] == "manual" and d["origin"] == "guess"):  # a guess never overwrites mine, on replay too
                c.execute("INSERT OR REPLACE INTO song_fields VALUES (?,?,?,?,?,?)",
                          (d["song_id"], d["field"], d["value"], d["origin"], d.get("basis"), ts))
                if d["field"] == "title":
                    c.execute("UPDATE songs SET title=? WHERE id=?", (d["value"], d["song_id"]))
        elif kind == "song_field_restore":  # puts back the earlier value, or no value if there wasn't one
            if d["value"] is None:
                c.execute("DELETE FROM song_fields WHERE song_id=? AND field=?", (d["song_id"], d["field"]))
            else:
                c.execute("INSERT OR REPLACE INTO song_fields VALUES (?,?,?,?,?,?)",
                          (d["song_id"], d["field"], d["value"], d["origin"], d.get("basis"), ts))
        elif kind == "tag_add":
            c.execute("INSERT OR REPLACE INTO tags VALUES (?,?,?,?,?,?)",
                      (d["tag_id"], d["song_id"], d.get("version_id"), d["text"], d.get("at_sec"), ts))
        elif kind == "tag_remove":
            c.execute("DELETE FROM tags WHERE id=?", (d["tag_id"],))
        elif kind == "verdict":
            c.execute("INSERT OR REPLACE INTO verdicts VALUES (?,?,?,?)", (d["file_key"], d["verdict"], d.get("copy_of"), ts))
        elif kind == "group":
            c.execute("INSERT OR REPLACE INTO groups VALUES (?,?,?)", (d["group_id"], d["state"], ts))
            c.execute("DELETE FROM group_members WHERE group_id=?", (d["group_id"],))
            c.executemany("INSERT INTO group_members VALUES (?,?)", [(d["group_id"], s) for s in d["song_ids"]])
        elif kind == "link":
            c.execute("INSERT OR REPLACE INTO links VALUES (?,?,?,?,?,?)",
                      (d["link_id"], d["version_id"], d["kind"], d["target"], d["state"], ts))
        elif kind == "family":  # each song's new Main, or None to be a plain song again
            for sid, main in d["songs"].items():
                if main is None:
                    c.execute("DELETE FROM song_family WHERE song_id=?", (sid,))
                else:
                    c.execute("INSERT OR REPLACE INTO song_family VALUES (?,?,?)", (sid, main, ts))
            for sid, on in (d.get("picked") or {}).items():
                if on:
                    c.execute("INSERT OR REPLACE INTO family_pick VALUES (?,?)", (sid, ts))
                else:
                    c.execute("DELETE FROM family_pick WHERE main_id=?", (sid,))
            # a pick only means something on a Main
            c.execute("DELETE FROM family_pick WHERE main_id NOT IN (SELECT song_id FROM song_family WHERE main_id=song_id)")
        elif kind == "imported":
            if d.get("dropped"):
                c.execute("DELETE FROM imported WHERE song_id=?", (d["song_id"],))
            else:
                c.execute("INSERT OR REPLACE INTO imported VALUES (?,?,?,?,?,?,?,?,?)",
                          (d["song_id"], d["hash"], d["code"], d["name"], d["size"], d["src_path"], d["src_size"], d["src_mtime"], ts))
        elif kind == "sorting_applied":
            pass  # only the journal line matters: the sorting file is turned into verdicts once
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

    def upsert_source(self, path, file_key, folder, name, size, mtime, cloud_only, stamp):
        """Add or update one place a file was found. Touches only `sources`."""
        with self.conn:
            self.conn.execute(
                """INSERT INTO sources (path, file_key, folder, name, size, mtime, cloud_only, first_seen, last_seen)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(path) DO UPDATE SET file_key=excluded.file_key, size=excluded.size, mtime=excluded.mtime,
                       cloud_only=excluded.cloud_only, status='present', last_seen=excluded.last_seen""",
                (path, file_key, folder, name, size, mtime, int(cloud_only), stamp, stamp))

    def mark_missing(self, stamp):
        """Anything this scan didn't see is marked, never removed, so a file that comes back picks up where it was."""
        with self.conn:
            self.conn.execute("UPDATE sources SET status='missing_at_source' WHERE last_seen < ?", (stamp,))
            self.conn.execute("""UPDATE files SET status = CASE WHEN EXISTS (SELECT 1 FROM sources s
                                     WHERE s.file_key = files.file_key AND s.status = 'present')
                                 THEN 'present' ELSE 'missing_at_source' END""")

    def snapshot(self):
        """All of mine, as plain rows, for comparing before and after a rebuild."""
        out = {}
        for table in MINE_TABLES:
            out[table] = [tuple(r) for r in self.conn.execute(f"SELECT * FROM {table} ORDER BY 1, 2")]
        return out
