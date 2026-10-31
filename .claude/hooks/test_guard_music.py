"""Feeds the guard fake tool calls. Nothing here runs the commands themselves.

Run: python .claude/hooks/test_guard_music.py
"""
import json
import os
import subprocess
import sys

HOOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guard_music.py")
D = r"E:\vault-dummy-protected"
ICLOUD = r"C:\Users\illus\iCloudDrive\Music"
FL = r"C:\Users\illus\Documents\Image-Line\FL Studio\Projects"
REPO = r"E:\dev\thevault"


def bash(c, cwd=REPO):
    return {"tool_name": "Bash", "tool_input": {"command": c}, "cwd": cwd}


def ps(c, cwd=REPO):
    return {"tool_name": "PowerShell", "tool_input": {"command": c}, "cwd": cwd}


def file_tool(tool, p):
    return {"tool_name": tool, "tool_input": {"file_path": p}, "cwd": REPO}


BLOCK = [
    bash("rm -rf /e/vault-dummy-protected"),
    bash(f'rm "{D}\\canary.txt"'),
    bash('mv "/c/Users/illus/iCloudDrive/Music/a.mp3" /e/x.mp3'),
    bash('echo hi > "/e/vault-dummy-protected/canary.txt"'),
    bash("echo hi >> ~/iCloudDrive/Music/a.txt"),
    bash("cd ~/iCloudDrive && rm a.mp3"),
    bash("sed -i s/a/b/ /e/vault-dummy-protected/canary.txt"),
    bash("rm canary.txt", cwd=D),
    bash("echo hi > canary.txt", cwd=D),
    ps(f'Remove-Item "{D}\\canary.txt"'),
    ps(f'Rename-Item "{ICLOUD}\\a.mp3" b.mp3'),
    ps(f'Move-Item "{FL}\\x.flp" E:\\x.flp'),
    ps(f'Set-Content "{D}\\canary.txt" hi'),
    ps(f'"hi" | Out-File "{D}\\canary.txt"'),
    ps('Remove-Item "$env:USERPROFILE\\iCloudDrive\\Music\\a.mp3"'),
    ps(f"robocopy E:\\x \"{D}\""),
    ps(f"$p='{D}'; ri $p -Recurse"),
    ps("powershell -EncodedCommand ZQBjAGgAbwA="),
    bash(f"""python -c "open(r'{D}\\canary.txt','w').write('x')" """),
    bash(f"""python -c "import os; os.remove(r'{D}\\canary.txt')" """),
    file_tool("Edit", f"{D}\\canary.txt"),
    file_tool("Write", "/e/vault-dummy-protected/new.txt"),
    file_tool("Write", f"{ICLOUD}\\new.txt"),
    file_tool("Edit", f"{FL}\\sub\\x.txt"),
    {"tool_name": "NotebookEdit", "tool_input": {"notebook_path": f"{D}\\n.ipynb"}, "cwd": REPO},
    {"tool_name": "Bash", "tool_input": {}},  # malformed: must fail closed
]
ALLOW = [
    bash("git status"),
    bash("ls /e/vault-dummy-protected"),
    bash('ffprobe "/c/Users/illus/iCloudDrive/Music/a.mp3"'),
    bash("rm spike/output/old.txt"),
    bash("echo hi > spike/output/a.txt"),
    ps(f'Get-ChildItem "{D}"'),
    ps(f'Get-Content "{D}\\canary.txt"'),
    ps(f'Get-ChildItem "{ICLOUD}" 2>$null'),
    ps(f'Get-ChildItem "{ICLOUD}" > spike\\output\\list.txt'),
    bash(f"""python -c "print(open(r'{D}\\canary.txt','rb').read())" """),
    file_tool("Edit", r"E:\dev\thevault\docs\MAP.md"),
    file_tool("Write", r"E:\dev\thevault\docs\icloud-notes.md"),
]


def run(case):
    p = subprocess.run([sys.executable, HOOK], input=json.dumps(case), text=True, capture_output=True)
    return p.returncode


def main():
    bad = 0
    for want, cases in ((2, BLOCK), (0, ALLOW)):
        for case in cases:
            got = run(case)
            if got != want:
                bad += 1
                print(f"FAIL want={want} got={got}: {json.dumps(case['tool_input'])}")
    if run({"nonsense": True}) != 2:
        bad += 1
        print("FAIL: nonsense input was not blocked")
    print(f"{len(BLOCK) + len(ALLOW) + 1 - bad}/{len(BLOCK) + len(ALLOW) + 1} passed")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
