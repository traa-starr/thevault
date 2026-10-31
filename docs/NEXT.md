# NEXT: Log D4/D5 results + first build run
Written by chat, 2026-10-31.
Log: D4a, D4b and D5 passed on phone (user). Results logging before the build: chat-default. Doctor script deferred until after D4c: chat-default.
Queue after this: D4c sideload (iTunes + iloader + SideStore, lock screen, background, re-sign); then finish ARCHITECTURE-OPTIONS.md for my approval.
Read: `docs/SPIKE-RESULTS.md` D4 and D5; the build workflow file in `.github/workflows/`.

## Parts
a. Write the D4a, D4b and D5 passes into `SPIKE-RESULTS.md`: Wi-Fi, cellular, FL open, Expo list/play/tag, and tag kept after reopening. No Tailscale names or IPs. Confirm the server and `tailscale serve` are shut down. Update REPORT and STATUS.
b. Get the build workflow ready for its first run on a standard macOS runner, producing an unsigned `.ipa` as an artifact. Check it locally as far as possible. Tell me exactly what to push and how to start it.
c. After I start it, read the run result. If it fails, make at most 2 fixes, then write it up. Run the repo safety check.

**Stop line:** if the session runs long, part c becomes the head of the next NEXT.

## Phone check
1. In the GitHub app or on github.com on the phone, go to Actions. Passing: the build run is green and an `.ipa` artifact is listed.
