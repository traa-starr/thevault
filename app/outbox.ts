// Changes the laptop hasn't confirmed yet. Saved on the phone first, sent at once, tried again until the laptop answers.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import type { FamilyEdit } from './family';
import type { Change, MineChange } from './playOrder';

const TIMEOUT_MS = 10000;
const RETRY_MS = 10000;
const PER_CHANGE_MS = 50; // a 300-song sweep takes the laptop several seconds

type OutboxState = { pending: Change[]; refused: number };

const outboxFile = () => new File(Paths.document, 'outbox.json');

const load = (): Change[] => {
  try {
    const file = outboxFile();
    return file.exists ? JSON.parse(file.textSync()) : [];
  } catch {
    return [];
  }
};

let state: OutboxState = { pending: load(), refused: 0 };
let url = '';
let sending: Promise<void> | null = null;
let inFlight: Change[] = [];
let retry: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const update = (next: OutboxState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const save = (pending: Change[]) => {
  const file = outboxFile();
  if (!file.exists) file.create();
  file.writeSync(JSON.stringify(pending));
};

const newId = () =>
  'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));

/** True if the laptop answered. */
async function send() {
  const batch = state.pending;
  inFlight = batch;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS + batch.length * PER_CHANGE_MS);
  try {
    const r = await fetch(`${url}/changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Vault-Client': 'app' },
      body: JSON.stringify({ changes: batch }),
      signal: abort.signal,
    });
    if (!r.ok) throw new Error(`Server said ${r.status}`);
    const data: { results: { status: string }[] } = await r.json();
    const pending = state.pending.filter((change) => !batch.includes(change));
    save(pending);
    update({ pending, refused: state.refused + data.results.filter((result) => result.status === 'refused').length });
    return true;
  } catch {
    return false; // not reachable or busy: everything stays saved for the next try
  } finally {
    clearTimeout(timer);
    inFlight = [];
  }
}

/** Sends what's waiting. Resolves once this try is over, whatever the answer. */
export function flush(): Promise<void> {
  if (sending) return sending;
  if (!url || !state.pending.length) return Promise.resolve();
  clearTimeout(retry);
  sending = send().then((answered) => {
    sending = null;
    if (!state.pending.length) return;
    if (answered) return flush(); // tapped while that was on its way
    retry = setTimeout(flush, RETRY_MS);
  });
  return sending;
}

export function startOutbox(serverUrl: string) {
  url = serverUrl;
  flush();
}

export type NewChange =
  | { kind: MineChange['kind']; songId: string; value?: MineChange['data']['value'] }
  | { kind: 'family_set'; songId: string; edit: FamilyEdit; mine?: string[]; restore?: string[] };

/** Saves these and sends them together, so a sweep is one send. Gives back what was saved, for an Undo. */
export function addChanges(list: NewChange[]): Change[] {
  if (!list.length) return [];
  const made = list.map((one): Change =>
    one.kind === 'family_set'
      ? {
          id: newId(),
          kind: 'family_set',
          data: {
            song_id: one.songId,
            songs: one.edit.songs,
            before: one.edit.before,
            ...(one.edit.picked ? { picked: one.edit.picked, picked_before: one.edit.pickedBefore ?? {} } : {}),
            ...(one.mine?.length ? { mine: one.mine } : {}),
            ...(one.restore?.length ? { restore_mine: one.restore } : {}),
          },
        }
      : { id: newId(), kind: one.kind, data: { song_id: one.songId, ...(one.value ? { value: one.value } : {}) } },
  );
  const pending = [...state.pending, ...made];
  save(pending);
  update({ ...state, pending });
  flush();
  return made;
}

/** Undo before sending: drops these if none has left yet and nothing was added after them. False: send an undo instead. */
export function takeBack(changes: Change[]): boolean {
  const ids = new Set(changes.map((change) => change.id));
  const at = state.pending.findIndex((change) => ids.has(change.id));
  if (at < 0 || state.pending.length - at !== ids.size) return false;
  if (inFlight.some((change) => ids.has(change.id))) return false;
  if (!state.pending.slice(at).every((change) => ids.has(change.id))) return false;
  const pending = state.pending.slice(0, at);
  save(pending);
  update({ ...state, pending });
  return true;
}

export const addChange = (kind: MineChange['kind'], songId: string, value?: MineChange['data']['value']) =>
  addChanges([{ kind, songId, value }]);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useOutbox = () => useSyncExternalStore(subscribe, () => state);

/** What's waiting right now, for stores that aren't React screens. */
export const pendingNow = () => state.pending;

/** Calls back whenever the outbox changes, outside React. */
export const onOutbox = (listener: () => void) => subscribe(listener);
