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
    r"C:\Users\illus\Desktop\Vault Renders",  # new mixdowns: the Vault only reads them
]
# Loose on purpose: catches ~, $env:USERPROFILE, short names and wildcard spellings.
FRAGMENTS = ("icloud", "image-line", "vault-dummy-protected", "vault renders", "vault_renders", "vault-renders", "vaultrenders")

VERBS = (
    "rm|rmdir|rd|del|unlink|erase|mv|move|ren|rename|cp|copy|xcopy|robocopy|touch|mkdir|md|tee|"
    "truncate|dd|ln|mklink|chmod|chown|attrib|icacls|takeown|shred|sdelete|fsutil|"
    "remove-item|ri|move-item|mi|rename-item|rni|copy-item|set-content|sc|add-content|ac|"
    "clear-content|clc|out-file|new-item|ni|set-item|clear-item|set-itemproperty|"
    "new-itemproperty|remove-itemproperty|set-acl|compress-archive|expand-archive"
)
WRITE_PATTERNS = [
    re.compile(rf"(?<![\w./\\$-])(?:{VERBS})(?![\w-])"),
    re.compile(r"\bsed\b[^|;&\n]*\s-(?:i|-in-place)"),
    re.compile(r"\bopen\([^)]*,\s*(?:mode\s*=\s*)?['\"][rbt]*[wax+]"),
    re.compile(r"\.open\(\s*(?:mode\s*=\s*)?['\"][rbt]*[wax+]"),
    re.compile(
        r"\.(?:write_text|write_bytes|replace|touch)\("
        r"|\.(?:unlink|rmdir|rename|mkdir|writefile|appendfile|copyfile|rm|cp|truncate|symlink|utimes)(?:sync)?\("
        r"|\b(?:os\.(?:remove|unlink|rename|replace|rmdir|removedirs|makedirs|mkdir|utime|truncate)"
        r"|shutil\.(?:move|rmtree|copy\w*))\("
    ),
    re.compile(r"\[(?:system\.)?io\.(?:file|directory)\]::(?:write|append|delete|move|copy|create|replace)"),
    re.compile(r"\bfs(?:promises)?\.(?:write|append|unlink|rm|rename|copy|mkdir|truncate|cp)"),
]
# Hidden content always blocks: an encoded PowerShell command (any short form of -EncodedCommand), eval, base64 decoding.
HIDDEN = re.compile(
    r"\b(?:powershell|pwsh)(?:\.exe)?\b[^|;&\n]*\s-e(?:c|n\w*)?\s"
    r"|frombase64string|\biex\b|invoke-expression|\beval\b|base64\s+(?:-d|--decode)"
)
# A bare -e flag passes only on a read-only tool (grep -E, echo -e) and only with no write command and no output into a
# file. On anything else (sed, perl, ruby, node...) -e can carry code that writes in ways no pattern sees: it blocks.
DASH_E = re.compile(r"(?:^|\s)-e(?:nc?|ncodedcommand)?\s")
READ_ONLY_E = {"grep", "egrep", "fgrep", "rg", "echo", "select-string", "sls", "findstr"}
QUOTED = re.compile(r"'[^']*'|\"[^\"]*\"")
# Output into a file: > or >> that isn't 2>&1, >$null, >/dev/null or >nul (and not => or ->).
INTO_FILE = re.compile(r"(?<![-=])>{1,2}\s*(?!&|\$null\b|/dev/null\b|nul\b)\S")
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


def dash_e_read_only(norm):
    """Every part of the line (between | ; & and new lines) that holds a -e starts with a read-only tool."""
    for part in re.split(r"[|;&\n]", norm):  # quotes kept: bash -c "perl -e ..." must still be seen
        if DASH_E.search(part):
            words = part.split()
            tool = words[0].rsplit("/", 1)[-1] if words else ""
            if tool.removesuffix(".exe") not in READ_ONLY_E:
                return False
    return True


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
    inline_python = re.search(r"\bpython3?\s+-c\b", norm)
    if HIDDEN.search(norm) and not inline_python:
        block("command hides its content (encoded/eval), so it can't be checked")
    if DASH_E.search(norm) and not inline_python:
        if not dash_e_read_only(norm):
            block("a -e flag on a tool that can run code or write, so it can't be checked")
        if has_write(norm) or INTO_FILE.search(QUOTED.sub("q", norm)):
            block("command with a -e flag also writes or sends output into a file")
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
