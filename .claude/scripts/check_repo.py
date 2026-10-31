"""Pre-commit safety check for the public repo. Read-only.

Looks at every file git would commit (tracked + untracked, minus .gitignore):
- blocks forbidden file types (audio, projects, art, signing, database, credentials)
- blocks Tailscale hostnames and IPs in text
- warns when STATUS or REPORT outgrow their limit
Exit 1 if anything is blocked. Run: python .claude/scripts/check_repo.py
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BAD_TYPES = {
    ".wav", ".mp3", ".m4a", ".flac", ".aif", ".aiff", ".ogg", ".opus", ".aac", ".wma",
    ".flp", ".zip", ".rar", ".7z", ".rpp", ".als",
    ".jpg", ".jpeg", ".webp", ".heic", ".gif", ".tif", ".tiff", ".bmp",
    ".db", ".sqlite", ".sqlite3",
    ".ipa", ".p12", ".pfx", ".cer", ".crt", ".mobileprovision", ".provisionprofile",
    ".pem", ".key", ".env",
}
ALLOWED_PNG_DIR = "spike/vault-spike/assets/"
# Tailscale addresses: 100.64.0.0 to 100.127.255.255, and *.ts.net names.
TAILSCALE = re.compile(r"\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b|\b[\w-]+\.[\w-]+\.ts\.net\b", re.I)
LIMITS = {"docs/STATUS.md": 40, "docs/REPORT.md": 40}


def commit_candidates():
    out = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT, capture_output=True, check=True,
    ).stdout
    return [p.decode("utf-8") for p in out.split(b"\0") if p]


def main():
    blocked, warned = [], []
    for name in commit_candidates():
        path = ROOT / name
        suffix = path.suffix.lower()
        if suffix in BAD_TYPES or (suffix == ".png" and not name.startswith(ALLOWED_PNG_DIR)):
            blocked.append(f"{name}: file type not allowed in the public repo")
            continue
        if not path.is_file() or name.endswith("check_repo.py"):
            continue
        with open(path, "rb") as f:
            text = f.read().decode("utf-8", errors="ignore")
        hit = TAILSCALE.search(text)
        if hit:
            blocked.append(f"{name}: looks like a Tailscale address")
        limit = LIMITS.get(name)
        if limit and len(text.splitlines()) > limit:
            warned.append(f"{name}: over {limit} lines, trim it")

    for line in warned:
        print("WARN ", line)
    for line in blocked:
        print("BLOCK", line)
    print("Repo check:", "FAILED, do not commit" if blocked else "clean")
    return 1 if blocked else 0


if __name__ == "__main__":
    sys.exit(main())
