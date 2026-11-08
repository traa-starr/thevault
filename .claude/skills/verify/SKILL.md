---
name: verify
description: Run every laptop check in one go (server tests, doctor test, playOrder and compareEngine tests, typecheck, music guard test, check_repo) and print one PASS/FAIL per item. Read-only. Use when I type /verify or a NEXT asks for it.
---

# /verify

Run `python .claude/scripts/verify.py` from the repo root. Show me its PASS/FAIL lines and the total, nothing else.
On a FAIL, say in one line which check and why. Don't fix anything unless the current NEXT asks.
