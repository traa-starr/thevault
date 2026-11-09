// My rating of each song (2.8): Fire, Shelved, or nothing. The laptop's ratings come with the song list; taps the
// laptop hasn't confirmed yet are laid on top from the outbox, so a tap shows at once and survives a kill (the outbox is
// a file). Shelved is out of anything the app picks for me (shuffle, Next, a session) and in anything I pick myself.
import { useSyncExternalStore } from 'react';
import { loadSongList } from './offline';
import { addRatingChange, onOutbox, onSent, pendingNow, takeBack } from './outbox';
import { ratingAfterTap, ratingsFrom, ratingsWithPending, TAP_BOUNCE_MS, type Change, type Rating } from './playOrder';
import { say } from './tagStore';

type Rated = { id: string; rating?: Rating | null };

// the laptop's ratings as of its last song list (the saved list, until Library asks again)
let base: Map<string, Rating> = ratingsFrom(loadSongList<Rated>()?.songs ?? []);
let shown: { base: Map<string, Rating>; pending: readonly Change[]; mine: string; all: Map<string, Rating> } | null = null;
// ratings the laptop took lately: a song list that left the laptop before one of them mustn't wipe it
let taken: { change: Change; at: number }[] = [];
const TAKEN_KEPT_MS = 120000;
let lastTap = -Infinity;
const listeners = new Set<() => void>();
const ratedListeners = new Set<() => void>();

/** Every rating as the phone shows it. Worked out once per change, so asking about a song is one lookup. */
function all(): Map<string, Rating> {
  const pending = pendingNow();
  if (shown && shown.base === base && shown.pending === pending) return shown.all;
  // the outbox changes on every tag too: the same Map stays unless a rating tap came or went, so Library doesn't redraw
  const mine = pending.filter((change) => change.kind === 'rating_set').map((change) => change.id).join();
  shown = shown && shown.base === base && shown.mine === mine ? { ...shown, pending } : { base, pending, mine, all: ratingsWithPending(base, pending) };
  return shown.all;
}

const changed = () => listeners.forEach((listener) => listener());
onOutbox(changed);
// what the laptop just took goes into its side at once, so nothing blinks before the next song list
onSent((accepted) => {
  const mine = accepted.filter((change) => change.kind === 'rating_set');
  if (!mine.length) return;
  base = ratingsWithPending(base, mine);
  const at = Date.now();
  taken = [...taken.filter((one) => at - one.at < TAKEN_KEPT_MS), ...mine.map((change) => ({ change, at }))];
});

export const ratingStore = {
  /** A fresh song list from the laptop, asked for at `asked`. A rating the laptop took after that is laid back on top
   * (the list was already on its way). What's Shelved changed (a restore, a tap on another device): the player picks
   * what comes next again. */
  setBase(songs: Rated[], asked: number) {
    const shelvedBefore = [...all()].filter(([, value]) => value === 'shelved').map(([id]) => id).sort().join();
    base = ratingsWithPending(ratingsFrom(songs), taken.filter((one) => one.at > asked).map((one) => one.change));
    changed();
    const shelvedNow = [...all()].filter(([, value]) => value === 'shelved').map(([id]) => id).sort().join();
    if (shelvedNow !== shelvedBefore) ratedListeners.forEach((listener) => listener());
  },
  of: (id: string): Rating | null => all().get(id) ?? null,
  isShelved: (id: string) => all().get(id) === 'shelved',

  /** A tap on Fire or Shelve for this song (the one on screen at the tap): on, or off again if it already was. The
   * music never moves. "Shelved · Undo" for 6 s on the reserved line. */
  tap(id: string, title: string, tapped: Rating) {
    // a finger bounce (two touches under 150 ms apart) is one tap: it never turns the rating on and straight off again
    const now = Date.now();
    if (now - lastTap < TAP_BOUNCE_MS) return;
    lastTap = now;
    const before = ratingStore.of(id);
    const value = ratingAfterTap(before, tapped);
    const change = addRatingChange(id, value);
    ratedListeners.forEach((listener) => listener());
    const word = value === 'none' ? (tapped === 'fire' ? 'Not Fire: ' : 'Off the shelf: ') : value === 'fire' ? 'Fire: ' : 'Shelved: ';
    say({
      text: word,
      bold: title,
      undo: () => {
        // still unsent: taken back. Sent: a new line puts the old rating back
        if (!takeBack([change])) addRatingChange(id, before ?? 'none');
        ratedListeners.forEach((listener) => listener());
      },
    });
  },
};

/** Calls back after any rating tap or its Undo, outside React: the player rebuilds what comes next. */
export const onRated = (listener: () => void) => {
  ratedListeners.add(listener);
  return () => {
    ratedListeners.delete(listener);
  };
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Every rating, live: Library's marks and its Fire filter. */
export const useRatings = () => useSyncExternalStore(subscribe, all);
/** One song's rating, live. */
export const useRating = (id: string | null | undefined): Rating | null => useSyncExternalStore(subscribe, () => (id ? all().get(id) ?? null : null));
