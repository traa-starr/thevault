// The playlist player's logic, with the real player passed in, so a test can hand it a fake one and listen for the
// order of seek and play. engine.ts makes the real expo-audio playlist and gives it here. No phone imports in this file.
import type { Voice } from './compareEngine';

export type Sound = { time: number; duration: number; playing: boolean; buffering: boolean; loaded: boolean; finished: boolean };
/** Where a start's time went, in ms (NEXT 2026-11-08 "play first"): waiting for iOS to say the song is loaded, finding the
 * start spot (both seeks if it had to try twice), and from play to the time really moving on with the volume up. */
export type Started = { load: number; seek: number; reseek: boolean; start: number };
/** `onStarted`: sound is really coming out now, at the spot asked for (the moment a timing stops). */
export type Handlers = { onSound: (sound: Sound) => void; onTrack: (index: number) => void; onStarted?: (stages: Started) => void };
/** Time, passed in so a test can run a pretend clock. */
export type Clock = { now: () => number; later: (ms: number, fn: () => void) => void };
export const realClock: Clock = { now: () => Date.now(), later: (ms, fn) => void setTimeout(fn, ms) };

// iOS only reports while a song plays (every 0.5 s), so "loaded" is asked for directly this often instead of waiting
const POLL_MS = 25;
const POLL_FOR_MS = 5000; // then the reports alone (a song that never loads is the stall watch's job)
const HEAR_FOR_MS = 15000; // play pressed but the time never moved: no timing (as long as the phone keeps a tap)
// a seek landing this close is kept: a second seek costs a whole seek again. A seek lost to the song change lands near 0:00
const RESEEK_OFF_SEC = 3;

export type Engine = {
  /** True if it holds a list and moves through it by itself, while locked too. False: it holds one song at a time. */
  windowed: boolean;
  /** Replaces everything and goes to `index`. With `at`, seeks there once loaded and only then starts: nothing plays before. */
  load: (uris: string[], index: number, at: number, play: boolean) => void;
  /** The player moved to a new song on its own (lock screen, song end): silent until it reaches `at`, then plays on. */
  startHere: (at: number) => void;
  /** Gives up a start spot still waiting (the song never loaded): the volume comes back. */
  abandonWait: () => void;
  add: (uri: string) => void;
  /** Adds behind the first song. Restarts the current song, so only use it right after moving to one. */
  addInFront: (uri: string) => void;
  /** Drops what's ahead without touching the current song. */
  dropAhead: () => void;
  index: () => number;
  next: () => void;
  previous: () => void;
  /** Next (1) or Previous (-1) through the player's own queue, where the next song is already loaded. With `at` above 0
   * it goes silent first, moves, finds `at`, then plays and gives the volume back: nothing is heard before the spot. */
  skip: (step: 1 | -1, at: number) => void;
  play: () => void;
  pause: () => void;
  /** `play`: whether it should play once there, for a song not loaded yet (the seek waits for it, never lost). */
  seek: (seconds: number, play?: boolean) => Promise<void>;
  setLoop: (loop: boolean) => void;
  setTitle: (title: string) => void;
  /** Lets go of the lock screen for Compare. The next setTitle takes it back. */
  releaseLockScreen: () => void;
  /** Hides Next and Previous on the lock screen while Compare borrows this player, so it can't move on. */
  lockScreenSkips: (show: boolean) => void;
  /** Playing changed: the lock screen reads it again, so its button shows the truth and the next press does the right thing. */
  refreshLockScreen: () => void;
  /** This player as Compare sees it: Compare sets its volume and moves it along with the other versions. */
  voice: () => Voice;
  stop: () => void;
  /** Nobody is looking (locked or in the background): the player reports its progress less often, to save battery.
   * While a song is still finding its start spot it reports at full rate all the same. */
  setQuiet: (quiet: boolean) => void;
};

/** How often the player reports its progress: once a second on screen (the clock shows whole seconds; it was twice a
 * second until 2026-11-11, 120 wake-ups a minute before anything else happened), every 2 s locked or in the
 * background (each report wakes the app, and nobody is watching the clock), and twice a second only while a song is
 * finding its start spot. Changing the rate needs the build of 2026-11-10 or later. */
export const REPORT_MS = { open: 1000, locked: 2000, finding: 500 } as const;

export type Raw = { currentTime: number; duration: number; isLoaded: boolean; isBuffering: boolean; playing: boolean; volume: number };
type Status = { currentTime: number; duration: number; playing: boolean; isBuffering: boolean; isLoaded: boolean; didJustFinish: boolean };
type LockOptions = { showNextTrack: boolean; showPreviousTrack: boolean };

/** The parts of expo-audio's AudioPlaylist this uses. */
export type List = Raw & {
  readonly currentIndex: number;
  readonly trackCount: number;
  loop: string;
  add(source: { uri: string }): void;
  insert(source: { uri: string }, index: number): void;
  remove(index: number): void;
  clear(): void;
  skipTo(index: number): void;
  /** Only in builds from 2026-11-10 on (a patch on expo-audio): older builds keep the rate they were made with. */
  setUpdateInterval?(milliseconds: number): void;
  next(): void;
  previous(): void;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  setActiveForLockScreen(active: boolean, metadata: { title: string }, options: LockOptions): void;
  clearLockScreenControls(): void;
  addListener(event: 'playlistStatusUpdate', listener: (status: Status) => void): unknown;
  addListener(event: 'trackChanged', listener: () => void): unknown;
};

/** `muted`: the player had already started this song from 0:00 by itself, so it stays silent until the seek lands. */
export type Waiting = { at: number; play: boolean; seeking: boolean; muted: number | null; retried?: boolean; since: number; loadedAt?: number; seekMs: number; pollFrom?: number };

/** A song shorter than its start point starts at 0:00. Length not known yet: the spot stands. */
export const clampStart = (at: number, duration: number) => (duration > 0 && at >= duration ? 0 : at);

const LOCK_SCREEN = { showNextTrack: true, showPreviousTrack: true };
const NO_SKIPS = { showNextTrack: false, showPreviousTrack: false };

/** A paused song still waiting to seek reads as loading, so Compare doesn't line it up or flip to it too early. */
export const voiceOf = (raw: Raw, waiting: () => Waiting | null, engine: Pick<Engine, 'play' | 'pause' | 'seek'>): Voice => ({
  get currentTime() {
    return waiting()?.at ?? raw.currentTime;
  },
  get duration() {
    return raw.duration;
  },
  get isLoaded() {
    return raw.isLoaded;
  },
  get isBuffering() {
    return raw.isBuffering || !!waiting();
  },
  get playing() {
    return raw.playing;
  },
  get volume() {
    const held = waiting();
    return held && held.muted !== null ? held.muted : raw.volume;
  },
  set volume(level: number) {
    // silent while finding its start spot: Compare's level is the one given back when it gets there
    const held = waiting();
    if (held && held.muted !== null) held.muted = level;
    else raw.volume = level;
  },
  play: () => engine.play(),
  pause: () => engine.pause(),
  seekTo: (seconds: number) => engine.seek(seconds),
});

/** Seeking before a song has loaded can be lost, so a start spot waits until the player says it's loaded, then seeks,
 * and only then plays. Past a short song's end it starts at 0:00 instead. Shared by both players.
 * "Loaded" is asked for every 25 ms, never left to the next report. `listen` times a start with no spot to find. */
export function startGate(
  raw: Pick<Raw, 'isLoaded' | 'duration' | 'volume' | 'currentTime' | 'playing'> & { seekTo(s: number): Promise<void>; play(): void },
  onStarted?: (stages: Started) => void,
  clock: Clock = realClock,
) {
  let waiting: Waiting | null = null;
  let hearing: object | null = null; // the newest play, until its sound is heard
  // sound counts once the time moves on, playing, volume up: a muted or stuck start never counts
  const hear = (since: number, seekMs: number, reseek: boolean, loadedAt?: number) => {
    const token = {};
    hearing = token;
    const from = raw.currentTime;
    const began = clock.now();
    let loaded = loadedAt;
    const check = () => {
      if (hearing !== token) return;
      if (loaded === undefined && raw.isLoaded) loaded = clock.now();
      if (raw.playing && raw.volume > 0 && raw.currentTime > from + 0.01) {
        hearing = null;
        const now = clock.now();
        return onStarted?.({ load: (loaded ?? now) - since, seek: seekMs, reseek, start: now - Math.max(began, loaded ?? began) });
      }
      if (clock.now() - began < HEAR_FOR_MS) clock.later(POLL_MS, check);
      else hearing = null;
    };
    check();
  };
  const finish = (held: Waiting) => {
    waiting = null;
    if (held.muted !== null) raw.volume = held.muted;
    if (held.play) {
      raw.play();
      hear(held.since, held.seekMs, !!held.retried, held.loadedAt);
    }
  };
  const settle = () => {
    const held = waiting;
    if (!held || held.seeking || !raw.isLoaded) return;
    held.seeking = true;
    held.loadedAt ??= clock.now();
    held.at = clampStart(held.at, raw.duration);
    const seekFrom = clock.now();
    raw.seekTo(held.at).catch(() => {}).finally(() => {
      if (waiting !== held) return; // another song was loaded meanwhile
      held.seekMs += clock.now() - seekFrom;
      // a seek sent the instant the song changed can be lost (the player was still on the last song): once more.
      // Only when it really missed: a near landing plays, a second seek would cost a whole seek again
      const off = Math.abs(raw.currentTime - held.at);
      if (!held.retried && off > Math.min(RESEEK_OFF_SEC, Math.max(1, held.at / 2))) {
        held.retried = true;
        held.seeking = false;
        return settle();
      }
      finish(held);
    });
  };
  const poll = (held: Waiting) => {
    if (waiting !== held || held.seeking) return;
    settle();
    if (waiting === held && !held.seeking && clock.now() - (held.pollFrom ?? held.since) < POLL_FOR_MS) clock.later(POLL_MS, () => poll(held));
  };
  return {
    now: () => waiting,
    settle,
    /** Waits for `at`. `muted`: the volume to give back once there (the sound is silenced meanwhile). */
    hold(at: number, play: boolean, muted: number | null = null) {
      const before = waiting;
      // a mute still pending from the song before keeps its volume to give back, never the silence
      const giveBack = before?.muted ?? muted;
      hearing = null;
      waiting = { at, play, seeking: false, muted: giveBack, since: clock.now(), seekMs: 0 };
      poll(waiting);
    },
    /** Play pressed on a song still waiting to load (the checks may have stopped): ask again, so Play is never dead. */
    kick() {
      const held = waiting;
      if (!held || held.seeking) return;
      held.pollFrom = clock.now();
      poll(held);
    },
    /** Play was just pressed with no spot to find: timed to the first real sound. */
    listen() {
      hear(clock.now(), 0, false);
    },
    /** Dropped: a new list, or no start spot. Gives a held-back volume back. */
    drop() {
      if (waiting?.muted != null) raw.volume = waiting.muted;
      waiting = null;
      hearing = null;
    },
  };
}

export function playlistEngine(list: List, { onSound, onTrack, onStarted }: Handlers, clock: Clock = realClock): Engine {
  let locked = false;
  let shownTitle = '';
  let skips = LOCK_SCREEN;
  const gate = startGate(list, onStarted, clock);
  // Always the full call, never updateLockScreenMetadata: that one blanks the lock screen before refilling it, and does
  // nothing at all once another player took the lock screen (Compare from Library) while we still think we hold it.
  const claim = () => {
    list.setActiveForLockScreen(true, { title: shownTitle }, skips);
    locked = true;
  };

  // Reads the player's live answer in settle: an event can be from before.
  let quiet = false;
  let every: number = REPORT_MS.open;
  /** Sets the report rate to what fits now. Called after anything that can change it. */
  const pace = () => {
    const want = gate.now() ? REPORT_MS.finding : quiet ? REPORT_MS.locked : REPORT_MS.open;
    if (want === every || typeof list.setUpdateInterval !== 'function') return;
    every = want;
    list.setUpdateInterval(want);
  };
  list.addListener('playlistStatusUpdate', (status) => {
    gate.settle();
    pace(); // the start spot was found: back to the screen's rate, or the slow one if nobody is looking
    const waiting = gate.now();
    onSound({
      time: waiting ? waiting.at : status.currentTime,
      duration: status.duration,
      playing: status.playing,
      buffering: status.isBuffering || !!waiting?.play, // a paused song waiting to seek isn't loading anything
      loaded: status.isLoaded,
      finished: status.didJustFinish,
    });
  });
  list.addListener('trackChanged', () => onTrack(list.currentIndex)); // live index: the event may be from before a load

  const engine: Engine = {
    windowed: true,
    load: (uris, index, at, play) => {
      gate.drop();
      list.clear();
      uris.forEach((uri) => list.add({ uri }));
      if (index > 0) list.skipTo(index);
      if (at > 0) gate.hold(at, play);
      else if (play) {
        list.play();
        gate.listen();
      }
    },
    startHere: (at) => {
      if (at <= 0) {
        if (list.playing) gate.listen(); // the lock screen moved on, no spot to find: timed all the same
        return;
      }
      // already started from 0:00 by the player: silent first, then paused, so the first thing heard is the spot
      const volume = list.volume;
      // paused when the lock screen's Next came: stays paused. A second Next while still silent keeps the first one's wish
      const pending = gate.now();
      const play = pending && pending.muted !== null ? pending.play : list.playing;
      list.volume = 0;
      list.pause();
      gate.hold(at, play, volume);
    },
    abandonWait: () => gate.drop(),
    add: (uri) => list.add({ uri }),
    addInFront: (uri) => list.insert({ uri }, 0),
    dropAhead: () => {
      for (let i = list.trackCount - 1; i > list.currentIndex; i--) list.remove(i);
    },
    index: () => list.currentIndex,
    next: () => list.next(),
    previous: () => list.previous(),
    skip: (step, at) => {
      if (at <= 0) {
        gate.drop();
        if (step > 0) list.next();
        else list.previous();
        list.play();
        gate.listen();
        return;
      }
      // a mute still pending from a fast earlier tap keeps its volume to give back, never the silence (hold does that)
      const volume = list.volume;
      list.volume = 0;
      list.pause();
      if (step > 0) list.next();
      else list.previous();
      gate.hold(at, true, volume);
    },
    play: () => {
      const waiting = gate.now();
      if (waiting) {
        waiting.play = true;
        gate.kick();
      } else {
        list.play();
        gate.listen();
      }
    },
    pause: () => {
      const waiting = gate.now();
      if (waiting) waiting.play = false;
      list.pause();
    },
    seek: async (seconds, play) => {
      const waiting = gate.now();
      if (waiting) return gate.hold(seconds, waiting.play); // still finding its start: the spot by hand wins
      if (!list.isLoaded) return gate.hold(seconds, play ?? list.playing); // a drag before it loaded: lands once it has
      await list.seekTo(seconds);
    },
    setLoop: (loop) => {
      list.loop = loop ? 'single' : 'none';
    },
    setTitle: (title) => {
      shownTitle = title;
      claim();
    },
    releaseLockScreen: () => {
      list.clearLockScreenControls();
      locked = false;
    },
    lockScreenSkips: (show) => {
      skips = show ? LOCK_SCREEN : NO_SKIPS;
      if (locked) claim();
    },
    refreshLockScreen: () => {
      if (locked) claim();
    },
    voice: () => voiceOf(list, gate.now, engine),
    stop: () => {
      gate.drop();
      list.clear();
      list.clearLockScreenControls();
      locked = false;
    },
    setQuiet: (on) => {
      quiet = on;
    },
  };
  // anything that can start or end a wait for a start spot, or the quiet itself: the rate is set again right after
  for (const name of ['load', 'startHere', 'abandonWait', 'skip', 'next', 'previous', 'seek', 'stop', 'setQuiet'] as const) {
    const inner = engine[name] as (...args: unknown[]) => unknown;
    (engine as Record<string, unknown>)[name] = (...args: unknown[]) => {
      const result = inner(...args);
      pace();
      return result;
    };
  }
  return engine;
}
