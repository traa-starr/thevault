# The Vault: notes for Claude

One place for all my songs from FL Studio and BandLab. The phone is the primary device; the laptop hosts.
Product: `docs/VISION.md`. Choices: `docs/DECISIONS.md`. Current state: `docs/STATUS.md` (read first).
Where things live: `docs/MAP.md`. The one current task: `docs/NEXT.md`. Last session's results: `docs/REPORT.md`.
How we work: `docs/WORKFLOW.md`. Chat manages, Code builds, and I carry one line. Commands: `/next`, `/wrap`, `/review`, `/where`.

**Phase 0: no app code until I approve in DECISIONS.md.** Throwaway code goes in `spike/` only.

## Who I am
Audio engineer and rapper, not a developer. Explain plainly, one line per jargon term. Keep me in the loop on decisions.
Pro plan with caps: short replies, no recaps, read the minimum, no subagents unless asked.

## Hard rules
1. **My music is read-only.** Never rename, move, delete or write inside iCloud Drive or FL Studio Projects. Enforced by
   `.claude/settings.json` and `.claude/hooks/guard_music.py`. Don't weaken them. The app writes only to its own database
   and its own Vault library folder.
2. **Never commit** audio, project files, cover art, credentials, signing files (.ipa, certificates, profiles) or the
   local database. The repo is PUBLIC on purpose: code and docs only. No Tailscale hostnames or IPs in docs.
3. **Hard-to-undo decisions** (stack, database, connection, file layout, where pulled audio lives, BandLab method, build
   pipeline): give 2-3 options including one I didn't think to ask about, say what a senior engineer would pick and why,
   let me choose, log it in DECISIONS.md with date, options, choice, why.
4. **I do git myself** with VS Code buttons. Give me a one-line commit message. Never commit, push or merge.
5. **Tedious but mechanical:** write a reusable script.
6. **Blocked?** Look for a bridge first (deep links, URL schemes, iOS Shortcuts, Siri, local API, browser automation).
7. **BandLab:** no logging in, scraping or downloading until a method is approved in DECISIONS.md. I sign in myself;
   never handle my Google credentials.
8. **Apple ID:** I sign into the sideload tool myself. Never ask for, store or type the password.
9. **GitHub Actions:** standard runners only. Larger runners are billed even on public repos.

## Interview mode
Ask what I can answer faster than you can guess: multiple choice, max 4 per batch, with "other". Record answers right away
(MAP for locations, DECISIONS for choices, VISION for product). Don't re-ask what the docs answer.

## Commands
- Test the music guard: `python .claude/hooks/test_guard_music.py`
- Check the repo is safe to commit: `python .claude/scripts/check_repo.py`
- Spike output stays in `spike/output/` (gitignored, holds song names and paths).

## Gotchas
- Spike scripts take music folders as command-line arguments and never contain those paths. The guard blocks any script
  that names a locked folder and also writes files.
- The guard also blocks a command that mentions a locked folder and a write verb in one line, even when the write is
  elsewhere. Split it into two commands.
- The guard reads command text only, so it can't see a path built at runtime. Open music files read-only (`'rb'`), always.
- Reading a cloud-only iCloud file downloads it. Listing names and sizes doesn't. Check before scanning tags in bulk.
- The folder is `E:\dev\thevault`, not `the-vault`.
- End of session: `/wrap`.
