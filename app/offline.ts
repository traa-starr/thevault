// Mine songs stored on the phone, so they play with the laptop off. Only the app's own Documents folder is touched.
// Every Mine song downloads by itself, newest first, one at a time, while the app is open. A song is on the phone only
// once its whole file is there: it downloads under a .part name and is renamed when its size matches the laptop's.
// The laptop decides what is Mine: nothing is removed because the laptop didn't answer, only after a real /kept answer.
import { Directory, DownloadTask, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

const LIMIT_BYTES = 8 * 1024 ** 3; // fixed for now (BATCH-PLAN 6 stop line)
const KEEP_FREE_BYTES = 500 * 1024 ** 2; // the phone itself running out stops it too
const GONE_MS = 7 * 24 * 3600 * 1000; // a song no longer Mine leaves the phone a week later: room for a mis-tap
const KEPT_TIMEOUT_MS = 8000;
const STALL_MS = 20000; // no bytes for this long: the laptop went to sleep mid-song
const RETRY_MS = 30000;
const MAX_FAILS = 3;

type KeptSong = { id: string; title: string; date: string | null; size: number; type: string; stamp: string };
type Entry = { size: number; type: string; stamp: string; goneSince?: number };
type Saved = { entries: Record<string, Entry>; kept: KeptSong[] };

export type OfflineState = {
  /** Mine songs whose whole file is on the phone. */
  stored: number;
  /** Mine songs the laptop has phone copies of, at its last answer. */
  wanted: number;
  bytes: number;
  saving: boolean;
  /** Songs left off because of the 8 GB limit, or because the phone itself is full. */
  left: number;
  full: '' | 'limit' | 'phone';
  /** null: not asked yet this time. */
  reachable: boolean | null;
};

const folder = () => new Directory(Paths.document, 'phone-copies');
const listFile = () => new File(Paths.document, 'phone-copies.json');
// paths are rebuilt each time from Documents: a re-sign can move the app's folder
const copyFile = (id: string, type: string) => new File(folder(), `${id}.${type}`);
const partFile = (id: string) => new File(folder(), `${id}.part`);

let url = '';
let saved: Saved = load();
let running = false;
let fails = 0;
let retry: ReturnType<typeof setTimeout> | undefined;
let state: OfflineState = { stored: 0, wanted: 0, bytes: 0, saving: false, left: 0, full: '', reachable: null };
const listeners = new Set<() => void>();

function load(): Saved {
  try {
    const file = listFile();
    if (file.exists) {
      const data = JSON.parse(file.textSync());
      return { entries: data.entries ?? {}, kept: data.kept ?? [] };
    }
  } catch {
    // a damaged list: start again from the folder, the files themselves say what's whole
  }
  return { entries: {}, kept: [] };
}

function save() {
  try {
    const file = listFile();
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify(saved));
  } catch {
    // a full phone: the next save tries again
  }
}

const update = (changes: Partial<OfflineState>) => {
  state = { ...state, ...changes };
  listeners.forEach((listener) => listener());
};

/** True only if the whole file is there. */
function whole(id: string) {
  const entry = saved.entries[id];
  if (!entry) return false;
  try {
    const file = copyFile(id, entry.type);
    return file.exists && file.size === entry.size;
  } catch {
    return false;
  }
}

function counts() {
  let stored = 0;
  let bytes = 0;
  const mine = new Set(saved.kept.map((song) => song.id));
  Object.entries(saved.entries).forEach(([id, entry]) => {
    bytes += entry.size;
    if (mine.has(id)) stored++;
  });
  update({ stored, bytes, wanted: saved.kept.length });
}

/** Leftover half files from a closed app, and files the list doesn't know. */
function tidy() {
  try {
    const dir = folder();
    if (!dir.exists) dir.create({ intermediates: true });
    dir.list().forEach((item) => {
      if (!(item instanceof File)) return;
      const [id, type] = [item.name.slice(0, item.name.lastIndexOf('.')), item.name.slice(item.name.lastIndexOf('.') + 1)];
      const entry = saved.entries[id];
      if (type === 'part' || !entry || entry.type !== type) item.delete();
    });
    Object.keys(saved.entries).forEach((id) => {
      if (!whole(id)) delete saved.entries[id];
    });
    save();
  } catch {
    // nothing to tidy
  }
}

function remove(id: string) {
  const entry = saved.entries[id];
  delete saved.entries[id];
  try {
    if (entry) {
      const file = copyFile(id, entry.type);
      if (file.exists) file.delete();
    }
  } catch {
    // gone already
  }
}

async function askKept() {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), KEPT_TIMEOUT_MS);
  try {
    const r = await fetch(`${url}/kept`, { signal: abort.signal });
    if (!r.ok) throw new Error(`Server said ${r.status}`);
    return (await r.json()) as { songs: KeptSong[]; no_copy?: string[] };
  } finally {
    clearTimeout(timer);
  }
}

/** Songs no longer Mine get a week, then go. A Mine song with no copy yet keeps whatever it has. */
function reconcile(kept: KeptSong[], noCopy: string[]) {
  const mine = new Set([...kept.map((song) => song.id), ...noCopy]);
  const now = Date.now();
  Object.entries(saved.entries).forEach(([id, entry]) => {
    if (mine.has(id)) delete entry.goneSince;
    else if (!entry.goneSince) entry.goneSince = now;
    else if (now - entry.goneSince > GONE_MS) remove(id);
  });
}

async function download(song: KeptSong) {
  const part = partFile(song.id);
  if (part.exists) part.delete();
  const abort = new AbortController();
  let lastBytes = Date.now();
  const stall = setInterval(() => {
    if (Date.now() - lastBytes > STALL_MS) abort.abort();
  }, 2000);
  try {
    const task = new DownloadTask(`${url}/songs/${song.id}/copy`, part, {
      sessionType: 'foreground',
      signal: abort.signal,
      onProgress: () => (lastBytes = Date.now()),
    });
    await task.downloadAsync();
    if (!part.exists || part.size !== song.size) throw new Error('Not the whole file');
    const old = saved.entries[song.id];
    if (old) remove(song.id); // a rebuilt copy: the old one stays playable until the new one is whole
    const final = copyFile(song.id, song.type);
    if (final.exists) final.delete();
    part.rename(final.name);
    saved.entries[song.id] = { size: song.size, type: song.type, stamp: song.stamp };
    save();
  } catch (e) {
    try {
      if (part.exists) part.delete();
    } catch {
      // nothing left to clean
    }
    throw e;
  } finally {
    clearInterval(stall);
  }
}

async function run() {
  if (running || !url) return;
  running = true;
  clearTimeout(retry);
  try {
    let answer;
    try {
      answer = await askKept();
    } catch {
      update({ reachable: false, saving: false });
      return;
    }
    update({ reachable: true });
    saved.kept = answer.songs; // newest first, as the laptop sends it
    reconcile(answer.songs, answer.no_copy ?? []);
    save();
    counts();
    let left = 0;
    let full: OfflineState['full'] = '';
    for (const song of saved.kept) {
      const entry = saved.entries[song.id];
      if (entry && entry.stamp === song.stamp && whole(song.id)) continue;
      if (full) {
        left++;
        continue;
      }
      const used = state.bytes - (entry?.size ?? 0);
      if (used + song.size > LIMIT_BYTES) full = 'limit';
      else if (Paths.availableDiskSpace - song.size < KEEP_FREE_BYTES) full = 'phone';
      if (full) {
        left++;
        continue;
      }
      update({ saving: true });
      try {
        await download(song);
        fails = 0;
        counts();
      } catch {
        if (++fails >= MAX_FAILS) {
          fails = 0;
          update({ reachable: false });
          break;
        }
      }
    }
    update({ left, full, saving: false });
  } finally {
    running = false;
    update({ saving: false });
    // something still missing: try again later, while the app is open
    if (state.stored < state.wanted && !state.full) retry = setTimeout(run, RETRY_MS);
  }
}

export const offline = {
  /** On open and each time the app comes back to the front. */
  start(serverUrl: string) {
    if (serverUrl && serverUrl !== url) url = serverUrl;
    if (!running && !state.saving) {
      tidy();
      counts();
    }
    run();
  },

  /** The app went to the back: iOS will pause it anyway, so stop asking. */
  pause() {
    clearTimeout(retry);
  },

  /** The phone's own file for this song, or null. Checks the file is whole, with no network call. */
  uri(id: string) {
    const entry = saved.entries[id];
    return entry && whole(id) ? copyFile(id, entry.type).uri : null;
  },

  has: (id: string) => whole(id),
  reachable: () => state.reachable,
  /** Something else just reached, or failed to reach, the laptop. */
  setReachable(reachable: boolean) {
    if (state.reachable !== reachable) update({ reachable });
  },
};

// The Library's last list, kept so it opens with the laptop off.
const songListFile = () => new File(Paths.document, 'song-list.json');

export function saveSongList<T>(songs: T[], asked: number) {
  try {
    const file = songListFile();
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify({ songs, asked }));
  } catch {
    // a full phone: the last list stays
  }
}

export function loadSongList<T>(): { songs: T[]; asked: number } | null {
  try {
    const file = songListFile();
    return file.exists ? JSON.parse(file.textSync()) : null;
  } catch {
    return null;
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useOffline = () => useSyncExternalStore(subscribe, () => state);
