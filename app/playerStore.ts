// The one player, above every screen. Screens send it commands and read its state, so Back never touches the music.
// The song, its spot and its list are saved to the phone as they change, so the app reopens on the last song, paused.
import { setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useRef, useSyncExternalStore } from 'react';
import type { Voice } from './compareEngine';
import { createEngine, type Engine, type Sound } from './engine';
import type { FamilyEdit } from './family';
import { offline } from './offline';
import { addChange, addChanges } from './outbox';
import { note } from './pressLog';
import { timing, type Path } from './timings';
import { currentId, jumpTo, moveBy, shownLength, SORT_START_SEC, startSpot, moveInOrder, nextInOrder, playHere, previousInOrder, removeFromOrder, setFlag, setShuffle, startOrder, upNext, walkAhead, walkBack, type Order } from './playOrder';
import { isVersion, members, removeEditFor, sendEdit, showToast, songTitle, undo as undoVersions, type Sent } from './versionStore';

/** `length`: seconds, measured on the laptop (NEXT C), so the length shows at the tap; null or missing: not known yet. */
export type PlayerSong = { id: string; title: string; mine: string; sorted: boolean; length?: number | null };
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
export const NOT_HERE = "Not on this phone, and the laptop isn't reachable";
const AFTER_COMPARE_MS = 1500; // Done said play: if nothing moves by then, play again (wakes a sound that went quiet)
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
let loadTicket = 0; // each loadOrder's number: only the newest one reaches the sound
let startPoint = 0; // where a fresh song starts, in seconds: set by Sort and the tagging session
// Next/Previous taps sent through the queue with the start spot: the player's report of that move must not seek again
// The songs those taps went to, oldest first: a report naming one of them is ours (a lock-screen Next names another).
let ownMoves: string[] = [];
// Where the taps have taken the queue before the player reports it: a second fast tap moves on from there, not from the
// song the first tap left (fresh-eyes review 2026-11-08: two fast Nexts moved once, then reloaded slowly)
let ahead: Order | null = null;
let handOff: (() => void) | null = null; // Compare is handing the sound back: any tap finishes that first
const listeners = new Set<() => void>();

/** A tap mid hand-off: the queue's player takes the sound now, so the tap acts on the one sound. */
const settleHandOff = () => {
  const finish = handOff;
  handOff = null;
  finish?.();
};

// The eye switch, per song (DECISIONS 2026-11-07): a sorted song (Mine or Not mine) opens with the buttons hidden, an
// unsorted one with them showing; a flip by hand lasts until the next song. Compare never touches it, and Done landing
// on another version keeps the eye as it was (endCompare sets eyeFor first).
let eyeFor = '';
const sortedAlready = (song: PlayerSong) => {
  const mark = state.marks[song.id] ?? song;
  return mark.sorted && (mark.mine === 'mine' || mark.mine === 'not mine');
};

const update = (changes: Partial<State>) => {
  state = { ...state, ...changes };
  if (state.song && state.song.id !== eyeFor) {
    eyeFor = state.song.id;
    if (!state.comparing) state = { ...state, buttonsHidden: sortedAlready(state.song) };
  }
  listeners.forEach((listener) => listener());
};

// the phone's own copy first: no network, and it plays with the laptop off
const audioUrl = (id: string) => offline.uri(id) ?? `${url}/songs/${id}/audio`;
const cantReach = (id: string) => offline.reachable() === false && !offline.uri(id);
/** Where a song plays from, for its timing: the phone's copy and its file type, or the laptop's stream. */
const sourceOf = (id: string) => {
  const uri = offline.uri(id);
  return uri ? { src: 'phone' as const, ext: (uri.split('.').pop() ?? '').toLowerCase().slice(0, 5) } : { src: 'stream' as const, ext: '' };
};
/** A tap that starts this song: its timing starts now, under the path's own name. */
const tapFor = (path: Path, id: string) => timing.tap(path, sourceOf(id));
const titleOf = (id: string) => songs.get(id)?.title ?? '';
/** The laptop's measured length, 0 if not known. For showing only: the short-song rule waits for the phone's own. */
const storedLength = (id: string | undefined) => (id ? Math.max(songs.get(id)?.length ?? 0, 0) : 0);
const songNow = (order: Order) => songs.get(currentId(order)) ?? null;
const markOf = (song: PlayerSong): Mark => state.marks[song.id] ?? song;

// What shuffle avoids: the songs outside the pool, and every version that isn't its family's Main.
// With the laptop off, Next and shuffle also pass over songs that aren't on the phone.
const avoid = () => {
  const out = new Set<string>();
  songs.forEach((song) => {
    if ((markOf(song).mine === 'mine') !== (state.pool === 'mine') || isVersion(song.id) || cantReach(song.id)) out.add(song.id);
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

let restored = false; // the song on screen came back from the last launch, paused: its first Play is the restore path
let phoneLength = 0; // the phone's own length of the song playing (0: not loaded yet)
const newTrackStarted = () => {
  everLoaded = false;
  restored = false; // a song after the restored one: its Play is a plain Play
  phoneLength = 0;
  trackStarted = Date.now();
  stuckProbes = 0;
  lastProgress = Date.now();
  lastTime = -1;
};

let soundPlaying = false;
let timeStampedAt = 0;

function onSound(sound: Sound) {
  // the lock screen reads playing again on every change, so its button never lags a press behind (6.5: two presses).
  // In Compare too: it borrows this player, and the lock screen drives it (6.7)
  if (sound.playing !== soundPlaying) {
    soundPlaying = sound.playing;
    note(`Queue player: ${sound.playing ? 'playing' : 'paused'}${state.comparing ? ' (in Compare)' : ''}`);
    engine?.refreshLockScreen();
  }
  if (state.comparing) return; // paused and waiting: nothing it says counts
  if (sound.loaded) everLoaded = true;
  if (sound.duration > 0) phoneLength = sound.duration;
  if (timing.ready()) timing.send(url);
  // the song the player really holds (it may have moved on before saying so)
  const holding = engine?.windowed ? track[engine.index()]?.id : state.song?.id;
  const changes: Partial<State> = { time: sound.time, duration: shownLength(storedLength(holding), sound.duration) };
  timeStampedAt = Date.now();
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
    if (Date.now() < holdPausedUntil) {
      note('Player pauses it again (a song brought back paused)');
      engine?.pause();
    }
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
    loadOrder(moved, undefined, true);
    return;
  }
  update({ note: 'Played every song in this list', wanted: false });
  engine?.pause();
  engine?.seek(0).catch(() => {});
}

function onTrack(index: number) {
  if (state.comparing) return; // Compare loops this song and hides the lock screen's skips: nothing can move on
  const entry = track[index];
  if (!entry || !state.order) return;
  const stale = !entry.order;
  const order = entry.order ? { ...entry.order, removed: state.order.removed } : jumpTo(state.order, entry.id);
  if (currentId(order) === currentId(state.order) && order.at === state.order.at && !stale) return;
  // a song that failed without ever loading moves the player on by itself: several in a row means stop, never loop
  if (!everLoaded && Date.now() - trackStarted < FAILED_QUICKLY_MS) badInARow++;
  const at = ownMoves.indexOf(entry.id);
  const own = at >= 0;
  ownMoves = own ? ownMoves.slice(at + 1) : [];
  if (!own || !ownMoves.length) ahead = null;
  let restarted = false; // adding a song in front restarts this one from 0:00: it finds its spot again
  // the lock screen's Next or Previous (a song's own end is not a tap): timed from now, under its own name
  // the phone's own length (the shown one can be the laptop's, up to 2 s off) and reports come every 0.5 s. A song that
  // never loaded moved on by itself (a bad song): not a tap either
  const length = phoneLength || state.duration;
  const ended = !everLoaded || (length > 0 && state.time >= length - 2.5);
  if (!own && !ended) tapFor('lockscreen', entry.id);
  // play first: the silence and the start spot go to the player before the screen catches up
  if (startPoint > 0 && !own && index !== 0) engine?.startHere(startPoint);
  else if (startPoint <= 0 && !own) engine?.startHere(0);
  newTrackStarted();
  settleUntil = Date.now() + SETTLE_MS;
  // the start spot shows at once, never 0:00 first (the player is finding it)
  update({ order, song: songNow(order), time: startPoint, duration: storedLength(entry.id), note: '', trouble: '' });
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
      restarted = true;
    }
  }
  // the lock screen or a song's end moved on: the player began it at 0:00, so it goes silent and finds its start point.
  // A Next or Previous tap already did that on its way (skip), so its own report never seeks twice.
  if (startPoint > 0 && (index === 0 ? !own || restarted : restarted)) engine?.startHere(startPoint);
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
  engine?.abandonWait(); // a song that never loaded can't find its start point: the volume comes back
  engine?.pause();
  update({ wanted: false, trouble: "Several songs in a row wouldn't play, so it stopped" });
  badInARow = 0;
}

/** The path a Next or a Queue tap is timed under. */
const nextPath = (): Path => (state.sorting ? 'sort' : startPoint > 0 ? 'session' : 'library');
const ensureEngine = () => (engine ??= createEngine(ENGINE, { onSound, onTrack, onStarted: (stages) => timing.heard(stages) }));
let modeReady = false;
const ensureMode = () =>
  (modeSet ??= setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' })
    .catch(() => {})
    .finally(() => (modeReady = true)));

/** Starts this order from scratch. Restarts the sound, so ordinary moves between songs let the player do it instead.
 * `at` undefined: a fresh song, which starts at the mode's start point (session 0:15, Sort 0:30, else 0:00). */
function loadOrder(order: Order, asked: number | undefined, play: boolean) {
  const at = startSpot(asked, startPoint);
  settleHandOff();
  // the laptop is off and this song isn't on the phone: the next one that is, or say so at once, never a spinner
  if (cantReach(currentId(order))) {
    const moved = nextInOrder(order, avoid());
    if (moved && !cantReach(currentId(moved))) {
      loadOrder(moved, undefined, play);
      update({ note: `Skipped: ${titleOf(currentId(order))} isn't on this phone` });
      return;
    }
    engine?.pause();
    timing.cancel();
    update({ order, song: songNow(order), time: 0, duration: 0, wanted: false, note: '', trouble: NOT_HERE });
    return;
  }
  restored = false;
  newTrackStarted();
  ownMoves = []; // a fresh list: no move of the old one is still on its way
  ahead = null;
  settleUntil = play ? Date.now() + SETTLE_MS : 0;
  holdPausedUntil = play ? 0 : Date.now() + HOLD_PAUSED_MS;
  const id = currentId(order);
  const ticket = ++loadTicket;
  const toSound = (later: boolean) => {
    if (ticket !== loadTicket) return; // a newer load got there first
    // loaded later (the first song after launch): the same song, its order changed meanwhile (a restored session's Not
    // mine, a Queue drag), loads the order as it is now. Right away: this order (state still holds the last one)
    const now = later && state.order && currentId(state.order) === id ? state.order : order;
    const sound = ensureEngine();
    if (sound.windowed) {
      const behind = walkBack(now, BEHIND);
      const ahead = walkAhead(now, AHEAD, avoid());
      track = [...behind, now, ...ahead].map((one) => ({ id: currentId(one), order: one }));
      sound.load(track.map((one) => audioUrl(one.id)), behind.length, at, play);
    } else {
      sound.load([audioUrl(id)], 0, at, play);
    }
    sound.setLoop(state.sorting);
    sound.setTitle(titleOf(id));
  };
  // play first: once the audio mode is set (every load after the first), the sound is asked for before the screen
  // redraws, so no title, length or tag list sits in front of it
  if (modeReady) toSound(false);
  update({ order, song: songNow(order), time: at, duration: storedLength(id), wanted: play, note: '', trouble: '' });
  if (!state.sorting) heard(id);
  saveSpot(true);
  startStallWatch();
  if (!modeReady) ensureMode().finally(() => toSound(true));
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
    if (state.comparing || !state.wanted || !state.order || Date.now() - lastProgress < STALL_MS) return;
    const id = currentId(state.order);
    const why = await whyStuck(id);
    if (!state.order || currentId(state.order) !== id || Date.now() - lastProgress < STALL_MS) return;
    if (why === 'unreachable') {
      offline.setReachable(false);
      update({ trouble: 'Laptop not reachable' });
      return;
    }
    if (why === 'loading' && ++stuckProbes < MAX_STUCK_PROBES) {
      if (stuckProbes === 1) wake(); // a player left quiet by the sound shutting off under it plays again on a fresh Play
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
    loadOrder(moved, undefined, true);
    update({ note: `Skipped: ${why}` });
  } else {
    engine?.abandonWait();
    engine?.pause();
    update({ wanted: false, trouble: why });
  }
}

/** Pause and play again: a fresh Play turns the phone's sound back on if something switched it off. */
function wake() {
  engine?.pause();
  engine?.play();
}

const wakeIfQuiet = () => {
  if (state.comparing || !state.wanted || Date.now() - lastProgress < AFTER_COMPARE_MS) return;
  wake();
};

/** The queue holds this exact song one step away (a Not mine, a drag or a shuffle change can leave it holding another). */
const queueHolds = (step: 1 | -1, moved: Order) => {
  if (!engine?.windowed) return false;
  const index = engine.index() + step;
  return index >= 0 && index < track.length && track[index].id === currentId(moved);
};

/** One step through the player's own queue, where the song is already loaded: the fast path for Next, Previous and the
 * next Sort card. With a start point it stays silent until it gets there; the seek bar shows the spot at once. */
function stepQueue(step: 1 | -1, moved: Order) {
  settleUntil = Date.now() + SETTLE_MS;
  holdPausedUntil = 0;
  ownMoves.push(currentId(moved));
  ahead = moved;
  engine!.skip(step, startPoint);
  update({ wanted: true, time: startPoint, duration: storedLength(currentId(moved)) });
}

export const player = {
  /** A tap on a song in a list. During Sort it replaces the saved library spot, so the sort song keeps playing. */
  playList(serverUrl: string, list: PlayerSong[], startId: string, shuffle: boolean, pool: Pool = 'unsorted', at?: number, path: Path = 'library') {
    url = serverUrl;
    list.forEach((song) => songs.set(song.id, song));
    const ids = list.map((song) => song.id);
    const marks = { ...state.marks };
    ids.forEach((id) => delete marks[id]); // the list already holds my latest choices
    update({ marks, pool });
    const order = startOrder(ids, startId, shuffle);
    if (state.sorting) saved = { order, at: at ?? 0 };
    else {
      tapFor(path, currentId(order));
      loadOrder(order, at, true);
    }
  },

  toggle() {
    note(`Player: ${state.wanted ? 'Pause' : 'Play'} tap`);
    settleHandOff();
    if (!state.order || state.comparing) return;
    if (cantReach(currentId(state.order))) return update({ trouble: NOT_HERE });
    if (state.wanted) {
      timing.cancel(); // a tap still waiting for sound: paused, so no timing (a Play much later isn't its sound)
      engine?.pause();
      update({ wanted: false });
      saveSpot(true);
    } else {
      settleUntil = Date.now() + SETTLE_MS;
      holdPausedUntil = 0;
      if (restored) tapFor('restore', currentId(state.order));
      restored = false;
      engine?.play();
      update({ wanted: true, note: '' });
    }
  },

  pause() {
    settleHandOff();
    timing.cancel();
    engine?.pause();
    update({ wanted: false });
  },

  next() {
    settleHandOff();
    if (!state.order || state.comparing) return;
    const moved = nextInOrder(ahead ?? state.order, avoid());
    if (!moved) {
      update({ note: 'Played every song in this list' });
      return;
    }
    badInARow = 0;
    tapFor(nextPath(), currentId(moved));
    if (moveBy(startPoint, queueHolds(1, moved)) === 'queue') {
      stepQueue(1, moved);
    } else {
      loadOrder(moved, undefined, true);
    }
  },

  previous() {
    settleHandOff();
    if (!state.order || state.comparing) return;
    const moved = previousInOrder(ahead ?? state.order);
    if (!moved) {
      engine?.seek(0).catch(() => {});
      return;
    }
    badInARow = 0;
    tapFor('previous', currentId(moved));
    // landing on the queue's first song makes the player add one in front, which restarts it: a fresh load instead
    const landsFirst = !!engine?.windowed && engine.index() - 1 === 0 && !!previousInOrder(moved);
    if (!landsFirst && moveBy(startPoint, queueHolds(-1, moved)) === 'queue') {
      stepQueue(-1, moved);
    } else {
      loadOrder(moved, undefined, true);
    }
  },

  async seek(seconds: number) {
    settleHandOff();
    try {
      await engine?.seek(seconds, state.wanted); // a drag before the song has loaded waits and lands
    } catch {
      // the song changed while seeking: nothing to do
    }
    lastProgress = Date.now();
    update({ time: seconds });
  },

  /** `at` left out: the song's start point. */
  jump(id: string, at?: number) {
    if (!state.order) return;
    badInARow = 0;
    const moved = jumpTo(ahead ?? state.order, id);
    if (at === undefined) tapFor(nextPath(), id); // a fresh card or song: timed to first sound
    // the next Sort card is usually the queued song: the same fast path as Next
    if (at === undefined && !state.comparing && queueHolds(1, moved)) {
      settleHandOff();
      return stepQueue(1, moved);
    }
    loadOrder(moved, at, true);
  },

  /** The tagging session's Not mine: the song leaves the order (Next and Previous skip it) but plays on; Undo puts it back. */
  setOut(id: string, out: boolean) {
    if (!state.order) return;
    const was = state.order.removed;
    const removed = out ? (was.includes(id) ? was : [...was, id]) : was.filter((one) => one !== id);
    if (removed === was) return;
    const order = { ...state.order, removed };
    const index = engine?.windowed ? engine.index() : 0;
    track = track.map((one, i) => (i <= index ? { id: one.id, order: i === index ? order : null } : one));
    update({ order });
    replaceAhead(order, index);
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
    settleHandOff();
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
      loadOrder(moved, undefined, true);
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
    settleHandOff();
    url = serverUrl;
    if (!state.sorting && state.order) saved = { order: state.order, at: state.time };
    engine?.pause();
    list.forEach((song) => songs.set(song.id, song));
    state = { ...state, sorting: true };
    startPoint = SORT_START_SEC;
    const ids = list.map((song) => song.id);
    if (ids.length) loadOrder(startOrder(ids, ids[0], false), undefined, play);
    else update({ sorting: true });
  },

  /** Back to the library's song, at its spot, paused. If it was sorted away meanwhile, the next song in its place. */
  leaveSort() {
    if (!state.sorting) return;
    const spot = saved;
    saved = null;
    state = { ...state, sorting: false };
    startPoint = 0;
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
      if (moved) loadOrder(moved, undefined, false);
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
    const on = !state.timeLeft;
    try {
      setFlag(timeLeftFile(), on);
    } catch {
      // the file is only for the next launch: the switch still flips
    }
    update({ timeLeft: on });
  },

  toggleButtonsHidden() {
    const on = !state.buttonsHidden;
    try {
      setFlag(buttonsHiddenFile(), on);
    } catch {
      // the file is only for the next launch: the switch still flips
    }
    update({ buttonsHidden: on });
  },

  /** The two display settings, read again from their files (a restore after a reinstall just wrote them). */
  reloadSettings() {
    update({ timeLeft: timeLeftFile().exists, buttonsHidden: buttonsHiddenFile().exists });
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
    loadOrder(playHere(state.order, song.id), undefined, true);
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

  /** Where fresh songs start from now on, in seconds (the tagging session's 0:15; 0 to end it). */
  setStartPoint(seconds: number) {
    startPoint = seconds;
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
      restored = true;
    } catch {
      // nothing usable saved: start empty, as before
    }
  },

  /** Compare takes the sound. From the player, it borrows this player as it is: the song keeps playing, untouched,
   * and Compare lines the other versions up with it (`voice`). From Library, the queue pauses where it is and Done
   * brings its song back paused, the way leaving Sort does. Either way the queue's buttons do nothing meanwhile. */
  startCompare(fromLibrary: boolean): { at: number; play: boolean; voice: Voice | null } {
    settleHandOff();
    const out = { at: state.time, play: state.wanted };
    if (fromLibrary || !engine) {
      engine?.pause();
      engine?.releaseLockScreen();
      beforeCompare = fromLibrary ? { spot: state.order && { order: state.order, at: state.time } } : null;
      update({ comparing: true, wanted: false });
      return { ...out, voice: null };
    }
    beforeCompare = null;
    engine.setLoop(true); // the song's end comes back to Compare, never the next song
    engine.lockScreenSkips(false);
    update({ comparing: true, wanted: false });
    return { ...out, voice: engine.voice() };
  },

  /** The queue's player for Compare's wait, untouched: it keeps its own buttons until the dial shows. */
  voice: (): Voice | null => (engine && !state.sorting ? engine.voice() : null),
  position: () => ({ time: state.time, wanted: state.wanted }),
  /** The second playing right now: the last report plus the time since, while it plays (reports come in steps). */
  positionNow: () =>
    soundPlaying && state.duration ? Math.min(state.time + (Date.now() - timeStampedAt) / 1000, state.duration) : state.time,

  /** Compare names the version sounding on the lock screen while it borrows this player. */
  compareTitle(title: string) {
    engine?.setTitle(title);
  },

  /** Done in Compare. From the player: the version heard last plays on at that second, in the queue's spot. The
   * queue's own song: nothing to do, it never stopped. Another version: it loads here silently and this returns the
   * player, so Compare can hand over once it plays in line (`handing` finishes that early, on any tap).
   * From Library: the queue's song comes back, paused. */
  endCompare(serverUrl: string, song: PlayerSong | null, at: number, play: boolean, handing?: () => void): Voice | null {
    const back = beforeCompare;
    beforeCompare = null;
    update({ comparing: false });
    engine?.setLoop(state.sorting);
    engine?.lockScreenSkips(true);
    if (back) {
      if (back.spot) loadOrder(back.spot.order, back.spot.at, false);
      return null;
    }
    if (!song) return null;
    eyeFor = song.id; // the version Done lands on keeps the eye as it was before Compare
    url = serverUrl;
    songs.set(song.id, song);
    newTrackStarted();
    if (play) setTimeout(wakeIfQuiet, AFTER_COMPARE_MS);
    if (state.order && currentId(state.order) === song.id) {
      settleUntil = play ? Date.now() + SETTLE_MS : 0;
      holdPausedUntil = 0;
      engine?.setTitle(titleOf(song.id));
      update({ time: at, wanted: play });
      return null;
    }
    const order = state.order ? playHere(state.order, song.id) : startOrder([song.id], song.id, false);
    badInARow = 0;
    const voice = engine && handing ? engine.voice() : null;
    if (voice) voice.volume = 0; // silent until it plays in line with Compare's
    loadOrder(order, at, play);
    if (!voice) return null;
    if (!state.order || currentId(state.order) !== song.id) {
      voice.volume = 1; // it went to another song (not on this phone): no hand-over
      return null;
    }
    handOff = handing!;
    return voice;
  },

  /** Compare has let go of the sound. */
  handedBack() {
    handOff = null;
  },

  isSorting: () => state.sorting,
  isMine: () => (state.song ? markOf(state.song).mine === 'mine' : false),
  /** The player as it is now, for code outside React. */
  now: () => state,
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

/** Only some of the player, for a screen that mustn't redraw on every tick (Library: 1,395 rows under the player). It
 * redraws only when one of the picked values changes. */
export function usePlayerWith<T extends readonly unknown[]>(pick: (now: State) => T): T {
  const last = useRef<T | null>(null);
  return useSyncExternalStore(subscribe, () => {
    const next = pick(state);
    const was = last.current;
    if (was && was.length === next.length && was.every((one, i) => one === next[i])) return was;
    last.current = next;
    return next;
  });
}

/** Any change to the player, for code outside React (Compare's wait watches for the song changing). */
export const onPlayerChange = subscribe;
