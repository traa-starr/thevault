// One world (ROADMAP O.6): what a song offers, as plain rules so they can be tested without a phone.
// Test: node --experimental-strip-types app/songActions.test.mjs. Spec: docs/overhaul/WORLD-MAP.md.
// Hold a song anywhere, or tap the player's "...": the same song sheet, its rows from songActions().

export type SongAction =
  | 'favorite' | 'unfavorite' | 'mine' | 'not_mine' | 'versions' | 'compare' | 'add_version' | 'archive' | 'unarchive' | 'queue' | 'select';
/** Where the sheet was opened from. */
export type SheetFrom = 'player' | 'library' | 'home' | 'search' | 'cards';
export type SongContext = {
  /** null: not sorted yet. */
  rating: 'mine' | 'not_mine' | null;
  favorite: boolean;
  archived: boolean;
  /** 1: a song on its own; 2 or more: it has versions. */
  familySize: number;
  /** Compare has the sound (player only). */
  comparing: boolean;
  /** A tagging session plays (player only). */
  inSession: boolean;
  from: SheetFrom;
  /** The player's eye: open shows Mine / Not mine on the face (owner, 2026-11-13). Left out: open. */
  eyeOpen?: boolean;
};

/** The sheet's rows, top to bottom. The order never changes; a row says what a tap will do. */
export function songActions(c: SongContext): SongAction[] {
  const fav: SongAction = c.favorite ? 'unfavorite' : 'favorite';
  if (c.comparing) return [fav]; // Compare acts on the version heard: Favorite only
  const rows: SongAction[] = [fav];
  if (c.rating !== 'mine') rows.push('mine');
  if (c.rating !== 'not_mine') rows.push('not_mine');
  if (c.familySize > 1) {
    rows.push('versions');
    if (!c.inSession) rows.push('compare'); // the session owns the order
  } else rows.push('add_version');
  rows.push(c.archived ? 'unarchive' : 'archive');
  if (c.from === 'player' && !c.inSession) rows.push('queue');
  if (c.from === 'library' || c.from === 'home') rows.push('select');
  return rows;
}

const LABELS: Record<SongAction, string> = {
  favorite: 'Favorite', unfavorite: 'Unfavorite', mine: 'Mine', not_mine: 'Not mine', versions: 'Versions', compare: 'Compare',
  add_version: 'Add as a version of…', archive: 'Archive', unarchive: 'Unarchive', queue: 'Queue', select: 'Select',
};
/** The plain words on a row; Versions carries its count. */
export const actionLabel = (a: SongAction, c: Pick<SongContext, 'familySize'>) => (a === 'versions' ? `Versions (${c.familySize})` : LABELS[a]);

export type PlayerSlot = 'favorite' | 'tag' | 'lines' | 'more' | 'next';
/** What the player shows on its face: Mine / Not mine as the eye says (never while comparing), Compare with 2 or more
 * versions, and the four slots of the action row (a session's last slot is Next song). */
export const playerFace = (c: SongContext) => ({
  verdicts: (c.eyeOpen ?? true) && !c.comparing,
  compare: c.familySize >= 2,
  slots: ['favorite', 'tag', 'lines', c.inSession ? 'next' : 'more'] as PlayerSlot[],
});

/** A hold opens the sheet after 0.4 s, only if the finger moved no more than 8 px: a scroll never opens it. */
export const HOLD_MS = 400;
export const HOLD_SLOP = 8;
export const holdFires = (heldMs: number, movedPx: number) => heldMs >= HOLD_MS && movedPx <= HOLD_SLOP;

/** Home's "..." (top right), Library's "..." (header), the pools a hold on Shuffle offers, a hold on a Sort set. */
export const HOME_MENU = ['sort', 'tag_songs', 'settings'] as const;
export const LIBRARY_MENU = ['shuffle', 'order', 'select'] as const;
export const SHUFFLE_POOLS = ['mine', 'favorites', 'unsorted'] as const;
export const SET_ACTIONS = ['all_mine', 'all_not_mine'] as const;
