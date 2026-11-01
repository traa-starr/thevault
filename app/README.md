# app/

The iPhone app: Expo (React Native + TypeScript). Songs are stored on the phone and the laptop syncs them (DECISIONS, G2).

So far: a home screen with the title and the laptop's song count, or "Laptop not reachable" (ROADMAP 1.12), a prototype player with made-up songs and no sound (ROADMAP 1.13, `Player.tsx`), and the song list from the laptop with sort and title filter (ROADMAP 1.14, `Library.tsx`).

The laptop's address is typed on the phone and saved there, never in this repo. Use the name `serve` prints. Plain web addresses are allowed for Tailscale names only (`ios.infoPlist` in `app.json`), so a bare number address may not connect.

Check: `npm run typecheck`. Build: GitHub > Actions > Build iOS (unsigned) > Run workflow. It builds this folder and gives `TheVault.ipa`.

No audio, cover art, credentials or signing files here (CLAUDE.md rule 2).
