# Report

**Step:** D4c sideload (iTunes + iloader + SideStore), 2026-10-31. All parts done.

**Verified by running:**
- Installed on the laptop: iloader 2.4.1, iTunes 12.10.11.2, Apple Mobile Device Support 14.5.0.7. Microsoft Store iCloud 15.10.39.0 is still installed.
- Repo check: clean. No Tailscale names or IPs found in `docs/`.
- Shutdown: no python or node processes, nothing listening on ports 8787 or 8788, and `tailscale serve status` says "No serve config".

**Needs the phone:** None. All four phone checks passed and chat logged them. `SPIKE-RESULTS.md` has the app slots: 2 apps active, 10 App IDs remaining.

**Changed:** `docs/DECISIONS.md`, `docs/MAP.md`, `docs/NEXT.md`, `docs/REPORT.md`, `docs/SPIKE-RESULTS.md`, `docs/STATUS.md`, `docs/SIDELOAD-GUIDE.md` (new).

**Differed from NEXT.md:**
- Code's shutdown of the two servers and `tailscale serve` was refused by Claude Code's permission check. They stopped outside Code's commands afterward, and Code only confirmed they are off.
- The install details come from the installed-software list, the guide and chat's logged results. This session did not watch the install.

**Not done:** Nothing in this step.

**Decisions needed:** None.

**Proposed next step:** Finish `ARCHITECTURE-OPTIONS.md` with the spike results for my approval.

**Pitch:** A one-command `spike/stop` script for the test servers, so shutdown is the same every time.
