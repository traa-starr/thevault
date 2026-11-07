// Compare: the versions of one song on a dial inside the full player, flipped at the same second. Memory only: it changes no verdict, so
// nothing goes to the outbox. The app killed mid-Compare reopens on the queue's song, as the queue never moved.
import { createAudioPlayer } from 'expo-audio';
import { useSyncExternalStore } from 'react';
import { compareWindow, createCompareEngine, dialReady, WAIT_CAP_MS, type CompareEngine, type CompareSound, type Voice } from './compareEngine';
import { offline } from './offline';
import { onPlayerChange, player } from './playerStore';
import { members, songInfo, songTitle } from './versionStore';

const PROBE_TIMEOUT_MS = 5000;

export type Can = 'checking' | 'ok' | 'cloud' | 'missing' | 'unreachable';
type State = {
  /** The dial shows and Compare has the sound. */
  open: boolean;
  /** The wait before the dial: the song plays on with its own buttons while the other versions line up. */
  preparing: boolean;
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

const empty: CompareSound = { sounding: '', pending: null, time: 0, duration: 0, playing: false, lengths: {}, ready: {}, aligned: {} };
let state: State = { open: false, preparing: false, from: 'player', ids: [], at: 0, can: {}, last: null, sound: empty };
let url = '';
let engine: CompareEngine | null = null;
let shownSounding = '';
// set at open, never switched mid-Compare: phone copies when the laptop isn't known to be on, or when every version is
// on the phone (fast, same files on every flip); otherwise all stream from the laptop so the A/B is fair
let fromPhone = false;
let session = 0; // a late answer from an earlier Compare does nothing
let waitFor: string[] = []; // the versions the dial waits on
let waitStart = 0;
let waitTimer: ReturnType<typeof setTimeout> | undefined;
let unwatch: (() => void) | null = null;
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

const refused = (id: string) => {
  const can = state.can[id];
  return can === 'cloud' || can === 'missing' || can === 'unreachable';
};

/** The versions to keep loaded around row `at`: nearest first, capped (compareEngine.ts compareWindow). */
const nearby = (ids: string[], at: number) => compareWindow(ids, at, engine?.loadedIds() ?? [], refused);

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

// keepAudioSessionActive: pausing or dropping one of Compare's players must never switch the phone's sound off
// under another player still starting up (that left silence after Done until a pause and play)
const makePlayer = (uri: string, updateInterval: number) => createAudioPlayer({ uri }, { updateInterval, keepAudioSessionActive: true });

function onChange(sound: CompareSound) {
  if (state.preparing) {
    update({ sound });
    checkWait();
    return;
  }
  if (!state.open) return; // handing the sound back after Done: nothing to show
  if (sound.sounding !== shownSounding) {
    const last = shownSounding || null;
    shownSounding = sound.sounding;
    update({ sound, last });
    return;
  }
  update({ sound });
}

/** The wait is over when every version in the window lined up or can't play, or at the cap: the dial shows. */
function checkWait() {
  if (!state.preparing || !engine) return;
  if (!dialReady(waitFor, state.sound.aligned, refused, Date.now() - waitStart)) return;
  if (player.isSorting()) return cancel();
  clearTimeout(waitTimer);
  unwatch?.();
  unwatch = null;
  engine.follow(false);
  player.startCompare(false); // the queue's player is already lent: this only hands Compare its buttons
  update({ preparing: false, open: true });
}

/** Compare stops before the dial showed: half-loaded versions go, the song plays on as it is. */
function cancel() {
  session++;
  clearTimeout(waitTimer);
  unwatch?.();
  unwatch = null;
  engine?.stop();
  engine = null;
  update({ preparing: false, open: false, ids: [], can: {}, last: null, sound: empty });
}

function begin(serverUrl: string, ids: string[], startId: string, at: number, play: boolean, from: State['from'], voice: Voice | null, wait: boolean) {
  url = serverUrl;
  const mine = ++session;
  fromPhone = offline.reachable() !== true || ids.every((id) => offline.has(id));
  const index = Math.max(ids.indexOf(startId), 0);
  const can = Object.fromEntries(ids.map((id) => [id, 'checking' as Can]));
  shownSounding = startId;
  update({ open: !wait, preparing: wait, from, ids, at: index, can, last: null, sound: { ...empty, sounding: startId, time: at, playing: play } });
  engine = createCompareEngine({
    onChange,
    // the song ending during the wait moves the queue on: Compare stops instead
    onEnd: () => (state.preparing ? cancel() : engine?.rewind()),
    makePlayer,
    lockScreen: voice ? (id) => state.open && player.compareTitle(songTitle(id)) : undefined,
  });
  ids.forEach((id) =>
    probe(id).then((answer) => {
      if (session !== mine || !state.ids.includes(id)) return;
      update({ can: { ...state.can, [id]: answer } });
      checkWait();
    }),
  );
  waitFor = compareWindow(ids, index, []);
  engine.start(startId, uris(ids), at, play, waitFor.filter((id) => id !== startId), songTitle, voice ?? undefined);
  if (!wait) return;
  engine.follow(true);
  waitStart = Date.now();
  waitTimer = setTimeout(checkWait, WAIT_CAP_MS);
  // skipping to another song during the wait cancels Compare
  unwatch = onPlayerChange(() => {
    if (state.preparing && player.current()?.id !== startId) cancel();
  });
}

export const compare = {
  /** Compare holds the sound or is getting ready to. */
  busy: () => state.open || state.preparing,

  /** From the full player: the song plays on with its own buttons while the other versions line up at its second,
   * then the dial shows (WAIT_CAP_MS at most). A second tap during the wait cancels. */
  openFromPlayer(serverUrl: string) {
    if (state.preparing) return cancel();
    const now = player.current();
    const voice = player.voice();
    if (!now || !voice || members(now.id).length < 2 || player.isSorting()) return;
    const { time, wanted } = player.position();
    begin(serverUrl, dialOrder(now.id), now.id, time, wanted, 'player', voice, true);
  },

  /** From a Library group: its Main at 0:00, paused. */
  openFromLibrary(serverUrl: string, anyId: string) {
    if (members(anyId).length < 2 || player.isSorting()) return; // Sort already borrows the player
    const ids = dialOrder(anyId);
    if (state.preparing) cancel();
    player.startCompare(true);
    begin(serverUrl, ids, ids[0], 0, false, 'library', null, false);
    player.open('player'); // the dial lives in the full player (board meeting 5)
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

  /** Loaded but not lined up once the dial shows: drawn dimmed, "Not ready", and stepped over. Undims if it arrives. */
  notReady(id: string): boolean {
    const { sound } = state;
    return state.open && id in sound.ready && !sound.aligned[id] && id !== sound.pending && id !== sound.sounding;
  },

  /** Why a row can't be flipped to now, in plain words, or null. */
  refusal(id: string): string | null {
    const can = state.can[id];
    if (can === 'cloud') return 'Cloud only';
    if (can === 'missing') return "Can't play";
    if (can === 'unreachable') return fromPhone && !offline.has(id) ? 'Not on this phone' : 'Laptop not reachable';
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

  /** Done: the player takes the sound back. The version heard is the queue's song: Compare just lets go, and it plays
   * on untouched. Another version: the queue loads it silently and Compare hands over the way a flip works. */
  done() {
    if (state.preparing) return cancel();
    if (!state.open) return;
    const leaving = engine;
    engine = null;
    const sounding = leaving?.sounding() || state.ids[state.at];
    const at = leaving?.time() ?? 0;
    const play = leaving?.playing() ?? false;
    const from = state.from;
    session++;
    update({ open: false, ids: [], can: {}, last: null, sound: empty });
    const info = songInfo(sounding);
    const song = sounding
      ? { id: sounding, title: songTitle(sounding), mine: info?.mine ?? 'mine', sorted: info?.sorted ?? true }
      : null;
    const queueSong = player.current()?.id;
    if (from === 'library' || !leaving || sounding === queueSong) {
      leaving?.stop();
      player.endCompare(url, from === 'player' ? song : null, at, play);
      return;
    }
    const voice = player.endCompare(url, song, at, play, () => leaving.finishNow());
    if (!voice) {
      leaving.stop();
      return;
    }
    leaving.handTo(voice, () => player.handedBack());
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
