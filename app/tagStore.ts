// Tags on the phone (BLUEPRINT "Phase 2: tagging"): a copy of the laptop's GET /tags in the app's own storage, so tags
// show with the laptop off, and the outbox laid on top. A tag is "Saved on phone" while its change waits in the outbox,
// "On laptop" once the laptop took it. Unsent tags reach the phone backup through the outbox.
import { File, Paths } from 'expo-file-system';
import { useMemo, useSyncExternalStore } from 'react';
import { addTagChange, newId, onOutbox, onSent, takeBack, useOutbox } from './outbox';
import { listAfterTap, tagsWithPending, type Change, type ShownTag, type Tag, type TagChange } from './playOrder';

const TIMEOUT_MS = 10000;
export const MAX_TEXT = 500;

const copyFile = () => new File(Paths.document, 'tags.json');

function load(): Tag[] {
  try {
    const file = copyFile();
    return file.exists ? JSON.parse(file.textSync()) : [];
  } catch {
    return [];
  }
}

let copy: Tag[] = load();
let url = '';
let asking: Promise<void> | null = null;
const listeners = new Set<() => void>();

function keep(next: Tag[]) {
  copy = next;
  try {
    const file = copyFile();
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify(copy));
  } catch {
    // a full phone: the copy in memory still shows, the next answer saves again
  }
  listeners.forEach((listener) => listener());
}

/** Asks the laptop for every tag. Laptop off: the copy stays as it is. */
function refresh(): Promise<void> {
  if (!url) return Promise.resolve();
  if (asking) return asking;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  asking = fetch(`${url}/tags`, { signal: abort.signal })
    .then(async (r) => {
      if (!r.ok) return;
      const data: { tags?: Tag[] } = await r.json();
      if (Array.isArray(data.tags)) keep(data.tags);
    })
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(timer);
      asking = null;
    });
  return asking;
}

// what the laptop just took goes into the copy at once, then the copy is asked for again (a merge can move a tag)
onSent((accepted) => {
  const tagChanges = accepted.filter((c): c is TagChange => c.kind === 'tag_add' || c.kind === 'tag_remove');
  if (!tagChanges.length) return;
  keep(tagsWithPending(copy, tagChanges).map(({ onPhone, ...tag }) => tag));
  refresh();
});
onOutbox(() => listeners.forEach((listener) => listener()));

const now = () => new Date().toISOString();

export const tagStore = {
  /** On open and each time the app comes back to the front. */
  start(serverUrl: string) {
    url = serverUrl;
    refresh();
  },

  /** Undo: drops the change if it hasn't left yet, else sends what puts things back (the old whole tag, or a delete). */
  undo(change: TagChange, before: Tag | null) {
    if (takeBack([change])) return;
    if (before) {
      const { id, version_id, ...rest } = before;
      addTagChange({ kind: 'tag_add', data: { tag_id: id, ...rest } });
    } else addTagChange({ kind: 'tag_remove', data: { tag_id: change.data.tag_id, song_id: change.data.song_id } });
  },
};

// ---------- the draft and the reserved line --------------------------------------------------------------------
// One draft at a time: song, second, words. Saved on every keystroke so a kill or lock brings it back. Never synced.

export type Draft = { tagId: string; songId: string; songTitle: string; at: number; text: string; madeAt: string };
export type Note = { text: string; bold?: string; undo?: () => void };
const NOTE_MS = 3000;
const UNDO_MS = 6000;
const GUARD_MS = 1000;

const draftFile = () => new File(Paths.document, 'tag-draft.json');

function loadDraft(): Draft | null {
  try {
    const file = draftFile();
    return file.exists ? JSON.parse(file.textSync()) : null;
  } catch {
    return null;
  }
}

// listFor: the song whose Tags list is open. One place, and a song change closes it by itself (the id no longer matches).
type Line = { draft: Draft | null; note: Note | null; listFor: string | null };
let line: Line = { draft: loadDraft(), note: null, listFor: null };
let noteTimer: ReturnType<typeof setTimeout> | undefined;
let lastTap = 0;
const lineListeners = new Set<() => void>();

function setLine(next: Partial<Line>) {
  line = { ...line, ...next };
  lineListeners.forEach((listener) => listener());
}

function keepDraft(draft: Draft | null) {
  try {
    const file = draftFile();
    if (!draft) {
      if (file.exists) file.delete();
    } else {
      if (!file.exists) file.create();
      file.writeSync(JSON.stringify(draft));
    }
  } catch {
    // a full phone: the draft in memory still holds
  }
  setLine({ draft });
}

/** "1:42" */
export const clock = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
/** "1:42.3" */
export const clockExact = (seconds: number) => {
  const tenths = Math.floor(seconds * 10) / 10;
  const whole = Math.floor(tenths);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}.${Math.round((tenths - whole) * 10)}`;
};

export function say(note: Note) {
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => setLine({ note: null }), note.undo ? UNDO_MS : NOTE_MS);
  setLine({ note });
}

export const tagLine = {
  /** Tag here: the second is the one passed in, frozen. A second tap within 1 s, or with a draft open, starts nothing. */
  start(songId: string, songTitle: string, at: number) {
    const now = Date.now();
    const guarded = now - lastTap < GUARD_MS;
    lastTap = now;
    if (line.draft || guarded) return false;
    clearTimeout(noteTimer);
    setLine({ note: null });
    keepDraft({ tagId: newId(), songId, songTitle, at: Math.max(0, at), text: '', madeAt: new Date().toISOString() });
    return true;
  },

  type(text: string) {
    if (line.draft) keepDraft({ ...line.draft, text: text.slice(0, MAX_TEXT) });
  },

  nudge(by: number, duration: number) {
    const d = line.draft;
    if (!d) return;
    const top = duration > 0 ? duration : Infinity;
    keepDraft({ ...d, at: Math.round(Math.min(Math.max(0, d.at + by), top) * 10) / 10 });
  },

  cancel: () => keepDraft(null),

  /** Return: the tag is saved, even with no words (a mark to fill in later). `playingId` says if it's another song's. */
  finish(playingId?: string | null) {
    const d = line.draft;
    if (!d) return;
    const change = addTagChange({
      kind: 'tag_add',
      data: { tag_id: d.tagId, song_id: d.songId, text: d.text.trim().slice(0, MAX_TEXT), at_sec: Math.round(d.at * 1000) / 1000, made_at: d.madeAt },
    });
    keepDraft(null);
    const where = playingId && playingId !== d.songId ? ` on ${d.songTitle}` : '';
    say({ text: 'Tagged at ', bold: clock(d.at) + where, undo: () => tagStore.undo(change, null) });
  },

  /** Tags · N: opens this song's list, or closes it. */
  toggleList(songId: string) {
    setLine({ listFor: listAfterTap(line.listFor, songId) });
  },

  /** Undo on the reserved line. */
  undo() {
    const u = line.note?.undo;
    clearTimeout(noteTimer);
    setLine({ note: null });
    u?.();
  },
};

const subscribeLine = (listener: () => void) => {
  lineListeners.add(listener);
  return () => {
    lineListeners.delete(listener);
  };
};

export const useTagLine = () => useSyncExternalStore(subscribeLine, () => line);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** One song's tags in time order, with what's waiting on top. */
export function useTags(songId: string | null | undefined): ShownTag[] {
  const laptopCopy = useSyncExternalStore(subscribe, () => copy);
  const { pending } = useOutbox();
  return useMemo(() => (songId ? tagsWithPending(laptopCopy, pending as Change[], songId) : []), [laptopCopy, pending, songId]);
}
