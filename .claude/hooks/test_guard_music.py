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
    # hidden content still blocks, with or without a visible write
    ps("pwsh -enc ZQBjAGgAbwA="),
    ps("powershell -e ZQBjAGgAbwA="),
    ps("powershell.exe -ec ZQBjAGgAbwA="),
    ps("powershell -NoProfile -EncodedCommand ZQBjAGgAbwA="),
    ps("$s | iex"),
    ps("Invoke-Expression $s"),
    bash('eval "$cmd"'),
    bash("echo cm0gLXJmIC8= | base64 -d | sh"),
    ps("[Convert]::FromBase64String($s)"),
    # a -e flag (grep -E, sed -e, perl -e, node -e) passes only with no write and no output into a file
    bash("grep -E 'a|b' notes.txt > out.txt"),
    bash("grep -E 'a|b' notes.txt >> out.txt"),
    bash("grep -E 'a|b' notes.txt | tee out.txt"),
    bash("sed -e s/a/b/ -i notes.txt"),
    bash("perl -e 'unlink glob q(~/iCloudDrive/Music/*)'"),
    bash("""node -e "require('fs').unlinkSync('a')" """),
    ps("Select-String -Pattern a -e x | Out-File out.txt"),
    # fresh-eyes catch 1: an inline script's -e can write in ways no pattern sees, so only read-only tools' -e passes
    bash("perl -pi -e 's/a/b/' ~/iCloudDrive/Music/a.txt"),
    bash("""ruby -e 'File.write("/c/Users/illus/iCloudDrive/a.txt","a")'"""),
    bash("""node -e "require('fs').createWriteStream('/c/Users/illus/iCloudDrive/a').end('a')" """),
    bash("""node -e "require('fs').openSync('/c/Users/illus/Desktop/Vault Renders/x','w')" """),
    bash("sed -n -e 's/a/b/w /c/Users/illus/iCloudDrive/a.txt' notes.txt"),
    bash("sed -e 's/a/b/' notes.txt | head"),  # sed can write with its w command: blocked, as before the fix
    bash("ls | xargs perl -e 'print 1'"),
    bash("""bash -c "perl -pi -e 's/a/b/' ~/iCloudDrive/Music/a.txt" """),
    bash("grep -e 'x' a.txt; perl -e 'print 1'"),
    # unlink is a write verb
    bash("unlink /e/vault-dummy-protected/canary.txt"),
    # the render folder is locked like the music folders
    bash('rm "/c/Users/illus/Desktop/Vault Renders/mix.wav"'),
    bash('mv ~/Desktop/"Vault Renders"/mix.wav /e/x.wav'),
    bash('echo hi > "/c/Users/illus/Desktop/Vault Renders/a.txt"'),
    ps('Remove-Item "C:\\Users\\illus\\Desktop\\Vault Renders\\mix.wav"'),
    ps('Rename-Item "$env:USERPROFILE\\Desktop\\Vault Renders\\mix.wav" b.wav'),
    bash("rm mix.wav", cwd=r"C:\Users\illus\Desktop\Vault Renders"),
    file_tool("Write", r"C:\Users\illus\Desktop\Vault Renders\new.txt"),
    file_tool("Edit", "/c/Users/illus/Desktop/Vault Renders/sub/x.txt"),
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
    # read-only searches piped into a filter (wave 4's "Odd in how we work")
    bash("grep -E 'scan|import' server/vault_cli.py | head -20"),
    bash("grep -nE 'icloud|renders' docs/MAP.md | sort | uniq -c"),
    bash("git log --oneline | grep -E 'wave [0-9]' | wc -l"),
    bash("grep -rE 'def (scan|copy)' server 2>/dev/null | head"),
    bash("ls ~/iCloudDrive/Music | grep -iE 'mix|master' 2>&1 | head -5"),
    bash('echo -e "a\\nb" | sort'),
    bash("grep -E '(a|b)>' notes.txt | head"),  # catch 8: a > inside a quoted pattern isn't output into a file
    bash("/usr/bin/grep -e x notes.txt; rg -e y docs"),
    ps('Get-ChildItem "C:\\Users\\illus\\iCloudDrive" | Select-String -Pattern x -e y 2>$null'),
    # reading the render folder is fine
    bash('ls "/c/Users/illus/Desktop/Vault Renders"'),
    ps('Get-ChildItem "C:\\Users\\illus\\Desktop\\Vault Renders" | Measure-Object'),
    file_tool("Write", r"C:\Users\illus\Desktop\Send to Vault.bat"),
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
