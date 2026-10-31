# NEXT: D4c sideload (iTunes + iloader + SideStore)
Written by chat, 2026-10-31.
Log: Build run reviewed and accepted, bb0e498 .ipa is current (chat). Full Xcode log always saved as an artifact on failure, not just first build: queued, fast-lane (chat-default). (logged by chat)
Queue after this: finish `ARCHITECTURE-OPTIONS.md` with spike results for my approval; then the Xcode-log workflow tweak (fast-lane OK: on a failed build, upload the full Xcode log as a run artifact; no other workflow changes).
Read: DECISIONS row "Sideload route to try"; `SPIKE-RESULTS.md` D4; the build workflow.

## Parts
a. Prep: get the `.ipa` onto the laptop (download the artifact, or re-run the workflow if it's gone). Write me a short, numbered install guide for iTunes (Apple's own installer, NOT the Microsoft Store one, and do not touch my Microsoft Store iCloud), iloader, then SideStore, checked against their current official pages. Say which steps need my Apple ID typed by me. Never handle my password.
b. Walk me through it live: I do each step, you check the result. Then install the Vault `.ipa` through SideStore. Start the spike server and `tailscale serve` for the test, and shut both down after. If the route needs iCloud removed or changed, STOP and ask me (logged rule).
c. Log results in `SPIKE-RESULTS.md` as D4c (no Tailscale names, IPs or Apple ID). Note the 7-day re-sign limit and how many app slots are used. Update REPORT and STATUS. Repo check.

**Stop line:** if setup eats the session, part b's install + phone check becomes the head of the next NEXT.

## Phone check
1. Open the Vault app from the home screen (not Expo Go). Passing: the song list loads and a song plays.
2. Lock the phone while it plays. Passing: audio keeps going and lock-screen controls show.
3. Switch to another app for a minute. Passing: audio keeps going.
4. In SideStore, tap Refresh on the Vault app. Passing: it refreshes without error and the app still opens (tags are in memory only, so data surviving a re-sign stays an open question for the real app).
