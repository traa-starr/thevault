# NEXT: Phone tests D4a, D4b, D5
Written by Code while setting up the workflow, 2026-10-31. Phase 0: spike code only.
Read: `docs/SPIKE-RESULTS.md` sections D4 and D5, the top of `spike/serve.py`. I must have committed and pushed first.
Queue after this: see `docs/STATUS.md`.

## Parts
Guide me one small batch of steps at a time, and wait for my result. Tailscale sign-in is mine. No Tailscale names or IPs
in any committed file, including results.

a. **D4a, Safari.** I install Tailscale on the laptop and phone. Start `spike/serve.py` (I pick one test `.flp`; pass it as an
   argument), then `tailscale serve`. I open it in Safari on home Wi-Fi, then on cellular, and play and seek a song.
b. **D5, Open in FL Studio.** Same page, I tap the button. Passing: the one test project opens on the laptop.
c. **D4b, Expo Go.** Run the spike app from `spike/vault-spike`. I list, play and tag a song from Expo Go.

**Stop line:** if the session runs long, part c heads the next NEXT.

Write each result in `docs/SPIKE-RESULTS.md`. A failure gets a look for a bridge, 2 fixes at most, then a write-up.
Afterwards, shut down the server and turn off `tailscale serve`.

## Phone check
1. Safari on Wi-Fi: the list loads, a song plays, seeking works.
2. Safari on cellular, Wi-Fi off: the same.
3. Tap the FL button: the project opens on the laptop.
4. Expo Go: the list loads, a song plays, a tag saves and is still there after reopening.
