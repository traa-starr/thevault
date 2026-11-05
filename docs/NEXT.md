# NEXT: Batch 5, Import and copies (+ version fixes)
Written by chat, 2026-11-04.
Log: Batch 4c phone: checks 0-5 all passed (mine). Group Main = newest version by date (mine); Make main by hand wins and stays (chat-default). Library filter row gains Unsorted and Grouped (mine). Mine + group sent as one all-or-nothing laptop change: Code's pitch, folded in (chat-default). Version compare waits for my pick: Batch 4d after this (chat-default) (logged by chat)
Queue after this: Batch 4d "Compare versions" (A-B switch, dial picker; see BATCH-PLAN). Then Batch 6 "Offline and finish".
Read: this file, `BATCH-PLAN.md` Batch 5, ROADMAP 1.7 and 1.22, DECISIONS rows from "Batch 4b build" down, `MAP.md`. Code of `versionStore.ts`, `family.ts`, `Library.tsx`, server files as needed.
Session: Opus, medium effort. No board pass (no new screens).
## Parts
0. **Version fixes (phone).** (1) A group's Main is its newest version, by the same date Library's Newest sort uses: when grouping, when a song joins a group, when groups merge. Once I tap Make main, that group keeps my pick until I change it. Existing groups: recompute only those never picked by hand; REPORT says how many changed. First check whether a song's date can be a copy date or the iCloud pull date (2026-11-01) instead of when I made it; if so, use the best real date and say in REPORT which date wins. (2) Library filter row gains **Unsorted** and **Grouped**. (3) Mine + group reach the laptop as one change, all or nothing.
a. **Import (ROADMAP 1.22).** Rerunnable laptop command copies every Mine song into the library's own audio folder (`E:\VaultLibrary`, never the repo, never my music folders), checked by fingerprint. Not mine and unsorted songs stay out. Originals only read. The server prefers the library copy. Put the exact command in REPORT; chat adds it to COMMANDS.md.
b. **Phone copies (ROADMAP 1.7).** AAC about 192 kbps for every imported song; files already compressed at or under that are copied as is. Wav-only songs (like `ANY WAY new limit.wav`) get rendered. Size report: song count, total MB, biggest files.
c. **Laptop answers** `/kept` (the list) and `/songs/{id}/copy` (the phone copy).
**Stop line:** 0 and a always go in. `/kept` waits if long; b's copies still get made.
## Phone check
1. Library: group 2 songs with different dates, no Make main. Pass: Main is the newer one. Then Make main on the older one and add a third song. Pass: my pick stays Main.
2. Library filter row: tap Unsorted, then Grouped. Pass: only unsorted songs; then only version groups.
3. Laptop: run the import command from REPORT twice. Pass: the second run copies nothing new; the copy count matches Mine, no Not mine songs.
4. Safari on the phone: open the `/songs/{id}/copy` link from REPORT. Pass: it plays and seeks; sizes match the report.
