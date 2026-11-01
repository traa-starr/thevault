"""The library folder: marker file, layout, short codes.

The library is found by its marker file, never by a drive letter. Only `init_library` ever creates one; every
other path goes through `open_library`, which stops with LibraryMissing and creates nothing if the marker is gone.
"""
import json
import os
import uuid
from pathlib import Path

from .store import Store, now

MARKER_NAME = "VAULT-LIBRARY-MARKER.json"
DB_NAME = "vault.db"
JOURNAL_NAME = "journal.jsonl"
SORTING_NAME = "triage-decisions.json"
FORMAT = 1
MIN_CODE_LEN = 7
REPO_ROOT = Path(__file__).resolve().parents[2]

_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"


class LibraryMissing(Exception):
    """No marker file at the given path. Nothing was created."""


class LibraryRefused(Exception):
    """The folder is not a safe place to start a library."""


def _base36(n):
    digits = []
    while n:
        n, r = divmod(n, 36)
        digits.append(_ALPHABET[r])
    return "".join(reversed(digits)) or "0"


def code_candidates(full_hash):
    """Lowercase letters and digits taken from the hash: 7 long, then longer if asked."""
    text = _base36(int(full_hash, 16))
    for length in range(MIN_CODE_LEN, len(text) + 1):
        yield text[:length]


def init_library(path):
    """Start a new library at `path`. The only function that creates one."""
    root = Path(path).resolve()
    if root == REPO_ROOT or REPO_ROOT in root.parents:
        raise LibraryRefused("The library must not live inside the repo (public: code and docs only).")
    if (root / MARKER_NAME).exists():
        return open_library(root)
    if root.exists() and any(root.iterdir()):
        raise LibraryRefused(f"{root} already has files in it and no marker. Pick an empty folder.")
    root.mkdir(parents=True, exist_ok=True)
    marker = {"app": "thevault", "format": FORMAT, "library_id": str(uuid.uuid4()), "created": now()}
    (root / MARKER_NAME).write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")
    return open_library(root)


def open_library(path):
    root = Path(path)
    if not (root / MARKER_NAME).is_file():
        raise LibraryMissing(f"Library missing: no {MARKER_NAME} in {root}. Nothing was created.")
    for sub in ("audio", "phone"):
        (root / sub).mkdir(exist_ok=True)
    return Library(root.resolve())


class Library:
    def __init__(self, root):
        self.root = root
        self.marker = json.loads((root / MARKER_NAME).read_text(encoding="utf-8"))
        self.store = Store(root / DB_NAME, root / JOURNAL_NAME)

    def close(self):
        self.store.close()

    def assign_code(self, full_hash):
        """The folder code for a file: shortest candidate not already used by a different file."""
        full_hash = full_hash.lower()
        row = self.store.conn.execute("SELECT code FROM files WHERE hash=?", (full_hash,)).fetchone()
        if row and row["code"]:
            return row["code"]
        for cand in code_candidates(full_hash):
            other = self.store.conn.execute("SELECT hash FROM files WHERE code=?", (cand,)).fetchone()
            if other is None or other["hash"] == full_hash:
                return cand
        raise RuntimeError("Ran out of hash digits for a code.")

    def upsert_file(self, orig_name, orig_path, size, mtime, full_hash=None):
        """Record a scanned file (scan results only). Returns (file_key, code); code is None until the hash is known."""
        if full_hash:
            full_hash = full_hash.lower()
            key, code = f"hash:{full_hash}", self.assign_code(full_hash)
        else:
            key, code = f"src:{orig_path}|{size}", None
        self.store.upsert_file(key, orig_name, orig_path, size, mtime, full_hash, code)
        return key, code

    def audio_path(self, code, original_name):
        """`audio/<code>/<real filename>`. Same shape under `phone/` via `phone_path`."""
        return self.root / "audio" / code / _plain_name(original_name)

    def phone_path(self, code, original_name):
        return self.root / "phone" / code / _plain_name(original_name)


def _plain_name(name):
    base = os.path.basename(name.replace("\\", "/"))
    if base in ("", ".", ".."):
        raise ValueError(f"Not a usable file name: {name!r}")
    return base
