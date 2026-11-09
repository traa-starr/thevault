// Versions on the phone: the laptop's families plus my changes it may not have yet, the picker, the Versions view and
// their toast. Changes go through the outbox like Mine and Not mine, so a link made with the laptop off waits and sends.
import { useSyncExternalStore } from 'react';
import {
  applyEdit,
  applyPicks,
  groupEdit,
  linkEdit,
  makeMainEdit,
  membersOf,
  removeEdit,
  reverse,
  settle,
  type Families,
  type FamilyEdit,
  type Picks,
} from './family';
import { addChanges, onOutbox, pendingNow, takeBack } from './outbox';
import type { Change } from './playOrder';

export type LibSong = {
  id: string;
  title: string;
  where: string;
  date: string | null;
  mine: string;
  sorted: boolean;
  folder: string;
  main: string | null;
  /** This Main was picked by hand with Make main, so it stays Main. */
  picked?: boolean;
  /** Seconds, measured on the laptop; null: not known yet. An older laptop or saved list has none. */
  length?: number | null;
};
/** What one action sent, so its Undo can take it back or turn it round. */
export type Sent = { changes: Change[]; edit: FamilyEdit; minedIds: string[] };
type Toast = { text: string; undo?: () => void; action?: { label: string; run: () => void } };
type State = {
  songs: LibSong[] | null;
  families: Families;
  picks: Picks;
  picker: { id: string; title: string; folder: string | null; onPick?: (target: string) => void } | null;
  versionsOf: string | null;
  toast: Toast | null;
};

const TOAST_MS = 5000;
const TIMEOUT_MS = 10000;

let state: State = { songs: null, families: new Map(), picks: new Set(), picker: null, versionsOf: null, toast: null };
let base: Families = new Map();
let basePicks: Picks = new Set();
let dates = new Map<string, string | null>();
let askedAt = 0;
let local: { edit: FamilyEdit; at: number; ids: string[] }[] = [];
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const update = (changes: Partial<State>) => {
  state = { ...state, ...changes };
  listeners.forEach((listener) => listener());
};

/** The laptop's families, then my changes it may not have: newer than its answer, or still waiting to send. */
function recompute() {
  const waiting = new Set(pendingNow().map((change) => change.id));
  local = local.filter((one) => one.at > askedAt || one.ids.some((id) => waiting.has(id)));
  let families: Families = base;
  let picks: Picks = basePicks;
  for (const one of local) {
    families = applyEdit(families, one.edit);
    picks = applyPicks(picks, one.edit);
  }
  update({ families, picks });
}
onOutbox(() => recompute());

/** A fresh /songs answer. `asked` is when the question went out: my changes after it stay on top. */
export function setLibrary(songs: LibSong[], asked: number) {
  base = new Map(songs.filter((song) => song.main).map((song) => [song.id, song.main!]));
  basePicks = new Set(songs.filter((song) => song.picked).map((song) => song.id));
  dates = new Map(songs.map((song) => [song.id, song.date]));
  askedAt = asked;
  state = { ...state, songs };
  recompute();
}

/** Fetches /songs if nobody has yet, for the picker opened from the player or Sort. */
export function ensureLibrary(url: string) {
  if (state.songs || loading) return loading ?? Promise.resolve();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  const asked = Date.now();
  loading = fetch(`${url}/songs`, { signal: abort.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Server said ${r.status}`))))
    .then((data: { songs: LibSong[] }) => setLibrary(data.songs, asked))
    .catch(() => {})
    .finally(() => {
      clearTimeout(timer);
      loading = null;
    });
  return loading;
}

export function showToast(toast: Toast | null) {
  clearTimeout(toastTimer);
  update({ toast });
  if (toast) toastTimer = setTimeout(() => update({ toast: null }), TOAST_MS);
}

const dateOf = (id: string) => dates.get(id);
/** The edit as it goes out: each family it touches gets its Main by the rule (my pick, else the newest). */
const settled = (edit: FamilyEdit | null, pick?: string) => settle(state.families, state.picks, edit, dateOf, pick);

function send(edit: FamilyEdit, songId: string, mined: string[] = []): Sent {
  // one change: the laptop marks `mined` Mine and makes the family together, or does neither
  const changes = addChanges([{ kind: 'family_set', songId, edit, mine: mined }]);
  local = [...local, { edit, at: Date.now(), ids: changes.map((change) => change.id) }];
  recompute();
  return { changes, edit, minedIds: mined };
}

/** Takes an action back: unsent, it's simply dropped; sent, the opposite goes out, family first, then the Mine. */
export function undo(sent: Sent) {
  const back = reverse(sent.edit);
  local = [...local, { edit: back, at: Date.now(), ids: [] }];
  if (!takeBack(sent.changes)) {
    const changes = addChanges([
      { kind: 'family_set', songId: sent.changes[sent.changes.length - 1].data.song_id, edit: back, restore: sent.minedIds },
    ]);
    local[local.length - 1].ids = changes.map((change) => change.id);
  }
  recompute();
}

const titleOf = (id: string) => state.songs?.find((song) => song.id === id)?.title ?? 'that song';

/** `songId` becomes another version of `target`. `needsMine`: it isn't Mine yet, so it's marked Mine in the same go.
 * Gives back what was sent, or a refusal in plain words. */
export function link(songId: string, target: string, needsMine: boolean): Sent | string {
  const edit = linkEdit(state.families, songId, target);
  if (typeof edit === 'string') return edit;
  const out = settled(edit);
  if (!out) return 'Already versions of each other.';
  return send(out, songId, needsMine ? [songId] : []);
}

/** Select mode's Group as versions: the ticked rows (first held first) become one family. `mined`: songs not Mine yet,
 * marked Mine in the same go. Null: they already are one family. */
export function group(ticked: string[], mined: string[]): Sent | null {
  const edit = settled(groupEdit(state.families, ticked));
  return edit && send(edit, ticked[0], mined);
}

/** The Main that Group as versions would give these ticked rows, for the select-mode label. */
export function groupMainOf(ticked: string[]): string | null {
  const edit = settled(groupEdit(state.families, ticked));
  return edit ? Object.values(edit.songs).find((main): main is string => !!main) ?? null : null;
}

/** The refusal a link would get, checked before anything is sent. */
export function linkRefusal(songId: string, target: string): string | null {
  const edit = linkEdit(state.families, songId, target);
  if (typeof edit === 'string') return edit;
  return edit ? null : 'Already versions of each other.';
}

export function makeMain(songId: string): Sent | null {
  const edit = settled(makeMainEdit(state.families, songId, state.picks), songId);
  return edit && send(edit, songId);
}

export function remove(songId: string): Sent | null {
  const edit = settled(removeEdit(state.families, songId));
  return edit && send(edit, songId);
}

/** For Not mine: takes the song out first, so the laptop never sees a hidden song in a family. */
export const removeEditFor = (songId: string) => settled(removeEdit(state.families, songId));
export const sendEdit = (edit: FamilyEdit, songId: string) => send(edit, songId);

/** A Mine or Not mine sent alongside a versions change, and its Undo: dropped if unsent, else restored. */
export const sendMine = (songId: string, value: 'mine' | 'not mine') => addChanges([{ kind: 'mine_set', songId, value }]);
export function undoMine(changes: Change[], songId: string) {
  if (!takeBack(changes)) addChanges([{ kind: 'mine_restore', songId }]);
}

export const openPicker = (picker: State['picker']) => update({ picker });
export const closePicker = () => update({ picker: null });
export const openVersions = (id: string | null) => update({ versionsOf: id });

export const members = (id: string) => membersOf(state.families, id);
export const isPicked = (id: string) => state.picks.has(id);
export const isVersion = (id: string) => (state.families.get(id) ?? id) !== id;
export const versionCount = (id: string) => (state.families.has(id) ? membersOf(state.families, id).length : 1);
export const songTitle = titleOf;
export const songInfo = (id: string) => state.songs?.find((song) => song.id === id);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useVersions = () => useSyncExternalStore(subscribe, () => state);
