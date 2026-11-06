// Compare: the versions of one song on a dial, flipped at the same second. Memory only: it changes no verdict, so
// nothing goes to the outbox. The app killed mid-Compare reopens on the queue's song, as the queue never moved.
import { useSyncExternalStore } from 'react';
import { createCompareEngine, type CompareEngine, type CompareSound } from './compareEngine';
import { offline } from './offline';
import { player } from './playerStore';
import { members, songInfo, songTitle } from './versionStore';

const PROBE_TIMEOUT_MS = 5000;

export type Can = 'checking' | 'ok' | 'cloud' | 'missing' | 'unreachable';
type State = {
  open: boolean;
  from: 'player' | 'library';
  /** The dial: Main first, then newest to oldest. */
  ids: string[];
  /** Where the dial rests. */
  at: number;
  can: Record<string, Can>;
  /** The version heard before the one sounding now, for "Back to the last one". */
  last: string | null;
  sound: CompareSound;
};

const empty: CompareSound = { sounding: '', pending: null, time: 0, duration: 0, playing: false, lengths: {}, ready: {} };
let state: State = { open: false, from: 'player', ids: [], at: 0, can: {}, last: null, sound: empty };
let url = '';
let engine: CompareEngine | null = null;
let shownSounding = '';
// set at open: the laptop isn't known to be on, so versions on the phone play from there (same files on every flip)
let fromPhone = false;
const listeners = new Set<() => void>();

const update = (changes: Partial<State>) => {
  state = { ...state, ...changes };
  listeners.forEach((listener) => listener());
};

const streamUrl = (id: string) => `${url}/songs/${id}/audio`;
/** The laptop's full-quality copy when it's on; the phone's copy when it isn't. */
const audioUrl = (id: string) => (fromPhone && offline.uri(id)) || streamUrl(id);

/** Main first, then newest to oldest; no date last. */
export function dialOrder(anyId: string) {
  const [main, ...rest] = members(anyId);
  const date = (id: string) => songInfo(id)?.date ?? '';
  return [main, ...rest.sort((a, b) => (date(a) < date(b) ? 1 : date(a) > date(b) ? -1 : 0))];
}

const uris = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, audioUrl(id)]));

/** The sounding version and the dial's neighbours: at most 3 load at once. */
const nearby = (ids: string[], at: number) => [ids[at - 1], ids[at], ids[at + 1]].filter((id): id is string => !!id);

async function probe(id: string): Promise<Can> {
  if (fromPhone && offline.uri(id)) return 'ok';
  if (offline.reachable() === false) return 'unreachable';
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(streamUrl(id), { method: 'HEAD', signal: abort.signal });
    if (r.ok) return 'ok';
    return r.status === 409 ? 'cloud' : 'missing';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

function onChange(sound: CompareSound) {
  if (sound.sounding !== shownSounding) {
    const last = shownSounding || null;
    shownSounding = sound.sounding;
    update({ sound, last });
    return;
  }
  update({ sound });
}

function begin(serverUrl: string, ids: string[], startId: string, at: number, play: boolean, from: State['from']) {
  url = serverUrl;
  fromPhone = offline.reachable() !== true;
  const index = Math.max(ids.indexOf(startId), 0);
  const can = Object.fromEntries(ids.map((id) => [id, 'checking' as Can]));
  shownSounding = startId;
  update({ open: true, from, ids, at: index, can, last: null, sound: { ...empty, sounding: startId, time: at, playing: play } });
  engine = createCompareEngine({ onChange, onEnd: () => engine?.rewind() });
  engine.start(startId, uris(ids), at, play, nearby(ids, index), songTitle);
  ids.forEach((id) =>
    probe(id).then((answer) => {
      if (!state.open || !state.ids.includes(id)) return;
      update({ can: { ...state.can, [id]: answer } });
    }),
  );
}

export const compare = {
  /** From the full player: the song playing, at its second, playing or paused as it was. */
  openFromPlayer(serverUrl: string) {
    const now = player.current();
    if (!now || members(now.id).length < 2 || player.isSorting()) return;
    const ids = dialOrder(now.id);
    const start = player.startCompare(false);
    begin(serverUrl, ids, now.id, start.at, start.play, 'player');
  },

  /** From a Library group: its Main at 0:00, paused. */
  openFromLibrary(serverUrl: string, anyId: string) {
    if (members(anyId).length < 2 || player.isSorting()) return; // Sort already borrows the player
    const ids = dialOrder(anyId);
    player.startCompare(true);
    begin(serverUrl, ids, ids[0], 0, false, 'library');
  },

  /** The dial came to rest on row `index`. A row that can't play, or ends before now, is refused. */
  rest(index: number) {
    if (!engine || index === state.at) return;
    const id = state.ids[index];
    if (!id) return;
    update({ at: index });
    engine.keep(nearby(state.ids, index), uris(state.ids));
    if (compare.refusal(id)) return;
    engine.flipTo(id);
  },

  /** Why a row can't be flipped to now, in plain words, or null. */
  refusal(id: string): string | null {
    const can = state.can[id];
    if (can === 'cloud') return 'Cloud only';
    if (can === 'missing') return "Can't play";
    if (can === 'unreachable') return 'Laptop not reachable';
    if (engine?.tooShort(id)) return `Ends ${clock(state.sound.lengths[id] ?? 0)}`;
    return null;
  },

  toggle() {
    if (!engine) return;
    if (engine.playing()) engine.pause();
    else engine.play();
  },

  seek: (seconds: number) => engine?.seek(seconds) ?? Promise.resolve(),

  /** The family changed elsewhere: removed versions leave the dial. The sounding one gone: Main, same second. */
  familyChanged() {
    if (!state.open || !engine) return;
    const sounding = engine.sounding();
    const anyId = [sounding, ...state.ids].find((id) => members(id).length > 1);
    const ids = anyId ? dialOrder(anyId) : [];
    if (ids.length < 2) {
      compare.done();
      return;
    }
    if (ids.join() === state.ids.join()) return;
    const target = ids.includes(sounding) ? sounding : ids[0];
    const index = ids.indexOf(target);
    update({ ids, at: index });
    engine.keep(nearby(ids, index), uris(ids));
    if (target !== sounding) engine.flipTo(target);
  },

  /** Done: Compare lets go of the sound and the player takes it back. */
  done() {
    if (!state.open) return;
    const sounding = engine?.sounding() || state.ids[state.at];
    const at = engine?.time() ?? 0;
    const play = engine?.playing() ?? false;
    engine?.stop();
    engine = null;
    const from = state.from;
    update({ open: false, ids: [], can: {}, last: null, sound: empty });
    const info = songInfo(sounding);
    const song = sounding
      ? { id: sounding, title: songTitle(sounding), mine: info?.mine ?? 'mine', sorted: info?.sorted ?? true }
      : null;
    player.endCompare(url, from === 'player' ? song : null, at, play);
  },
};

export const clock = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useCompare = () => useSyncExternalStore(subscribe, () => state);
