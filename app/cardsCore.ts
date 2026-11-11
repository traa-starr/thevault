// Sort's cards (overhaul wave 3, C): the swipe rules and what each verdict does, as plain maths a test can run
// (cards.test.mjs). Cards.tsx only draws them. What a swipe or tap saves is the batch 2 behaviour, unchanged:
// right is Mine, left is Not mine, up is Not sure; short of the mark springs back; down never grabs.
import type { SortSong } from './sortData';

export type Choice = 'mine' | 'not mine' | 'not sure';

/** How far the finger must take the card for a verdict (points). Short of it, the card springs back. */
export const SWIPE_PX = 110;
/** A move smaller than this is not a swipe yet (a wobble, or the start of a scroll). */
export const GRAB_PX = 12;
/** The throw drawn after the verdict is saved. */
export const THROW_MS = 250;
export const UNDO_MS = 5000;

/** Whether a move takes the card: sideways or up. Down never grabs. */
export const grabs = (dx: number, dy: number) => Math.abs(dx) > GRAB_PX || dy < -GRAB_PX;

/** The card never goes below where it started: an up drag lifts it (half the finger, with a ceiling, so it never
 * climbs under the header: the verdict still reads the finger's own travel), a down drag leaves it. */
export const LIFT_MAX = 32;
export const liftY = (dy: number) => Math.max(Math.min(dy, 0) / 2, -LIFT_MAX);

/** The verdict a release at this offset means, or none (spring back). Sideways is read first, as built. */
export const verdictAt = (dx: number, dy: number): Choice | null =>
  dx > SWIPE_PX ? 'mine' : dx < -SWIPE_PX ? 'not mine' : dy < -SWIPE_PX && -dy > Math.abs(dx) ? 'not sure' : null;

const share = (v: number) => Math.max(0, Math.min((v - GRAB_PX) / (SWIPE_PX - GRAB_PX), 1));
/** How far each stamp has faded in (0 to 1): they read the drag only, nothing inside the grab zone (so a slightly
 * slanted up drag shows no Mine), full at the mark. */
export const stamps = (dx: number, dy: number) => ({ mine: share(dx), notMine: share(-dx), notSure: share(-dy) });

/** Where a judged card flies to: clear off the screen on the verdict's side. */
export const THROW: Record<Choice, { x: number; y: number }> = { mine: { x: 560, y: -60 }, 'not mine': { x: -560, y: -60 }, 'not sure': { x: 0, y: -960 } };

/** The cards still to show, in the laptop's order: those in scope, in the right pile, not passed over this visit. */
export const queueOf = <Song extends { id: string }>(open: Song[], scope: Set<string> | null, notSure: Set<string>, pile: boolean, passed: Set<string>) =>
  open.filter((one) => (!scope || scope.has(one.id)) && notSure.has(one.id) === pile && !passed.has(one.id));

/** What a verdict saves: Mine and Not mine go to the laptop; Not sure stays on the phone (or, inside the pile, is a pass). */
export const effectsOf = (choice: Choice, pile: boolean) => ({
  judge: choice === 'not sure' ? null : choice,
  pass: choice === 'not sure' && pile,
  unsure: choice === 'not sure' && !pile,
});

/** Undo takes back exactly what the verdict saved. */
export const undoEffects = (choice: Choice, pile: boolean) => ({
  unjudge: choice !== 'not sure',
  unpass: choice === 'not sure' && pile,
  unsure: choice === 'not sure' && !pile,
});

export type Judged = { song: SortSong; choice: Choice };
