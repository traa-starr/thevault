// The sound itself, behind one small set of commands, so the playlist player and the single player can swap.
// Nothing here knows about songs or queues: playerStore.ts decides what plays, this only makes it play.
import { createAudioPlayer, createAudioPlaylist } from 'expo-audio';

const UPDATE_MS = 500;
const LOCK_SCREEN = { showNextTrack: true, showPreviousTrack: true };

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
  stop: () => void;
};

function playlistEngine({ onSound, onTrack }: Handlers): Engine {
  const list = createAudioPlaylist({ updateInterval: UPDATE_MS });
  let locked = false;
  let waiting: Waiting | null = null;

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
      buffering: status.isBuffering || !!waiting,
      loaded: status.isLoaded,
      finished: status.didJustFinish,
    });
  });
  list.addListener('trackChanged', () => onTrack(list.currentIndex)); // live index: the event may be from before a load

  return {
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
      if (locked) {
        list.updateLockScreenMetadata({ title });
      } else {
        list.setActiveForLockScreen(true, { title }, LOCK_SCREEN);
        locked = true;
      }
    },
    stop: () => {
      waiting = null;
      list.clear();
      list.clearLockScreenControls();
      locked = false;
    },
  };
}

function singleEngine({ onSound }: Handlers): Engine {
  const player = createAudioPlayer(null, { updateInterval: UPDATE_MS });
  let locked = false;
  let waiting: Waiting | null = null;

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
      buffering: status.isBuffering || !!waiting,
      loaded: status.isLoaded,
      finished: status.didJustFinish,
    });
  });

  return {
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
      if (locked) {
        player.updateLockScreenMetadata({ title });
      } else {
        player.setActiveForLockScreen(true, { title });
        locked = true;
      }
    },
    stop: () => {
      waiting = null;
      player.pause();
      player.clearLockScreenControls();
      locked = false;
    },
  };
}

export const createEngine = (kind: 'playlist' | 'single', handlers: Handlers) =>
  kind === 'playlist' ? playlistEngine(handlers) : singleEngine(handlers);
