# Board: Batch 4c, select mode (2026-11-04)
One round, flow and logic seats, advisory. What Code took, and what it left.

## Flow seat
- Took: tick circle on each row; tap only ticks, never plays; "Main ·" on the first held row; Group disabled under 2 ticks;
  Group the big button; any action leaves select mode; Back becomes Cancel; filter stays usable, ticks survive it;
  hold ~0.4 s; from the player: scroll to the song and clear the filter.
- Left: Undo putting the ticks back (Undo takes the action back, ticks stay gone); light buzz on hold (parked pitch).
- Owner questions it raised: Not mine on a ticked family (see below); sorted rows tickable (yes, as default).

## Logic seat
- Took: whole families move, never one version peeled out; one family edit computed in one pass from the current state;
  bulk Mine skips songs already Mine and family rows; bulk Not mine skips family rows and says so; nothing to do = no
  outbox entry, no Undo; Undo = family back first, then each Mine taken back.
- Differed: seat said the lead is always the first held row's Main. Code kept the brief's wording: a ticked family keeps
  its Main when a plain song was held first (check 3: "it joins that group"); two families: the first held one leads.
- Left: one combined outbox entry the laptop applies at once (would need a server change); the separate entries keep
  order, and a refused family change leaves the songs Mine but ungrouped. Pitch for later.
