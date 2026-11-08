// The playlist player's logic, with the real player passed in, so a test can hand it a fake one and listen for the
// order of seek and play. engine.ts makes the real expo-audio playlist and gives it here. No phone imports in this file.
import type { Voice } from './compareEngine';

export type Sound = { time: number; duration: number; playing: boolean; buffering: boolean; loaded: boolean; finished: boolean };
export type Handlers = { onSound: (sound: Sound) => void; onTrack: (index: number) => void };

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
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => Promise<void>;
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
};

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
export type Waiting = { at: number; play: boolean; seeking: boolean; muted: number | null; retried?: boolean };

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
 * and only then plays. Past a short song's end it starts at 0:00 instead. Shared by both players. */
export function startGate(raw: Pick<Raw, 'isLoaded' | 'duration' | 'volume' | 'currentTime'> & { seekTo(s: number): Promise<void>; play(): void }) {
  let waiting: Waiting | null = null;
  const settle = () => {
    const held = waiting;
    if (!held || held.seeking || !raw.isLoaded) return;
    held.seeking = true;
    held.at = clampStart(held.at, raw.duration);
    raw.seekTo(held.at).catch(() => {}).finally(() => {
      if (waiting !== held) return; // another song was loaded meanwhile
      // a seek sent the instant the song changed can be lost (the player was still on the last song): once more
      if (!held.retried && held.at > 0 && Math.abs(raw.currentTime - held.at) > 1) {
        held.retried = true;
        held.seeking = false;
        return settle();
      }
      waiting = null;
      if (held.muted !== null) raw.volume = held.muted;
      if (held.play) raw.play();
    });
  };
  return {
    now: () => waiting,
    settle,
    /** Waits for `at`. `muted`: the volume to give back once there (the sound is silenced meanwhile). */
    hold(at: number, play: boolean, muted: number | null = null) {
      const before = waiting;
      // a mute still pending from the song before keeps its volume to give back, never the silence
      const giveBack = before?.muted ?? muted;
      waiting = { at, play, seeking: false, muted: giveBack };
      settle();
    },
    /** Dropped: a new list, or no start spot. Gives a held-back volume back. */
    drop() {
      if (waiting?.muted != null) raw.volume = waiting.muted;
      waiting = null;
    },
  };
}

export function playlistEngine(list: List, { onSound, onTrack }: Handlers): Engine {
  let locked = false;
  let shownTitle = '';
  let skips = LOCK_SCREEN;
  const gate = startGate(list);
  // Always the full call, never updateLockScreenMetadata: that one blanks the lock screen before refilling it, and does
  // nothing at all once another player took the lock screen (Compare from Library) while we still think we hold it.
  const claim = () => {
    list.setActiveForLockScreen(true, { title: shownTitle }, skips);
    locked = true;
  };

  // Reads the player's live answer in settle: an event can be from before.
  list.addListener('playlistStatusUpdate', (status) => {
    gate.settle();
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
      else if (play) list.play();
    },
    startHere: (at) => {
      if (at <= 0) return;
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
    play: () => {
      const waiting = gate.now();
      if (waiting) waiting.play = true;
      else list.play();
    },
    pause: () => {
      const waiting = gate.now();
      if (waiting) waiting.play = false;
      list.pause();
    },
    seek: async (seconds) => {
      const waiting = gate.now();
      if (waiting) return gate.hold(seconds, waiting.play); // still finding its start: the spot by hand wins
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
  };
  return engine;
}
