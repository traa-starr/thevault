// Versions of a song, as plain data so it can be tested without a phone. A family is songs that point straight at one
// Main; the Main points at itself; a plain song has no entry. Every action gives back the new Main of each song it touches
// and what each was before, which is what the laptop checks and records. Undo is the same change turned round.
// Test: node --experimental-strip-types app/playOrder.test.mjs
export type Families = ReadonlyMap<string, string>;
/** Mains I picked by hand with Make main. Any other family's Main is its newest version. */
export type Picks = ReadonlySet<string>;
export type FamilyEdit = {
  songs: Record<string, string | null>;
  before: Record<string, string | null>;
  picked?: Record<string, boolean>;
  pickedBefore?: Record<string, boolean>;
};
/** A song's date as Library's Newest sort reads it ('2025-03-10', or a bare year), or null. */
export type DateOf = (id: string) => string | null | undefined;

export const mainOf = (families: Families, id: string) => families.get(id) ?? id;
export const isVersion = (families: Families, id: string) => mainOf(families, id) !== id;

/** The family's songs, Main first. A plain song is a family of one. */
export function membersOf(families: Families, id: string): string[] {
  const main = mainOf(families, id);
  const others: string[] = [];
  families.forEach((m, song) => {
    if (m === main && song !== main) others.push(song);
  });
  return [main, ...others];
}

export function applyEdit(families: Families, edit: { songs: Record<string, string | null> }): Map<string, string> {
  const out = new Map(families);
  for (const [song, main] of Object.entries(edit.songs)) {
    if (main === null) out.delete(song);
    else out.set(song, main);
  }
  return out;
}

export function applyPicks(picks: Picks, edit: { picked?: Record<string, boolean> }): Set<string> {
  const out = new Set(picks);
  for (const [id, on] of Object.entries(edit.picked ?? {})) {
    if (on) out.add(id);
    else out.delete(id);
  }
  return out;
}

export const reverse = (edit: FamilyEdit): FamilyEdit => ({
  songs: edit.before,
  before: edit.songs,
  ...(edit.picked ? { picked: edit.pickedBefore ?? {}, pickedBefore: edit.picked } : {}),
});

/** The newest of these songs by date, the way Newest sorts them (no date last). A tie keeps `prefer`, else the first. */
export function newestOf(ids: string[], dateOf: DateOf, prefer?: string): string {
  const key = (id: string) => dateOf(id) ?? '';
  const best = ids.reduce((a, b) => (key(b) > key(a) ? b : a), ids[0]);
  return prefer && ids.includes(prefer) && key(prefer) === key(best) ? prefer : best;
}

/** Turns an action's edit into the one that goes out: every family it touches gets its Main by the rule (my hand pick if
 * the family has one, else its newest version), and picks that are no longer a Main are dropped. `pick`: Make main. */
export function settle(families: Families, picks: Picks, edit: FamilyEdit | null, dateOf: DateOf, pick?: string): FamilyEdit | null {
  if (!edit) return null;
  const after = applyEdit(families, edit);
  const picksAfter = new Set(picks);
  if (pick) picksAfter.add(pick);
  const songs: Record<string, string | null> = { ...edit.songs };
  for (const m of new Set(Object.values(edit.songs).filter((one): one is string => one !== null))) {
    const members = membersOf(after, m);
    const hand = members.filter((id) => picksAfter.has(id));
    const main = hand.includes(m) ? m : hand[0] ?? newestOf(members, dateOf, m);
    members.forEach((id) => (songs[id] = main));
  }
  // a pick only lasts on a song that is a Main afterwards: two picked families merged keep one pick
  const final = applyEdit(families, { songs });
  const picked: Record<string, boolean> = {};
  const pickedBefore: Record<string, boolean> = {};
  for (const id of Object.keys(songs)) {
    const now = picksAfter.has(id) && final.get(id) === id;
    if (now !== picks.has(id)) {
      picked[id] = now;
      pickedBefore[id] = picks.has(id);
    }
  }
  return make(families, songs, picked, pickedBefore);
}

function make(
  families: Families,
  songs: Record<string, string | null>,
  picked: Record<string, boolean> = {},
  pickedBefore: Record<string, boolean> = {},
): FamilyEdit | null {
  const before: Record<string, string | null> = {};
  let changes = Object.keys(picked).length > 0;
  for (const [song, main] of Object.entries(songs)) {
    before[song] = families.get(song) ?? null;
    if (before[song] !== main) changes = true;
  }
  if (!changes) return null;
  return Object.keys(picked).length ? { songs, before, picked, pickedBefore } : { songs, before };
}

/** What's left of a family once `leaving` go: a lone song left behind becomes plain. */
function leave(families: Families, main: string, leaving: Set<string>, songs: Record<string, string | null>) {
  const stay = membersOf(families, main).filter((id) => !leaving.has(id));
  if (stay.length === 1 && families.has(stay[0])) songs[stay[0]] = null;
}

/** `song` becomes another version of `target`. A Main brings its versions along. A string is a refusal, in plain words. */
export function linkEdit(families: Families, song: string, target: string): FamilyEdit | string | null {
  if (song === target) return "That's the same song.";
  const main = mainOf(families, target);
  if (mainOf(families, song) === main) return null; // already together
  const songs: Record<string, string | null> = { [main]: main };
  const moving = mainOf(families, song) === song ? membersOf(families, song) : [song];
  moving.forEach((id) => (songs[id] = main));
  if (moving.length === 1 && isVersion(families, song)) leave(families, mainOf(families, song), new Set(moving), songs);
  return make(families, songs);
}

/** `song` becomes its family's Main. Settle it with `pick` = song, so it stays Main. */
export function makeMainEdit(families: Families, song: string, picks: Picks = new Set()): FamilyEdit | null {
  if (!families.has(song) || (!isVersion(families, song) && picks.has(song))) return null;
  const songs: Record<string, string | null> = {};
  membersOf(families, song).forEach((id) => (songs[id] = song));
  return make(families, songs) ?? { songs, before: { ...songs } }; // already Main by date: the pick is the change
}

/** `song` leaves its family. A Main leaving hands over to `newMain`, or to the next version. */
export function removeEdit(families: Families, song: string, newMain?: string): FamilyEdit | null {
  if (!families.has(song)) return null;
  const members = membersOf(families, song);
  const songs: Record<string, string | null> = { [song]: null };
  if (members[0] === song) {
    const others = members.slice(1);
    const next = newMain && others.includes(newMain) ? newMain : others[0];
    others.forEach((id) => (songs[id] = others.length > 1 ? next : null));
  } else {
    leave(families, members[0], new Set([song]), songs);
  }
  return make(families, songs);
}

/** The Main a group of ticked rows gets: a ticked family keeps its Main (the first held, if it's in one), else the first held. */
export function groupLead(families: Families, ticked: string[]): string | null {
  if (!ticked.length) return null;
  const first = mainOf(families, ticked[0]);
  if (families.has(first)) return first;
  const family = ticked.find((id) => families.has(mainOf(families, id)));
  return family ? mainOf(families, family) : first;
}

/** Every ticked song, with all of its family, becomes a version of one Main, in one edit. Null: already one family. */
export function groupEdit(families: Families, ticked: string[]): FamilyEdit | null {
  const lead = groupLead(families, ticked);
  if (!lead || ticked.length < 2) return null;
  const songs: Record<string, string | null> = { [lead]: lead };
  for (const id of ticked) membersOf(families, id).forEach((one) => (songs[one] = lead));
  if (Object.keys(songs).length < 2) return null;
  return make(families, songs);
}
