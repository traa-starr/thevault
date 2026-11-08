// The sound itself, behind one small set of commands, so the playlist player and the single player can swap.
// Nothing here knows about songs or queues: playerStore.ts decides what plays, this only makes it play.
import { createAudioPlayer, createAudioPlaylist } from 'expo-audio';
import type { Voice } from './compareEngine';

const UPDATE_MS = 500;
const LOCK_SCREEN = { showNextTrack: true, showPreviousTrack: true };
const NO_SKIPS = { showNextTrack: false, showPreviousTrack: false };

type Waiting = { at: number; play: boolean; seeking: boolean };
export type Sound = { time: number; duration: number; playing: boolean; buffering: boolean; loaded: boolean; finished: boolean };
export type Handlers = { onSound: (sound: Sound) => void; onTrack: (index: number) => void };

export type Engine = {
  /** True if it holds a list and moves through it by itself, while locked too. False: it holds one song at a time. */
  windowed: boolean;
  /** Replaces everything and goes to `index`. With `at`, seeks there once loaded and only then starts. */
  load: (uris: string[], index: number, at: number, play: boolean) => void;
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

type Raw = { currentTime: number; duration: number; isLoaded: boolean; isBuffering: boolean; playing: boolean; volume: number };

/** A paused song still waiting to seek reads as loading, so Compare doesn't line it up or flip to it too early. */
const voiceOf = (raw: Raw, waiting: () => Waiting | null, engine: Pick<Engine, 'play' | 'pause' | 'seek'>): Voice => ({
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
    return raw.volume;
  },
  set volume(level: number) {
    raw.volume = level;
  },
  play: () => engine.play(),
  pause: () => engine.pause(),
  seekTo: (seconds: number) => engine.seek(seconds),
});

function playlistEngine({ onSound, onTrack }: Handlers): Engine {
  const list = createAudioPlaylist({ updateInterval: UPDATE_MS });
  let locked = false;
  let shownTitle = '';
  let skips = LOCK_SCREEN;
  let waiting: Waiting | null = null;
  // Always the full call, never updateLockScreenMetadata: that one blanks the lock screen before refilling it, and does
  // nothing at all once another player took the lock screen (Compare from Library) while we still think we hold it.
  const claim = () => {
    list.setActiveForLockScreen(true, { title: shownTitle }, skips);
    locked = true;
  };

  // Seeking before a song has loaded can be lost, so it waits. Reads the player's live answer: an event can be from before.
  const settle = () => {
    const held = waiting;
    if (!held || held.seeking || !list.isLoaded) return;
    held.seeking = true;
    list.seekTo(held.at).catch(() => {}).finally(() => {
      if (waiting !== held) return; // another song was loaded meanwhile
      waiting = null;
      if (held.play) list.play();
    });
  };

  list.addListener('playlistStatusUpdate', (status) => {
    settle();
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
      waiting = null;
      list.clear();
      uris.forEach((uri) => list.add({ uri }));
      if (index > 0) list.skipTo(index);
      if (at > 0) {
        waiting = { at, play, seeking: false };
        settle();
      } else if (play) {
        list.play();
      }
    },
    add: (uri) => list.add({ uri }),
    addInFront: (uri) => list.insert({ uri }, 0),
    dropAhead: () => {
      for (let i = list.trackCount - 1; i > list.currentIndex; i--) list.remove(i);
    },
    index: () => list.currentIndex,
    next: () => list.next(),
    previous: () => list.previous(),
    play: () => {
      if (waiting) waiting.play = true;
      else list.play();
    },
    pause: () => {
      if (waiting) waiting.play = false;
      list.pause();
    },
    seek: async (seconds) => {
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
    voice: () => voiceOf(list, () => waiting, engine),
    stop: () => {
      waiting = null;
      list.clear();
      list.clearLockScreenControls();
      locked = false;
    },
  };
  return engine;
}

function singleEngine({ onSound }: Handlers): Engine {
  const player = createAudioPlayer(null, { updateInterval: UPDATE_MS });
  let locked = false;
  let shownTitle = '';
  let waiting: Waiting | null = null;
  const claim = () => {
    player.setActiveForLockScreen(true, { title: shownTitle });
    locked = true;
  };

  const settle = () => {
    const held = waiting;
    if (!held || held.seeking || !player.isLoaded) return;
    held.seeking = true;
    player.seekTo(held.at).catch(() => {}).finally(() => {
      if (waiting !== held) return; // another song was loaded meanwhile
      waiting = null;
      if (held.play) player.play();
    });
  };

  player.addListener('playbackStatusUpdate', (status) => {
    settle();
    onSound({
      time: waiting ? waiting.at : status.currentTime,
      duration: status.duration,
      playing: status.playing,
      buffering: status.isBuffering || !!waiting?.play, // a paused song waiting to seek isn't loading anything
      loaded: status.isLoaded,
      finished: status.didJustFinish,
    });
  });

  const engine: Engine = {
    windowed: false,
    load: (uris, index, at, play) => {
      waiting = null;
      player.pause(); // replacing keeps a playing player playing
      player.replace({ uri: uris[index] });
      if (at > 0) {
        waiting = { at, play, seeking: false };
        settle();
      } else if (play) {
        player.play();
      }
    },
    add: () => {},
    addInFront: () => {},
    dropAhead: () => {},
    index: () => 0,
    next: () => {},
    previous: () => {},
    play: () => {
      if (waiting) waiting.play = true;
      else player.play();
    },
    pause: () => {
      if (waiting) waiting.play = false;
      player.pause();
    },
    seek: async (seconds) => {
      await player.seekTo(seconds);
    },
    setLoop: (loop) => {
      player.loop = loop;
    },
    setTitle: (title) => {
      shownTitle = title;
      claim();
    },
    releaseLockScreen: () => {
      player.clearLockScreenControls();
      locked = false;
    },
    lockScreenSkips: () => {}, // it never shows them
    refreshLockScreen: () => {
      if (locked) claim();
    },
    voice: () => voiceOf(player, () => waiting, engine),
    stop: () => {
      waiting = null;
      player.pause();
      player.clearLockScreenControls();
      locked = false;
    },
  };
  return engine;
}

export const createEngine = (kind: 'playlist' | 'single', handlers: Handlers) =>
  kind === 'playlist' ? playlistEngine(handlers) : singleEngine(handlers);
