// The one player, above every screen. Screens send it commands and read its state, so Back never touches the music.
// Everything here is phone memory: when the app is closed, the queue is gone and it reopens stopped.
import { setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { createEngine, type Engine, type Sound } from './engine';
import { addChange } from './outbox';
import { currentId, jumpTo, nextInOrder, previousInOrder, removeFromOrder, setShuffle, startOrder, upNext, walkAhead, walkBack, type Order } from './playOrder';

export type PlayerSong = { id: string; title: string; mine: string; sorted: boolean };
type Mark = { mine: string; sorted: boolean };
type Undo = { order: Order; id: string; title: string; at: number };
type Spot = { order: Order; at: number };
export type Sheet = 'none' | 'player' | 'queue';

// Swap to 'single' if the playlist player fails on the phone: the bar and everything else keep working.
const ENGINE = 'playlist';
const BEHIND = 2;
const AHEAD = 3;
const STALL_MS = 10000;
const PROBE_TIMEOUT_MS = 5000;
const UNDO_MS = 5000;
const UNDO_PROBE_MS = 3000;
const SETTLE_MS = 2000; // a song just told to play can look paused for this long
const MAX_BAD_IN_A_ROW = 3;
const MAX_STUCK_PROBES = 3;
const FAILED_QUICKLY_MS = 3000;
const UP_NEXT_SHOWN = 200;

type State = {
  order: Order | null;
  song: PlayerSong | null;
  sorting: boolean;
  wanted: boolean;
  time: number;
  duration: number;
  note: string;
  trouble: string;
  undo: Undo | null;
  message: string;
  sheet: Sheet;
  timeLeft: boolean;
  marks: Record<string, Mark>;
};

const timeLeftFile = () => new File(Paths.document, 'time-left.txt');

let state: State = {
  order: null,
  song: null,
  sorting: false,
  wanted: false,
  time: 0,
  duration: 0,
  note: '',
  trouble: '',
  undo: null,
  message: '',
  sheet: 'none',
  timeLeft: timeLeftFile().exists,
  marks: {},
};
let url = '';
const songs = new Map<string, PlayerSong>();
let saved: Spot | null = null; // the library's place while Sort has the player
let engine: Engine | null = null;
let modeSet: Promise<unknown> | null = null;
let track: { id: string; order: Order | null }[] = []; // what the playlist player holds, one per position; null: chosen before a shuffle change
let settleUntil = 0;
let lastProgress = 0;
let lastTime = -1;
let badInARow = 0;
let stuckProbes = 0;
let everLoaded = false;
let trackStarted = 0;
let undoTimer: ReturnType<typeof setTimeout> | undefined;
let stallTimer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

const update = (changes: Partial<State>) => {
  state = { ...state, ...changes };
  listeners.forEach((listener) => listener());
};

const audioUrl = (id: string) => `${url}/songs/${id}/audio`;
const titleOf = (id: string) => songs.get(id)?.title ?? '';
const songNow = (order: Order) => songs.get(currentId(order)) ?? null;
const markOf = (song: PlayerSong): Mark => state.marks[song.id] ?? song;

// "What shuffle avoids" stays one input: while sorting, shuffle only lands on songs not yet called mine. Batch 4b changes it.
const avoid = () => {
  const out: string[] = [];
  songs.forEach((song) => {
    if (markOf(song).mine === 'mine') out.push(song.id);
  });
  return out;
};

const newTrackStarted = () => {
  everLoaded = false;
  trackStarted = Date.now();
  stuckProbes = 0;
  lastProgress = Date.now();
  lastTime = -1;
};

function onSound(sound: Sound) {
  if (sound.loaded) everLoaded = true;
  const changes: Partial<State> = { time: sound.time, duration: sound.duration };
  if (sound.time !== lastTime) {
    if (lastTime >= 0 && sound.playing) {
      badInARow = 0;
      stuckProbes = 0;
      lastProgress = Date.now();
      if (state.trouble) changes.trouble = '';
    }
    lastTime = sound.time;
  }
  // The bar follows what is really playing, so a call, Siri or the lock screen can't leave it showing the wrong thing.
  if (sound.playing && !state.wanted) changes.wanted = true;
  else if (!sound.playing && !sound.buffering && sound.loaded && state.wanted && Date.now() > settleUntil) changes.wanted = false;
  update(changes);
  if (sound.finished) finished();
}

function finished() {
  const moved = state.order && nextInOrder(state.order, avoid());
  if (moved) {
    loadOrder(moved, 0, true);
    return;
  }
  update({ note: 'Played every song in this list', wanted: false });
  engine?.pause();
  engine?.seek(0).catch(() => {});
}

function onTrack(index: number) {
  const entry = track[index];
  if (!entry || !state.order) return;
  const stale = !entry.order;
  const order = entry.order ? { ...entry.order, removed: state.order.removed } : jumpTo(state.order, entry.id);
  if (currentId(order) === currentId(state.order) && order.at === state.order.at && !stale) return;
  // a song that failed without ever loading moves the player on by itself: several in a row means stop, never loop
  if (!everLoaded && Date.now() - trackStarted < FAILED_QUICKLY_MS) badInARow++;
  newTrackStarted();
  settleUntil = Date.now() + SETTLE_MS;
  update({ order, song: songNow(order), time: 0, duration: 0, note: '', trouble: '' });
  engine?.setTitle(titleOf(entry.id));
  if (stale) replaceAhead(order, index);
  else topUp(order, index);
  // lock-screen previous needs a song behind this one. Adding it restarts this song, which has only just begun.
  if (index === 0) {
    const behind = previousInOrder(order);
    if (behind) {
      engine?.addInFront(audioUrl(currentId(behind)));
      track = [{ id: currentId(behind), order: behind }, ...track];
    }
  }
  if (badInARow >= MAX_BAD_IN_A_ROW) stopForBadSongs();
}

function topUp(order: Order, index: number) {
  if (!engine?.windowed) return;
  const missing = AHEAD - (track.length - 1 - index);
  if (missing <= 0) return;
  const last = track[track.length - 1];
  const from = last.order ?? order;
  for (const moved of walkAhead(from, missing, avoid())) {
    const id = currentId(moved);
    engine.add(audioUrl(id));
    track.push({ id, order: moved });
  }
}

function replaceAhead(order: Order, index: number) {
  if (!engine?.windowed) return;
  engine.dropAhead();
  track = track.slice(0, index + 1);
  for (const moved of walkAhead(order, AHEAD, avoid())) {
    const id = currentId(moved);
    engine.add(audioUrl(id));
    track.push({ id, order: moved });
  }
}

function stopForBadSongs() {
  engine?.pause();
  update({ wanted: false, trouble: "Several songs in a row wouldn't play, so it stopped" });
  badInARow = 0;
}

const ensureEngine = () => (engine ??= createEngine(ENGINE, { onSound, onTrack }));
const ensureMode = () =>
  (modeSet ??= setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {}));

/** Starts this order from scratch. Restarts the sound, so ordinary moves between songs let the player do it instead. */
function loadOrder(order: Order, at: number, play: boolean) {
  newTrackStarted();
  settleUntil = play ? Date.now() + SETTLE_MS : 0;
  const id = currentId(order);
  update({ order, song: songNow(order), time: at, duration: 0, wanted: play, note: '', trouble: '' });
  startStallWatch();
  ensureMode().finally(() => {
    if (state.order !== order) return; // a newer tap got there first
    const sound = ensureEngine();
    if (sound.windowed) {
      const behind = walkBack(order, BEHIND);
      const ahead = walkAhead(order, AHEAD, avoid());
      track = [...behind, order, ...ahead].map((one) => ({ id: currentId(one), order: one }));
      sound.load(track.map((one) => audioUrl(one.id)), behind.length, at, play);
    } else {
      sound.load([audioUrl(id)], 0, at, play);
    }
    sound.setLoop(state.sorting);
    sound.setTitle(titleOf(id));
  });
}

// A stuck player doesn't say why, so ask the server. HEAD opens no music file.
async function whyStuck(id: string) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(audioUrl(id), { method: 'HEAD', signal: abort.signal });
    if (r.ok) return 'loading';
    return r.status === 409 ? 'cloud' : 'bad';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

function startStallWatch() {
  if (stallTimer) return;
  stallTimer = setInterval(async () => {
    if (!state.wanted || !state.order || Date.now() - lastProgress < STALL_MS) return;
    const id = currentId(state.order);
    const why = await whyStuck(id);
    if (!state.order || currentId(state.order) !== id || Date.now() - lastProgress < STALL_MS) return;
    if (why === 'unreachable') {
      update({ trouble: 'Laptop not reachable' });
      return;
    }
    if (why === 'loading' && ++stuckProbes < MAX_STUCK_PROBES) {
      update({ trouble: 'Still trying to load this song…' });
      return;
    }
    skipBadSong(why === 'cloud' ? 'This song is cloud only now' : "Couldn't play this song");
  }, STALL_MS);
}

function skipBadSong(why: string) {
  badInARow++;
  stuckProbes = 0;
  if (badInARow >= MAX_BAD_IN_A_ROW) {
    stopForBadSongs();
    return;
  }
  const moved = state.order && nextInOrder(state.order, avoid());
  if (moved) {
    loadOrder(moved, 0, true);
    update({ note: `Skipped: ${why}` });
  } else {
    engine?.pause();
    update({ wanted: false, trouble: why });
  }
}

const canUseWindow = (index: number) => !!engine?.windowed && index >= 0 && index < track.length;

export const player = {
  /** A tap on a song in a list. During Sort it replaces the saved library spot, so the sort song keeps playing. */
  playList(serverUrl: string, list: PlayerSong[], startId: string, shuffle: boolean) {
    url = serverUrl;
    list.forEach((song) => songs.set(song.id, song));
    const ids = list.map((song) => song.id);
    const marks = { ...state.marks };
    ids.forEach((id) => delete marks[id]); // the list already holds my latest choices
    update({ marks });
    const order = startOrder(ids, startId, shuffle);
    if (state.sorting) saved = { order, at: 0 };
    else loadOrder(order, 0, true);
  },

  toggle() {
    if (!state.order) return;
    if (state.wanted) {
      engine?.pause();
      update({ wanted: false });
    } else {
      settleUntil = Date.now() + SETTLE_MS;
      engine?.play();
      update({ wanted: true, note: '' });
    }
  },

  pause() {
    engine?.pause();
    update({ wanted: false });
  },

  next() {
    if (!state.order) return;
    const moved = nextInOrder(state.order, avoid());
    if (!moved) {
      update({ note: 'Played every song in this list' });
      return;
    }
    badInARow = 0;
    if (engine?.windowed && canUseWindow(engine.index() + 1)) {
      settleUntil = Date.now() + SETTLE_MS;
      engine.next();
      engine.play();
      update({ wanted: true });
    } else {
      loadOrder(moved, 0, true);
    }
  },

  previous() {
    if (!state.order) return;
    const moved = previousInOrder(state.order);
    if (!moved) {
      engine?.seek(0).catch(() => {});
      return;
    }
    badInARow = 0;
    if (engine?.windowed && canUseWindow(engine.index() - 1)) {
      settleUntil = Date.now() + SETTLE_MS;
      engine.previous();
      engine.play();
      update({ wanted: true });
    } else {
      loadOrder(moved, 0, true);
    }
  },

  async seek(seconds: number) {
    try {
      await engine?.seek(seconds);
    } catch {
      // the song changed while seeking: nothing to do
    }
    lastProgress = Date.now();
    update({ time: seconds });
  },

  jump(id: string, at = 0) {
    if (!state.order) return;
    badInARow = 0;
    loadOrder(jumpTo(state.order, id), at, true);
  },

  setShuffleOn(on: boolean) {
    if (!state.order) return;
    const order = setShuffle(state.order, on);
    const index = engine?.windowed ? engine.index() : 0;
    // songs already played stay in the player: landing on one re-finds it in the new order
    track = track.map((one, i) => (i <= index ? { id: one.id, order: i === index ? order : null } : one));
    update({ order });
    replaceAhead(order, index);
  },

  tapMine() {
    const song = state.song;
    if (!song) return;
    const mark = markOf(song);
    const marks = { ...state.marks };
    if (mark.mine === 'mine' && mark.sorted) {
      addChange('mine_restore', song.id);
      if (marks[song.id]) delete marks[song.id];
      else marks[song.id] = { mine: 'unknown', sorted: false };
    } else {
      addChange('mine_set', song.id, 'mine');
      marks[song.id] = { mine: 'mine', sorted: true };
    }
    update({ marks });
  },

  tapNotMine() {
    const { song, order, time } = state;
    if (!song || !order) return;
    addChange('mine_set', song.id, 'not mine');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => update({ undo: null }), UNDO_MS);
    const undo: Undo = { order, id: song.id, title: song.title, at: time }; // the spot at the tap, not at the Undo
    const out = removeFromOrder(order);
    const marks = { ...state.marks, [song.id]: { mine: 'not mine', sorted: true } };
    update({ undo, marks, message: '' });
    const moved = nextInOrder(out, avoid());
    if (moved) {
      loadOrder(moved, 0, true);
    } else {
      engine?.pause();
      update({ order: out, wanted: false, note: 'No more songs in this list' });
    }
  },

  async tapUndo() {
    const undo = state.undo;
    if (!undo) return;
    clearTimeout(undoTimer);
    update({ undo: null });
    // the laptop has to take the undo now, or the song would come back here and vanish again from the list
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), UNDO_PROBE_MS);
    let reached = false;
    try {
      reached = (await fetch(`${url}/health`, { signal: abort.signal })).ok;
    } catch {
      // not reachable
    } finally {
      clearTimeout(timer);
    }
    if (!reached) {
      update({ message: 'Laptop not reachable, so this song stays Not mine. Restore it from Hidden later.' });
      undoTimer = setTimeout(() => update({ message: '' }), UNDO_MS);
      return;
    }
    addChange('mine_restore', undo.id);
    const { [undo.id]: _, ...marks } = state.marks;
    update({ marks });
    loadOrder(undo.order, undo.at, true);
  },

  /** Sort borrows the player: the library's song, second and order go on a stack, and the sort list gets its own order. */
  enterSort(serverUrl: string, list: PlayerSong[]) {
    url = serverUrl;
    if (!state.sorting && state.order) saved = { order: state.order, at: state.time };
    engine?.pause();
    list.forEach((song) => songs.set(song.id, song));
    state = { ...state, sorting: true };
    const ids = list.map((song) => song.id);
    if (ids.length) loadOrder(startOrder(ids, ids[0], false), 0, true);
    else update({ sorting: true });
  },

  /** Back to the library's song, at its spot, paused. If it was sorted away meanwhile, the next song in its place. */
  leaveSort() {
    if (!state.sorting) return;
    const spot = saved;
    saved = null;
    state = { ...state, sorting: false };
    engine?.setLoop(false);
    if (!spot) {
      engine?.stop();
      track = [];
      update({ order: null, song: null, wanted: false, time: 0, duration: 0, note: '', trouble: '', sheet: 'none' });
      return;
    }
    const gone = (id: string) => state.marks[id]?.mine === 'not mine';
    if (gone(currentId(spot.order))) {
      const moved = nextInOrder(removeFromOrder(spot.order), avoid());
      if (moved) loadOrder(moved, 0, false);
      else {
        engine?.stop();
        update({ order: null, song: null, wanted: false });
      }
      return;
    }
    loadOrder(spot.order, spot.at, false);
  },

  open: (sheet: Sheet) => update({ sheet }),

  toggleTimeLeft() {
    const file = timeLeftFile();
    if (state.timeLeft) file.delete();
    else file.create();
    update({ timeLeft: !state.timeLeft });
  },

  isMine: () => (state.song ? markOf(state.song).mine === 'mine' : false),
  isOut: () => (state.order ? state.order.removed.includes(currentId(state.order)) : false),
  titleOf,
  upNext: () => (state.order ? upNext(state.order, UP_NEXT_SHOWN, avoid()) : []),
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const usePlayer = () => useSyncExternalStore(subscribe, () => state);
