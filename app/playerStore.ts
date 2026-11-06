// The one player, above every screen. Screens send it commands and read its state, so Back never touches the music.
// The song, its spot and its list are saved to the phone as they change, so the app reopens on the last song, paused.
import { setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { createEngine, type Engine, type Sound } from './engine';
import type { FamilyEdit } from './family';
import { addChange, addChanges } from './outbox';
import { currentId, jumpTo, moveInOrder, nextInOrder, playHere, previousInOrder, removeFromOrder, setShuffle, startOrder, upNext, walkAhead, walkBack, type Order } from './playOrder';
import { isVersion, members, removeEditFor, sendEdit, showToast, songTitle, undo as undoVersions, type Sent } from './versionStore';

export type PlayerSong = { id: string; title: string; mine: string; sorted: boolean };
type Mark = { mine: string; sorted: boolean };
type Undo = { order: Order; id: string; title: string; at: number; family: Sent | null };
type Spot = { order: Order; at: number };
export type Sheet = 'none' | 'player' | 'queue';
/** What a shuffle plays: songs not yet called mine, or only Mine. */
export type Pool = 'unsorted' | 'mine';

// Swap to 'single' if the playlist player fails on the phone: the bar and everything else keep working.
const ENGINE = 'playlist';
const BEHIND = 2;
const AHEAD = 3;
const STALL_MS = 10000;
const PROBE_TIMEOUT_MS = 5000;
const UNDO_MS = 5000;
const UNDO_PROBE_MS = 3000;
const SETTLE_MS = 2000; // a song just told to play can look paused for this long
// a song brought back paused can still send a "playing" from the song before it: that never counts as a Play tap
const HOLD_PAUSED_MS = 3000;
const AFTER_CLOSE_MS = 900;
const MAX_BAD_IN_A_ROW = 3;
const MAX_STUCK_PROBES = 3;
const FAILED_QUICKLY_MS = 3000;
const UP_NEXT_SHOWN = 200;
const NOT_MINE_GUARD_MS = 500; // the next song arrives under the same thumb, so a double tap can't hide two

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
  /** Where Queue was opened from, so closing it goes back there. */
  queueFrom: 'none' | 'player';
  timeLeft: boolean;
  buttonsHidden: boolean;
  marks: Record<string, Mark>;
  pool: Pool;
  /** Compare has the sound: the queue's player waits, paused, and its buttons do nothing. */
  comparing: boolean;
};

const timeLeftFile = () => new File(Paths.document, 'time-left.txt');
const lastPlayFile = () => new File(Paths.document, 'last-play.json');
const SAVE_EVERY_MS = 15000;
const RECENT_KEPT = 30;
const buttonsHiddenFile = () => new File(Paths.document, 'buttons-hidden.txt');

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
  queueFrom: 'none',
  timeLeft: timeLeftFile().exists,
  buttonsHidden: buttonsHiddenFile().exists,
  marks: {},
  pool: 'unsorted',
  comparing: false,
};
let url = '';
const songs = new Map<string, PlayerSong>();
let saved: Spot | null = null; // the library's place while Sort has the player
let beforeCompare: { spot: Spot | null } | null = null; // the queue's place while a Compare from Library has the sound
let engine: Engine | null = null;
let modeSet: Promise<unknown> | null = null;
let track: { id: string; order: Order | null }[] = []; // what the playlist player holds, one per position; null: chosen before a shuffle change
let settleUntil = 0;
let holdPausedUntil = 0;
let afterClose: (() => void) | null = null;
let lastProgress = 0;
let lastTime = -1;
let badInARow = 0;
let stuckProbes = 0;
let everLoaded = false;
let trackStarted = 0;
let lastNotMine = 0;
let lastSaved = 0;
let recent: string[] = []; // songs heard lately, newest first: the picker's best clue
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

// What shuffle avoids: the songs outside the pool, and every version that isn't its family's Main.
const avoid = () => {
  const out = new Set<string>();
  songs.forEach((song) => {
    if ((markOf(song).mine === 'mine') !== (state.pool === 'mine') || isVersion(song.id)) out.add(song.id);
  });
  return out;
};

const heard = (id: string) => {
  recent = [id, ...recent.filter((one) => one !== id)].slice(0, RECENT_KEPT);
};

/** The library's song and spot (Sort's own songs are never the ones kept), so a reopen starts there, paused. */
function saveSpot(force = false) {
  if (!force && Date.now() - lastSaved < SAVE_EVERY_MS) return;
  lastSaved = Date.now();
  const spot = state.sorting ? saved : state.order && { order: state.order, at: state.time };
  try {
    const file = lastPlayFile();
    if (!spot) {
      if (file.exists) file.delete();
      return;
    }
    const kept = spot.order.list.map((id) => songs.get(id)).filter((song): song is PlayerSong => !!song);
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify({ url, order: spot.order, at: spot.at, pool: state.pool, songs: kept }));
  } catch {
    // a full phone or a bad file: the next save tries again
  }
}

const newTrackStarted = () => {
  everLoaded = false;
  trackStarted = Date.now();
  stuckProbes = 0;
  lastProgress = Date.now();
  lastTime = -1;
};

function onSound(sound: Sound) {
  if (state.comparing) return; // paused and waiting: nothing it says counts
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
  if (sound.playing && !state.wanted) {
    if (Date.now() < holdPausedUntil) engine?.pause();
    else changes.wanted = true;
  }
  else if (!sound.playing && !sound.buffering && sound.loaded && state.wanted && Date.now() > settleUntil) changes.wanted = false;
  update(changes);
  if (sound.playing) saveSpot();
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
  if (!state.sorting) heard(entry.id);
  saveSpot(true);
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
  holdPausedUntil = play ? 0 : Date.now() + HOLD_PAUSED_MS;
  const id = currentId(order);
  update({ order, song: songNow(order), time: at, duration: 0, wanted: play, note: '', trouble: '' });
  if (!state.sorting) heard(id);
  saveSpot(true);
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
  playList(serverUrl: string, list: PlayerSong[], startId: string, shuffle: boolean, pool: Pool = 'unsorted') {
    url = serverUrl;
    list.forEach((song) => songs.set(song.id, song));
    const ids = list.map((song) => song.id);
    const marks = { ...state.marks };
    ids.forEach((id) => delete marks[id]); // the list already holds my latest choices
    update({ marks, pool });
    const order = startOrder(ids, startId, shuffle);
    if (state.sorting) saved = { order, at: 0 };
    else loadOrder(order, 0, true);
  },

  toggle() {
    if (!state.order || state.comparing) return;
    if (state.wanted) {
      engine?.pause();
      update({ wanted: false });
      saveSpot(true);
    } else {
      settleUntil = Date.now() + SETTLE_MS;
      holdPausedUntil = 0;
      engine?.play();
      update({ wanted: true, note: '' });
    }
  },

  pause() {
    engine?.pause();
    update({ wanted: false });
  },

  next() {
    if (!state.order || state.comparing) return;
    const moved = nextInOrder(state.order, avoid());
    if (!moved) {
      update({ note: 'Played every song in this list' });
      return;
    }
    badInARow = 0;
    if (engine?.windowed && canUseWindow(engine.index() + 1)) {
      settleUntil = Date.now() + SETTLE_MS;
      holdPausedUntil = 0;
      engine.next();
      engine.play();
      update({ wanted: true });
    } else {
      loadOrder(moved, 0, true);
    }
  },

  previous() {
    if (!state.order || state.comparing) return;
    const moved = previousInOrder(state.order);
    if (!moved) {
      engine?.seek(0).catch(() => {});
      return;
    }
    badInARow = 0;
    if (engine?.windowed && canUseWindow(engine.index() - 1)) {
      settleUntil = Date.now() + SETTLE_MS;
      holdPausedUntil = 0;
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

  setShuffleOn(on: boolean, pool: Pool = state.pool) {
    if (!state.order) return;
    const order = setShuffle(state.order, on);
    state = { ...state, pool };
    const index = engine?.windowed ? engine.index() : 0;
    // songs already played stay in the player: landing on one re-finds it in the new order
    track = track.map((one, i) => (i <= index ? { id: one.id, order: i === index ? order : null } : one));
    update({ order });
    replaceAhead(order, index);
  },

  /** A dragged Up next row, applied to the order as it is now: a song may have ended during the drag. Never touches the sound. */
  moveUpNext(id: string, afterId: string | null) {
    if (!state.order) return;
    const moved = moveInOrder(state.order, id, afterId);
    if (moved === state.order) return;
    const index = engine?.windowed ? engine.index() : 0;
    // the player may be on a new song it hasn't announced yet: what it holds is what's really playing
    const held = engine?.windowed ? track[index]?.id : undefined;
    const order = held && held !== currentId(moved) ? jumpTo(moved, held) : moved;
    // every order the player holds is from before the drag: landing on one would undo it, so they all re-find their song
    track = track.map((one, i) => (i <= index ? { id: one.id, order: i === index ? order : null } : one));
    update({ order, song: songNow(order) });
    replaceAhead(order, index);
  },

  tapMine() {
    const song = state.song;
    if (!song) return;
    const mark = markOf(song);
    const marks = { ...state.marks };
    if (mark.mine === 'mine' && mark.sorted) {
      if (members(song.id).length > 1) {
        player.showMessage('This song has versions: remove it from Versions first.');
        return;
      }
      addChange('mine_restore', song.id);
      if (marks[song.id]) delete marks[song.id];
      else marks[song.id] = { mine: 'unknown', sorted: false };
    } else {
      addChange('mine_set', song.id, 'mine');
      marks[song.id] = { mine: 'mine', sorted: true };
    }
    update({ marks });
  },

  /** Verdicts from Sort, sent together. Kept here too, so shuffle and the library's spot see them at once. */
  judge(list: PlayerSong[], value: 'mine' | 'not mine') {
    addChanges(list.map((song) => ({ kind: 'mine_set' as const, songId: song.id, value })));
    const marks = { ...state.marks };
    list.forEach((song) => (marks[song.id] = { mine: value, sorted: true }));
    update({ marks });
  },

  /** Undo for those: each song goes back to what it was before. */
  unjudge(list: PlayerSong[]) {
    addChanges(list.map((song) => ({ kind: 'mine_restore' as const, songId: song.id })));
    const marks = { ...state.marks };
    list.forEach((song) => (marks[song.id] = { mine: song.mine, sorted: false }));
    update({ marks });
  },

  tapNotMine() {
    const { song, order, time } = state;
    if (!song || !order || Date.now() - lastNotMine < NOT_MINE_GUARD_MS) return;
    // a Main with several versions needs a new Main first; with one other, that one simply becomes a plain song
    const family = members(song.id);
    if (family[0] === song.id && family.length > 2) {
      player.showMessage(`This is the Main of ${family.length} versions: make another one Main first (Versions).`);
      return;
    }
    lastNotMine = Date.now();
    const edit: FamilyEdit | null = family.length > 1 ? removeEditFor(song.id) : null;
    const sent = edit ? sendEdit(edit, song.id) : null; // out of the family first: the laptop refuses a hidden version
    addChange('mine_set', song.id, 'not mine');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => update({ undo: null }), UNDO_MS);
    const undo: Undo = { order, id: song.id, title: song.title, at: time, family: sent }; // the spot at the tap, not at the Undo
    if (family[0] === song.id && family.length === 2) showToast({ text: `${songTitle(family[1])} now plays in shuffle` });
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
    if (undo.family) undoVersions(undo.family); // back into its family, once it's Mine again
    const { [undo.id]: _, ...marks } = state.marks;
    update({ marks });
    // same list: keep what changed since the tap, such as a Queue drag. Another list: back to the saved one.
    const now = state.order;
    const order = now && now.list === undo.order.list
      ? jumpTo({ ...now, removed: now.removed.filter((id) => id !== undo.id) }, undo.id)
      : undo.order;
    loadOrder(order, undo.at, true);
  },

  /** Sort borrows the player: the library's song, second and order go on a stack, and the sort list gets its own order. */
  enterSort(serverUrl: string, list: PlayerSong[], play = true) {
    url = serverUrl;
    if (!state.sorting && state.order) saved = { order: state.order, at: state.time };
    engine?.pause();
    list.forEach((song) => songs.set(song.id, song));
    state = { ...state, sorting: true };
    const ids = list.map((song) => song.id);
    if (ids.length) loadOrder(startOrder(ids, ids[0], false), 0, play);
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

  open(sheet: Sheet) {
    if (sheet === 'queue' && state.sheet !== 'queue') update({ sheet, queueFrom: state.sheet === 'player' ? 'player' : 'none' });
    else update({ sheet });
  },

  closeQueue: () => update({ sheet: state.queueFrom }),

  /** Closes the player sheet, then runs `then` once it has gone: iOS can't open another sheet over one still closing. */
  closeThen(then: () => void) {
    if (state.sheet === 'none') return then();
    afterClose = then;
    update({ sheet: 'none' });
    setTimeout(() => player.runAfterClose(), AFTER_CLOSE_MS); // in case the sheet never says it's gone
  },
  runAfterClose() {
    const then = afterClose;
    afterClose = null;
    then?.();
  },

  toggleTimeLeft() {
    const file = timeLeftFile();
    if (state.timeLeft) file.delete();
    else file.create();
    update({ timeLeft: !state.timeLeft });
  },

  toggleButtonsHidden() {
    const file = buttonsHiddenFile();
    if (state.buttonsHidden) file.delete();
    else file.create();
    update({ buttonsHidden: !state.buttonsHidden });
  },

  /** A version from the Versions view: plays now, and what came after it stays as it was. */
  playNow(serverUrl: string, song: PlayerSong) {
    url = serverUrl;
    songs.set(song.id, song);
    if (state.sorting) return;
    if (!state.order) {
      player.playList(serverUrl, [song], song.id, false);
      return;
    }
    badInARow = 0;
    loadOrder(playHere(state.order, song.id), 0, true);
  },

  /** Sets or clears my mark on a song from outside the player (a link made it Mine). */
  setMark(id: string, mark: Mark | null) {
    const marks = { ...state.marks };
    if (mark) marks[id] = mark;
    else delete marks[id];
    update({ marks });
  },

  markOf: (song: PlayerSong) => markOf(song),
  current: () => state.song,
  url: () => url,
  recent: () => recent,

  showMessage(text: string) {
    clearTimeout(undoTimer);
    update({ message: text, undo: null });
    undoTimer = setTimeout(() => update({ message: '' }), UNDO_MS);
  },

  /** Saves the spot now: the app is going to the background and may be closed there. */
  saveNow: () => saveSpot(true),

  /** On launch: the last library song back in the bar, at its spot, paused. Its list and shuffle come back too. */
  restore(serverUrl: string) {
    if (state.order) return;
    try {
      const file = lastPlayFile();
      if (!file.exists) return;
      const last: { url: string; order: Order; at: number; pool: Pool; songs: PlayerSong[] } = JSON.parse(file.textSync());
      if (!last.order?.sequence?.length || !last.songs?.length) return;
      url = serverUrl || last.url;
      last.songs.forEach((song) => songs.set(song.id, song));
      if (!songs.has(currentId(last.order))) return;
      update({ pool: last.pool ?? 'unsorted' });
      loadOrder(last.order, last.at ?? 0, false);
    } catch {
      // nothing usable saved: start empty, as before
    }
  },

  /** Compare takes the sound. The queue pauses where it is; what was playing and where are handed to Compare.
   * `fromLibrary`: Done brings the queue's song back paused, the way leaving Sort does. */
  startCompare(fromLibrary: boolean) {
    const out = { id: state.song?.id ?? null, at: state.time, play: state.wanted };
    engine?.pause();
    engine?.releaseLockScreen();
    beforeCompare = fromLibrary ? { spot: state.order && { order: state.order, at: state.time } } : null;
    update({ comparing: true, wanted: false });
    return out;
  },

  /** Done in Compare. From the player: the version heard last plays on at that second, in the queue's spot
   * (the queue is untouched if it was the queue's song). From Library: the queue's song comes back, paused. */
  endCompare(serverUrl: string, song: PlayerSong | null, at: number, play: boolean) {
    const back = beforeCompare;
    beforeCompare = null;
    update({ comparing: false });
    if (back) {
      if (back.spot) loadOrder(back.spot.order, back.spot.at, false);
      return;
    }
    if (!song) return;
    url = serverUrl;
    songs.set(song.id, song);
    if (state.order && currentId(state.order) === song.id) {
      newTrackStarted();
      settleUntil = play ? Date.now() + SETTLE_MS : 0;
      holdPausedUntil = play ? 0 : Date.now() + HOLD_PAUSED_MS;
      engine?.setTitle(titleOf(song.id));
      engine?.seek(at).catch(() => {}).finally(() => {
        if (play && !state.comparing) engine?.play();
      });
      update({ time: at, wanted: play });
      return;
    }
    if (!state.order) {
      const order = startOrder([song.id], song.id, false);
      loadOrder(order, at, play);
      return;
    }
    badInARow = 0;
    loadOrder(playHere(state.order, song.id), at, play);
  },

  isSorting: () => state.sorting,
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
