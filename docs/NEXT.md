# NEXT: Duplicate-names report
Written by chat, 2026-10-31.
Log: Storage shape C and tags-on-song decided (mine). Audio filing waits for this report; I'll sort any same-name files myself (mine). Phase 1 reordered: stream and sort mine / not mine before anything is stored on the phone, ROADMAP 1.19-1.22 (mine). Sorting verdicts and quick tags save straight to the laptop; how sorting works comes as options later (chat-default). (logged by chat)
Queue after this: I pick audio filing from the report at `Review.`, then ROADMAP 1.1 is built (library folder + database), then 1.2 scanner. 1.1 is first on the roadmap but needs this report first.
Read: `ROADMAP.md` (Phase 1), `DECISIONS.md` (Scan scope, Locked folders, Audio filing rows), `MAP.md` (scan folders), `SPIKE-RESULTS.md` (D1 only; reuse its inventory if it is current).

## Parts
a. **Names listing.** A reusable script in `spike/` that lists every audio file in the scan scope (iCloud `Music`, `Session Music`, `tape`, loose files in the iCloud root; not `Downloads\CHE`) by name and size only. It must not open files or download cloud-only ones. Folders are passed as command-line arguments, never written in the script. Output goes to `spike/output/` (gitignored).
b. **Plain report for me.** Groups of files whose names match, ignoring capital letters and file ending. Per file: folder, size, modified date. Order: (1) same name, different size (likely different audio); (2) same name and size (likely one file copied); (3) same name, different ending (a bounce and its compressed copy). Then a list of names that are only a date, with their folders. Counts at the top. Don't fix, rename or move anything; I go through it myself.
c. Repo check. Update STATUS. No database, no library folders, no app code.

**Stop line:** if a runs long, finish groups (1) and (2); the rest waits.

## Phone check
None. My check: read the report on the laptop, then tell chat at `Review.` whether filing keeps my names (D) or uses fingerprint folders (C).
