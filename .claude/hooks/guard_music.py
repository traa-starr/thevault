"""PreToolUse guard: keeps Claude from writing inside the locked music folders.

Exit 2 blocks the tool call. Any error inside this script also blocks (fail closed).
Limit: it reads command text, so it cannot see a path built at runtime or passed
to a script as an argument. Spike/app code must also open music files read-only.
"""
import json
import os
import re
import sys

ROOTS = [
    r"C:\Users\illus\iCloudDrive",
    r"C:\Users\illus\Documents\Image-Line\FL Studio\Projects",
    r"E:\vault-dummy-protected",
]
# Loose on purpose: catches ~, $env:USERPROFILE, short names and wildcard spellings.
FRAGMENTS = ("icloud", "image-line", "vault-dummy-protected")

VERBS = (
    "rm|rmdir|rd|del|erase|mv|move|ren|rename|cp|copy|xcopy|robocopy|touch|mkdir|md|tee|"
    "truncate|dd|ln|mklink|chmod|chown|attrib|icacls|takeown|shred|sdelete|fsutil|"
    "remove-item|ri|move-item|mi|rename-item|rni|copy-item|set-content|sc|add-content|ac|"
    "clear-content|clc|out-file|new-item|ni|set-item|clear-item|set-itemproperty|"
    "new-itemproperty|remove-itemproperty|set-acl|compress-archive|expand-archive"
)
WRITE_PATTERNS = [
    re.compile(rf"(?<![\w./\\$-])(?:{VERBS})(?![\w-])"),
    re.compile(r"\bsed\s+(?:-\w+\s+)*-i"),
    re.compile(r"\bopen\([^)]*,\s*(?:mode\s*=\s*)?['\"][rbt]*[wax+]"),
    re.compile(r"\.open\(\s*(?:mode\s*=\s*)?['\"][rbt]*[wax+]"),
    re.compile(
        r"\.(?:write_text|write_bytes|unlink|rmdir|rename|replace|touch|mkdir)\("
        r"|\b(?:os\.(?:remove|unlink|rename|replace|rmdir|removedirs|makedirs|mkdir|utime|truncate)"
        r"|shutil\.(?:move|rmtree|copy\w*))\("
    ),
    re.compile(r"\[(?:system\.)?io\.(?:file|directory)\]::(?:write|append|delete|move|copy|create|replace)"),
    re.compile(r"\bfs(?:promises)?\.(?:write|append|unlink|rm|rename|copy|mkdir|truncate|cp)"),
]
OPAQUE = re.compile(r"(?:^|\s)-e(?:nc?|ncodedcommand)?\s|frombase64string|\biex\b|invoke-expression|\beval\b|base64\s+(?:-d|--decode)")
SCRIPT = re.compile(r"[\w:./\\~-]+\.(?:py|ps1|sh|bash|js|mjs|cjs|ts|bat|cmd)\b")
SELF_FILES = ("guard_music.py", "test_guard_music.py")  # they name the paths without writing to them


def block(reason):
    print(f"BLOCKED by music guard: {reason}", file=sys.stderr)
    sys.exit(2)


def normalize(text):
    return re.sub(r"/+", "/", text.lower().replace("\\", "/"))


def mentions_locked(norm):
    return any(f in norm for f in FRAGMENTS)


def has_write(norm):
    return any(p.search(norm) for p in WRITE_PATTERNS)


def redirects_into_locked(norm):
    alt = "|".join(re.escape(f) for f in FRAGMENTS)
    return re.search(rf">\s*[^|;&\n]*(?:{alt})", norm) is not None


def to_windows(path):
    m = re.match(r"^[/\\]([a-zA-Z])[/\\](.*)$", path)
    return f"{m.group(1)}:/{m.group(2)}" if m else path


def inside_root(path, cwd):
    full = os.path.expanduser(os.path.expandvars(to_windows(path)))
    if not os.path.isabs(full):
        full = os.path.join(to_windows(cwd or os.getcwd()), full)
    resolved = os.path.normcase(os.path.realpath(full))
    for root in ROOTS:
        r = os.path.normcase(root)
        if resolved == r or resolved.startswith(r + os.sep):
            return True
    return False


def check_command(command, cwd):
    norm = normalize(command)
    if OPAQUE.search(norm) and not re.search(r"\bpython3?\s+-c\b", norm):
        block("command hides its content (encoded/eval), so it can't be checked")
    if redirects_into_locked(norm):
        block("redirects output into a locked folder")
    if mentions_locked(norm) and has_write(norm):
        block("write-type command mentions a locked folder")
    if cwd and inside_root(cwd, None) and (has_write(norm) or ">" in norm):
        block("write-type command while working inside a locked folder")
    for token in SCRIPT.findall(command):
        path = os.path.join(to_windows(cwd or os.getcwd()), to_windows(token))
        if os.path.basename(path) in SELF_FILES or not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8", errors="replace") as f:
            body = normalize(f.read())
        if mentions_locked(body) and has_write(body):
            block(f"script {token} mentions a locked folder and contains write operations")


def main():
    data = json.load(sys.stdin)
    tool = data["tool_name"]
    tool_input = data["tool_input"]
    cwd = data.get("cwd")
    if tool in ("Bash", "PowerShell"):
        check_command(tool_input["command"], cwd)
    elif tool in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
        path = tool_input.get("file_path") or tool_input["notebook_path"]
        if inside_root(path, cwd):
            block(f"{tool} targets a locked folder: {path}")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:
        block(f"guard could not understand this call ({exc!r})")
