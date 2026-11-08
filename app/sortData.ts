// What Sort shows, from the laptop's /sorting answer plus my choices since. Songs are judged anywhere (cards, a sweep,
// the player), so every screen asks isOpen() before showing a song: one judged elsewhere drops out at once.
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flush, useOutbox } from './outbox';
import type { PlayerSong } from './playerStore';

export type SortSong = PlayerSong & { where: string; date: string | null; folder: string };
export type SortSet = { id: string; kind: 'folder' | 'name'; name: string; songs: string[] };
type Answer = { total: number; songs: SortSong[]; sets: SortSet[] };

const TIMEOUT_MS = 15000;

// Not sure is a pass, not a verdict, so it stays on the phone and out of the laptop's permanent record.
const notSureFile = () => new File(Paths.document, 'not-sure.json');

export const loadNotSure = (): Set<string> => {
  try {
    const file = notSureFile();
    return new Set(file.exists ? JSON.parse(file.textSync()) : []);
  } catch {
    return new Set();
  }
};

export const saveNotSure = (ids: Set<string>) => {
  const file = notSureFile();
  if (!file.exists) file.create();
  file.writeSync(JSON.stringify([...ids]));
};

export function useSortData(url: string) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { pending } = useOutbox();
  // every song ever seen this visit, so an Undo can bring one back before the laptop's next answer
  const known = useRef(new Map<string, SortSong>());
  // my choices by song: newer than the answer we hold, they win; older, the answer already has them
  const choices = useRef(new Map<string, { open: boolean; at: number }>());
  const seen = useRef(new Set<string>());
  const askedAt = useRef(0);

  useEffect(() => {
    let changed = false;
    for (const change of pending) {
      if (seen.current.has(change.id)) continue;
      seen.current.add(change.id);
      if (change.kind === 'tag_add' || change.kind === 'tag_remove') continue;
      // a versions change opens or closes a song in Sort only through the Mine marks it carries
      const marks =
        change.kind === 'family_set'
          ? [...(change.data.mine ?? []).map((id) => [id, false] as const), ...(change.data.restore_mine ?? []).map((id) => [id, true] as const)]
          : [[change.data.song_id, change.kind === 'mine_restore'] as const];
      for (const [id, open] of marks) {
        choices.current.set(id, { open, at: Date.now() });
        changed = true;
      }
    }
    if (changed) setAnswer((a) => a && { ...a }); // same answer, read again with the new choices
  }, [pending]);

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
    let current = true;
    setFailed(false);
    (async () => {
      try {
        await flush(); // so the answer comes back with my latest choices in it
        const started = Date.now();
        const r = await fetch(`${url}/sorting`, { signal: abort.signal });
        if (!r.ok) throw new Error(`Server said ${r.status}`);
        const data: Answer = await r.json();
        if (!current) return;
        data.songs.forEach((song) => known.current.set(song.id, song));
        askedAt.current = started;
        setAnswer(data);
      } catch {
        if (current) setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      current = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [url, attempt]);

  // the outbox has just emptied, so the laptop now holds my choices: ask again
  const waiting = pending.length > 0;
  const wasWaiting = useRef(waiting);
  useEffect(() => {
    if (wasWaiting.current && !waiting) setAttempt((n) => n + 1);
    wasWaiting.current = waiting;
  }, [waiting]);

  const view = useMemo(() => {
    if (!answer) return null;
    const onLaptop = new Set(answer.songs.map((song) => song.id));
    const isOpen = (id: string) => {
      const choice = choices.current.get(id);
      return choice && choice.at > askedAt.current ? choice.open : onLaptop.has(id);
    };
    // the laptop's card order, kept here too, so an undone song goes back to its own place, ahead of where I am
    const open = [...known.current.values()].filter((song) => isOpen(song.id)).sort(byCardOrder);
    const openIds = new Set(open.map((song) => song.id));
    const sets = answer.sets
      .map((set) => ({ ...set, songs: set.songs.filter((id) => openIds.has(id)) }))
      .filter((set) => set.songs.length > 0);
    return { total: answer.total, open, sets, song: (id: string) => known.current.get(id)! };
  }, [answer]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { view, failed, retry };
}

export type SortView = NonNullable<ReturnType<typeof useSortData>['view']>;

const LIKELY_FIRST: Record<string, number> = { mine: 0, 'likely mine': 1 };
const cardKey = (song: SortSong): [number, string, string] =>
  [LIKELY_FIRST[song.mine] ?? 2, song.folder.toLowerCase(), song.title.toLowerCase()];
const byCardOrder = (a: SortSong, b: SortSong) => {
  const [x, y] = [cardKey(a), cardKey(b)];
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
};
