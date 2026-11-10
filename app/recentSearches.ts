// Recent searches (overhaul wave 2): the last few searches that led to a tap on a result, in a small file on the
// phone. A convenience, not truth: it isn't sent to the laptop, and a fresh install starts with none. Rules: search.ts.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { addRecent, readRecents, writeRecents } from './search';

const file = () => new File(Paths.document, 'recent-searches.json');

const load = (): string[] => {
  try {
    const f = file();
    return f.exists ? readRecents(f.textSync()) : [];
  } catch {
    return [];
  }
};

let list: string[] = load();
const listeners = new Set<() => void>();
const set = (next: string[]) => {
  list = next;
  listeners.forEach((listener) => listener());
  try {
    const f = file();
    if (!f.exists) f.create();
    f.writeSync(writeRecents(next));
  } catch {
    // a full phone: the list still shows until the app closes
  }
};

export const recents = {
  /** A result was tapped for these words. */
  add: (text: string) => {
    const next = addRecent(list, text);
    if (next.join('\n') !== list.join('\n')) set(next);
  },
  clear: () => {
    if (list.length) set([]);
  },
};

export const useRecents = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => list,
  );
