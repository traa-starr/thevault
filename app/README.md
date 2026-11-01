# app/

The iPhone app: Expo (React Native + TypeScript). Songs are stored on the phone and the laptop syncs them (DECISIONS, G2).

So far (ROADMAP 1.12): one screen with the title and the laptop's song count, or "Laptop not reachable".

The laptop's address is typed on the phone and saved there, never in this repo. Use the name `serve` prints. Plain web addresses are allowed for Tailscale names only (`ios.infoPlist` in `app.json`), so a bare number address may not connect.

Check: `npm run typecheck`. Build: GitHub > Actions > Build iOS (unsigned) > Run workflow. It builds this folder and gives `TheVault.ipa`.

No audio, cover art, credentials or signing files here (CLAUDE.md rule 2).
