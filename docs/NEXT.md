# NEXT: Server, stream a song by id (ROADMAP 1.8)
Written by chat, 2026-11-01.
Log: Mine step accepted (chat). Likely mine first on the 1.19 sorting card (chat-default). Server basics for 1.8: laptop and Tailscale only, id only, seeking, cloud-only answers "not on laptop yet", read-only (chat-default). (logged by chat)
Queue after this: ROADMAP 1.10 `doctor` (Tailscale, server, guard, library marker, `test_library.py`, music fingerprint before/after a scan, songs with no present place, stops test servers after). fast-lane OK. Then 1.12 real app built and sideloaded.
Read: `ROADMAP.md` (1.8), `DECISIONS.md` ("Server basics for 1.8", Connection, Library location), `server/README.md`.

## Parts
a. **Serve.** A server on the laptop that lists known songs (id, title, mine status, local or cloud-only) and plays one by id, with seeking. Listens on the laptop and its Tailscale address only. Cloud-only song: clear "not on laptop yet", never opens the file. No route writes anything.
b. **Start and stop.** One command starts it and prints the phone address to try (Tailscale name kept out of the repo and REPORT). Ctrl+C stops it cleanly.
c. **Prove it.** Self-test: unknown id refused, a path in place of an id refused, seeking returns the right part, cloud-only refused without opening, nothing written. Real run: a local song plays in a browser on the laptop. Music folders unchanged (fingerprint). Guard test, repo check, then STATUS.
Limits: no phone app code, no downloading cloud-only files, no transcoding (that's 1.7). No song names in the repo or REPORT beyond counts.

**Stop line:** if the session runs long, finish a and its tests; b's printed address waits.

## Phone check
1. Laptop on, server started, phone on Tailscale. Open the printed address in Safari on the phone, tap a song: it plays, and dragging the timeline jumps to that point.
