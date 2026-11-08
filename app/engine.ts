// The sound itself, behind one small set of commands, so the playlist player and the single player can swap.
// Nothing here knows about songs or queues: playerStore.ts decides what plays, this only makes it play.
// The playlist player's logic lives in playlistCore.ts (testable with a fake player); this file makes the real ones.
import { createAudioPlayer, createAudioPlaylist } from 'expo-audio';
import { playlistEngine, startGate, voiceOf, type Engine, type Handlers, type List } from './playlistCore';

export type { Engine, Sound } from './playlistCore';

const UPDATE_MS = 500;

function singleEngine({ onSound, onStarted }: Handlers): Engine {
  const player = createAudioPlayer(null, { updateInterval: UPDATE_MS });
  let locked = false;
  let shownTitle = '';
  const gate = startGate(player, onStarted);
  const claim = () => {
    player.setActiveForLockScreen(true, { title: shownTitle });
    locked = true;
  };

  player.addListener('playbackStatusUpdate', (status) => {
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

  const engine: Engine = {
    windowed: false,
    load: (uris, index, at, play) => {
      gate.drop();
      player.pause(); // replacing keeps a playing player playing
      player.replace({ uri: uris[index] });
      if (at > 0) gate.hold(at, play);
      else if (play) player.play();
    },
    startHere: () => {}, // it never moves on by itself
    abandonWait: () => gate.drop(),
    add: () => {},
    addInFront: () => {},
    dropAhead: () => {},
    index: () => 0,
    next: () => {},
    previous: () => {},
    skip: () => {}, // never asked: it isn't windowed
    play: () => {
      const waiting = gate.now();
      if (waiting) waiting.play = true;
      else player.play();
    },
    pause: () => {
      const waiting = gate.now();
      if (waiting) waiting.play = false;
      player.pause();
    },
    seek: async (seconds) => {
      const waiting = gate.now();
      if (waiting) return gate.hold(seconds, waiting.play);
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
    voice: () => voiceOf(player, gate.now, engine),
    stop: () => {
      gate.drop();
      player.pause();
      player.clearLockScreenControls();
      locked = false;
    },
  };
  return engine;
}

export const createEngine = (kind: 'playlist' | 'single', handlers: Handlers) =>
  kind === 'playlist'
    ? playlistEngine(createAudioPlaylist({ updateInterval: UPDATE_MS }) as unknown as List, handlers)
    : singleEngine(handlers);
