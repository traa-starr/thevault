// Changes the laptop hasn't confirmed yet. Saved on the phone first, sent at once, tried again until the laptop answers.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import type { Change } from './playOrder';

const TIMEOUT_MS = 10000;
const RETRY_MS = 10000;

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
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
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

export function addChange(kind: Change['kind'], songId: string, value?: Change['data']['value']) {
  const change: Change = { id: newId(), kind, data: { song_id: songId, ...(value ? { value } : {}) } };
  const pending = [...state.pending, change];
  save(pending);
  update({ ...state, pending });
  flush();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useOutbox = () => useSyncExternalStore(subscribe, () => state);
