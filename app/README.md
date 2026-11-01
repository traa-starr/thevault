# app/

The iPhone app: Expo (React Native + TypeScript). Songs are stored on the phone and the laptop syncs them (DECISIONS, G2).

So far: a home screen with the title and the laptop's song count, or "Laptop not reachable" (ROADMAP 1.12), a real player that streams from the laptop (ROADMAP 1.20, `Player.tsx`), the song list from the laptop with sort and title filter (ROADMAP 1.14, `Library.tsx`), Mine and Not mine buttons in the player with Undo, and an outbox on the phone that holds those choices until the laptop confirms them (`outbox.ts`).

The laptop's address is typed on the phone and saved there, never in this repo. Use the name `serve` prints. Plain web addresses are allowed for Tailscale names only (`ios.infoPlist` in `app.json`), so a bare number address may not connect.

Check: `npm run typecheck`, and `node --experimental-strip-types app/playOrder.test.mjs` from the repo root. Build: GitHub > Actions > Build iOS (unsigned) > Run workflow. It builds this folder and gives `TheVault.ipa`.

No audio, cover art, credentials or signing files here (CLAUDE.md rule 2).
