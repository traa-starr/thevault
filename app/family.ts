// Versions of a song, as plain data so it can be tested without a phone. A family is songs that point straight at one
// Main; the Main points at itself; a plain song has no entry. Every action gives back the new Main of each song it touches
// and what each was before, which is what the laptop checks and records. Undo is the same change turned round.
// Test: node --experimental-strip-types app/playOrder.test.mjs
export type Families = ReadonlyMap<string, string>;
export type FamilyEdit = { songs: Record<string, string | null>; before: Record<string, string | null> };

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

export const reverse = (edit: FamilyEdit): FamilyEdit => ({ songs: edit.before, before: edit.songs });

const make = (families: Families, songs: Record<string, string | null>): FamilyEdit | null => {
  const before: Record<string, string | null> = {};
  let changes = false;
  for (const [song, main] of Object.entries(songs)) {
    before[song] = families.get(song) ?? null;
    if (before[song] !== main) changes = true;
  }
  return changes ? { songs, before } : null;
};

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

/** `song` becomes its family's Main. */
export function makeMainEdit(families: Families, song: string): FamilyEdit | null {
  if (!isVersion(families, song)) return null;
  const songs: Record<string, string | null> = {};
  membersOf(families, song).forEach((id) => (songs[id] = song));
  return make(families, songs);
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
