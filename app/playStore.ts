// Play count and last heard per song (overhaul wave 1). The laptop's log is the truth: its counts come with the song
// list; plays the laptop hasn't taken yet are laid on top from the outbox, so a play shows at once and survives a kill
// (the outbox is a file) and a wipe (the outbox is in the phone's backup). Rules: playLog.ts.
import { useSyncExternalStore } from 'react';
import { loadSongList } from './offline';
import { addPlayChange, newId, onOutbox, onSent, pendingNow } from './outbox';
import { listWithTaken, playsFrom, playsWithPending, playTracker, type Played, type PlayLine } from './playLog';
import type { Change } from './playOrder';

type Listed = { id: string; plays?: number | null; last_heard?: string | null };

let base: Map<string, Played> = playsFrom(loadSongList<Listed>()?.songs ?? []);
let shown: { base: Map<string, Played>; mine: string; all: Map<string, Played> } | null = null;
// plays the laptop took lately: a song list that left the laptop before one of them mustn't lose it
let taken: { change: Change; at: number }[] = [];
const TAKEN_KEPT_MS = 120000;
const listeners = new Set<() => void>();

const firstLines = (changes: readonly Change[]) => changes.filter((change) => change.kind === 'play_add' && !change.data.end);

/** Every song's count as the phone shows it. The same Map until a play comes or goes, so nothing redraws for a tag. */
function all(): Map<string, Played> {
  const mine = firstLines(pendingNow()).map((change) => change.id).join();
  if (shown && shown.base === base && shown.mine === mine) return shown.all;
  shown = { base, mine, all: playsWithPending(base, pendingNow(), Date.now()) };
  return shown.all;
}

let last = all();
const changed = () => {
  const now = all();
  if (now === last) return;
  last = now;
  listeners.forEach((listener) => listener());
};
onOutbox(changed);
// what the laptop just took goes into its side at once, so a count never dips before the next song list
onSent((accepted) => {
  const mine = firstLines(accepted);
  if (!mine.length) return;
  const at = Date.now();
  base = playsWithPending(base, mine, at);
  taken = [...taken.filter((one) => at - one.at < TAKEN_KEPT_MS), ...mine.map((change) => ({ change, at }))];
});

/** The song sounding now, followed by the 30 s rule. The player feeds it; a play that counts goes to the outbox. */
export const plays = playTracker({ now: Date.now, newId, emit: (line: PlayLine) => void addPlayChange(line) });

export const playStore = {
  /** A fresh song list from the laptop, asked for at `asked`. */
  setBase(songs: Listed[], asked: number) {
    base = listWithTaken(playsFrom(songs), base, taken.filter((one) => one.at > asked).map((one) => one.change), Date.now());
    changed();
  },
  of: (id: string): Played | null => all().get(id) ?? null,
  all,
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Every song's play count and last heard, live: Home's rows. */
export const usePlays = () => useSyncExternalStore(subscribe, all);
