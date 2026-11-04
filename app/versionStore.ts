// Versions on the phone: the laptop's families plus my changes it may not have yet, the picker, the Versions view and
// their toast. Changes go through the outbox like Mine and Not mine, so a link made with the laptop off waits and sends.
import { useSyncExternalStore } from 'react';
import { applyEdit, linkEdit, makeMainEdit, membersOf, removeEdit, reverse, type Families, type FamilyEdit } from './family';
import { addChanges, onOutbox, pendingNow, takeBack, type NewChange } from './outbox';
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
};
/** What one action sent, so its Undo can take it back or turn it round. */
export type Sent = { changes: Change[]; edit: FamilyEdit; minedId: string | null };
type Toast = { text: string; undo?: () => void; action?: { label: string; run: () => void } };
type State = {
  songs: LibSong[] | null;
  families: Families;
  picker: { id: string; title: string; folder: string | null; onPick?: (target: string) => void } | null;
  versionsOf: string | null;
  toast: Toast | null;
};

const TOAST_MS = 5000;
const TIMEOUT_MS = 10000;

let state: State = { songs: null, families: new Map(), picker: null, versionsOf: null, toast: null };
let base: Families = new Map();
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
  for (const one of local) families = applyEdit(families, one.edit);
  update({ families });
}
onOutbox(() => recompute());

/** A fresh /songs answer. `asked` is when the question went out: my changes after it stay on top. */
export function setLibrary(songs: LibSong[], asked: number) {
  base = new Map(songs.filter((song) => song.main).map((song) => [song.id, song.main!]));
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

function send(edit: FamilyEdit, songId: string, before: NewChange[] = []): Sent {
  const changes = addChanges([...before, { kind: 'family_set', songId, edit }]);
  local = [...local, { edit, at: Date.now(), ids: changes.map((change) => change.id) }];
  recompute();
  return { changes, edit, minedId: before.length ? songId : null };
}

/** Takes an action back: unsent, it's simply dropped; sent, the opposite goes out, family first, then the Mine. */
export function undo(sent: Sent) {
  const back = reverse(sent.edit);
  local = [...local, { edit: back, at: Date.now(), ids: [] }];
  if (!takeBack(sent.changes)) {
    const changes = addChanges([
      { kind: 'family_set', songId: sent.changes[sent.changes.length - 1].data.song_id, edit: back },
      ...(sent.minedId ? [{ kind: 'mine_restore' as const, songId: sent.minedId }] : []),
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
  if (!edit) return 'Already versions of each other.';
  return send(edit, songId, needsMine ? [{ kind: 'mine_set', songId, value: 'mine' }] : []);
}

/** The refusal a link would get, checked before anything is sent. */
export function linkRefusal(songId: string, target: string): string | null {
  const edit = linkEdit(state.families, songId, target);
  if (typeof edit === 'string') return edit;
  return edit ? null : 'Already versions of each other.';
}

export function makeMain(songId: string): Sent | null {
  const edit = makeMainEdit(state.families, songId);
  return edit && send(edit, songId);
}

export function remove(songId: string): Sent | null {
  const edit = removeEdit(state.families, songId);
  return edit && send(edit, songId);
}

/** For Not mine: takes the song out first, so the laptop never sees a hidden song in a family. */
export const removeEditFor = (songId: string) => removeEdit(state.families, songId);
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
export const isVersion = (id: string) => (state.families.get(id) ?? id) !== id;
export const versionCount = (id: string) => (state.families.has(id) ? membersOf(state.families, id).length : 1);
export const songTitle = titleOf;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useVersions = () => useSyncExternalStore(subscribe, () => state);
