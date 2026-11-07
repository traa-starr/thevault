"""Nightly backup: the database, the journal and the phone's backup file, copied to a folder on C:, newest 14 kept.

Reads the library and writes only inside the backup folder. The journal is the real record (the database can be rebuilt
from it), so both are copied while the write lock is held: no half-written line, and the pair match.
"""
import re
import shutil
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .library import DB_NAME, JOURNAL_NAME, MARKER_NAME
from .store import LOCK_NAME, write_lock

BACKUP_DIR = Path(r"C:\VaultBackup")
KEEP = 14
STALE_HOURS = 36  # one missed night is a warning
COPY_NAME = re.compile(r"\d{8}-\d{6}")  # the only folder names this ever deletes


def _stamp(when):
    return when.strftime("%Y%m%d-%H%M%S")


def run_backup(root, dest=BACKUP_DIR, keep=KEEP, when=None):
    """(ok, words). Not ok means nothing was copied; the words say why. A missing library is a skip, not a crash."""
    root, dest = Path(root), Path(dest)
    if not (root / MARKER_NAME).is_file():
        return False, f"Skipped: no {MARKER_NAME} in {root}. Is the library drive unplugged? Nothing was copied."
    when = when or datetime.now()
    folder = dest / _stamp(when)
    if folder.exists():
        return False, f"Skipped: {folder} already exists."
    tmp = dest / f"{_stamp(when)}.partial"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    try:
        with write_lock(root / LOCK_NAME):
            src = sqlite3.connect(f"{(root.resolve() / DB_NAME).as_uri()}?mode=ro", uri=True)
            try:
                out = sqlite3.connect(tmp / DB_NAME)
                try:
                    src.backup(out)
                finally:
                    out.close()
            finally:
                src.close()
            shutil.copyfile(root / JOURNAL_NAME, tmp / JOURNAL_NAME)
            if (root / "phone-backup.json").is_file():  # what lives only on the phone, so a reinstall can get it back
                shutil.copyfile(root / "phone-backup.json", tmp / "phone-backup.json")
        tmp.rename(folder)
    except BaseException:
        shutil.rmtree(tmp, ignore_errors=True)
        raise
    removed = prune(dest, keep)
    size = sum(f.stat().st_size for f in folder.iterdir())
    return True, f"Backed up to {folder} ({size / 1e6:.1f} MB). {len(list_copies(dest))} copies kept" + (f", {removed} old removed." if removed else ".")


def list_copies(dest):
    """Finished backup folders, oldest first."""
    dest = Path(dest)
    if not dest.is_dir():
        return []
    return sorted(p for p in dest.iterdir() if p.is_dir() and COPY_NAME.fullmatch(p.name))


def prune(dest, keep=KEEP):
    old = list_copies(dest)[:-keep] if keep > 0 else []
    for p in old:
        shutil.rmtree(p)
    return len(old)


def last_backup_age(dest=BACKUP_DIR, today=None):
    """A timedelta since the newest backup, or None if there isn't one."""
    copies = list_copies(dest)
    if not copies:
        return None
    when = datetime.strptime(copies[-1].name, "%Y%m%d-%H%M%S")
    return (today or datetime.now()) - when


def age_words(age):
    if age is None:
        return "no backup yet"
    hours = age.total_seconds() / 3600
    return f"{hours:.0f} hours old" if hours < 48 else f"{age.days} days old"


def check_backup(dest=BACKUP_DIR, today=None):
    """(level, words) for doctor."""
    age = last_backup_age(dest, today)
    if age is None:
        return "WARN", f"no backup yet in {dest}. Run the backup command, then set up the nightly task."
    if age > timedelta(hours=STALE_HOURS):
        return "WARN", f"newest copy is {age_words(age)} (warns past {STALE_HOURS} hours). Is the nightly task running?"
    return "PASS", f"newest copy is {age_words(age)}."
