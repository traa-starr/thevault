# NEXT: Real app, built and sideloaded (ROADMAP 1.12)
Written by chat, 2026-11-01.
Log: Doctor phone check passed (mine). App name "The Vault" (mine). Bundle ID `io.github.traastarr.thevault` (mine). Vault Spike stays installed until The Vault plays (chat-default). (logged by chat)
Queue after this: ROADMAP 1.13 prototype player screen with fake data (fast-lane OK: tappable player screen, play/pause/seek/next/previous drawn but fed fake songs, no server calls, same build and sideload path).
Read: `ROADMAP.md` (1.12), `DECISIONS.md` (Phone client, Install path, Sideload rows, App name, Bundle ID, Xcode log rows), `.github/workflows/build-ios.yml`, `app/README.md`, `spike/vault-spike` (as reference only).

## Parts
a. **App shell.** Real Expo app (React Native + TypeScript) in `app/`, name "The Vault", bundle ID `io.github.traastarr.thevault`. One screen: the title and a laptop line that reads the server's song count over Tailscale, or says "laptop not reachable". Nothing else; no player yet.
b. **Build.** Point the build workflow at `app/` so it makes an unsigned `.ipa` named for The Vault, standard runner, full Xcode log on failure kept. The spike build keeps working or is cleanly retired from the workflow (say which). Run it once and report pass/fail and size.
c. **Prove and hand over.** Typecheck passes, repo check clean (no `.ipa`, no Tailscale address in the repo: the server address comes from a setting on the phone or an untracked file), guard test, STATUS. REPORT gives me plain sideload steps: download the `.ipa`, install with SideStore, open.
Limits: no player, no downloads, no tags. Don't touch Vault Spike on the phone. Don't change the bundle ID once set.

**Stop line:** if the session runs long, finish a and the workflow change; the run itself can wait for my next `/next`.

## Phone check
1. Install The Vault with SideStore. It opens from the home screen with its name under the icon. With the laptop server running, it shows the song count (1,395). Stop the server, reopen: it says the laptop isn't reachable. Vault Spike still opens.
