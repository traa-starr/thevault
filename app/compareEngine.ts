// Compare's sound. Every loaded version runs at the same second and only the sounding one has volume (full, at its true
// level: no loudness matching), so a flip just swaps volumes: nothing loads or seeks at the moment of the flip.
// From the player, the song already playing stays on the queue's own player ("borrowed"): Compare never reloads it, and
// Done on it changes nothing. Done on another version hands the sound back the same way a flip works: the queue loads that
// version silently, and the volumes swap once it plays in line. One sound at all times.
// Nothing here knows about families or the queue: compareStore.ts decides what is loaded and what sounds.
import type { AudioPlayer } from 'expo-audio';

const UPDATE_MS = 250;
const TICK_MS = 100;
const DRIFT_S = 0.08; // a silent version further off than this is pulled back in line
const FLIP_DRIFT_S = 0.12; // close enough to flip to without a jump you can hear
// the queue's player seeks less exactly, so it gets looser limits
const BORROWED_DRIFT_S = 0.2;
const BORROWED_FLIP_S = 0.25;
const RESYNC_GAP_MS = 1000; // one pull per version per second at most, so seeks don't pile up
const START_LEAD_S = 0.05; // a seek on a playing version lands late by about this; learned per version
const MAX_LEAD_S = 0.5;
const END_MARGIN_S = 0.5; // a version that ends within this of now can't be flipped to
const ADOPT_MS = 1500; // a pause or play that lasts this long and wasn't ours came from the lock screen or a call
export const HANDOFF_MS = 6000; // the queue's player not in line by then: it takes over anyway, so two never play on
export const HANDOFF = '#handoff';
/** Players loaded at once, the sounding one included (borrowed or not). The board's guess, pending a phone measurement. */
export const MAX_PLAYERS = 6;
const STICKY_ROWS = 3; // a loaded version closer than this to the dial stays loaded
const STAGGER_MS = 150; // new players start one at a time, nearest first, so they don't all fight for the stream at once

/** The wait before the dial shows, at most. */
export const WAIT_CAP_MS = 3000;

/** The dial can show: every version in the window is aligned or can't play, or the wait reached its cap. */
export const dialReady = (window: string[], aligned: Record<string, boolean>, blocked: (id: string) => boolean, waitedMs: number) =>
  waitedMs >= WAIT_CAP_MS || window.every((id) => aligned[id] || blocked(id));

/** The versions to keep loaded with the dial resting on row `at`: the nearest first, up to `cap`. Versions already
 * loaded stay while they're under STICKY_ROWS away, so a swipe back and forth doesn't rebuild them. `blocked` rows
 * (can't play) never load. The order is the load order. */
export function compareWindow(ids: string[], at: number, loaded: Iterable<string>, blocked: (id: string) => boolean = () => false, cap = MAX_PLAYERS) {
  const near = ids
    .map((id, i) => ({ id, d: Math.abs(i - at), i }))
    .filter(({ id }) => !blocked(id))
    .sort((a, b) => a.d - b.d || b.i - a.i);
  const have = new Set(loaded);
  const keep: string[] = near.filter(({ id, d }) => d === 0 || (have.has(id) && d < STICKY_ROWS)).map(({ id }) => id);
  for (const { id } of near) {
    if (keep.length >= cap) break;
    if (!keep.includes(id)) keep.push(id);
  }
  return keep;
}

/** What Compare needs from a player: the versions it makes, and the queue's own player it borrows. */
export type Voice = {
  readonly currentTime: number;
  readonly duration: number;
  readonly isLoaded: boolean;
  readonly isBuffering: boolean;
  readonly playing: boolean;
  volume: number;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
};

type One = { id: string; v: Voice; own: AudioPlayer | null; lead: number; lastSync: number; syncing: boolean; finished: boolean };
export type CompareSound = {
  sounding: string;
  /** The version waiting to sound once it's ready, or null. */
  pending: string | null;
  time: number;
  duration: number;
  playing: boolean;
  /** Lengths learned so far, by version. */
  lengths: Record<string, number>;
  ready: Record<string, boolean>;
  /** Versions that have been ready, in line and (when playing) playing at least once since they loaded: a flip to them
   * is near instant. Sticky: a short drift while it's pulled back doesn't dim it again. */
  aligned: Record<string, boolean>;
};
type MakePlayer = (uri: string, updateInterval: number) => AudioPlayer;
type Handlers = {
  onChange: (sound: CompareSound) => void;
  onEnd: () => void;
  makePlayer: MakePlayer;
  /** Set when a borrowed player holds the lock screen: Compare only names the version sounding. */
  lockScreen?: (id: string) => void;
};

const ownVoice = (p: AudioPlayer): Voice => ({
  get currentTime() {
    return p.currentTime;
  },
  get duration() {
    return p.duration;
  },
  get isLoaded() {
    return p.isLoaded;
  },
  get isBuffering() {
    return p.isBuffering;
  },
  get playing() {
    return p.playing;
  },
  get volume() {
    return p.volume;
  },
  set volume(level: number) {
    p.volume = level;
  },
  play: () => p.play(),
  pause: () => p.pause(),
  seekTo: (seconds: number) => p.seekTo(seconds, 0, 0),
});

export function createCompareEngine({ onChange, onEnd, makePlayer, lockScreen }: Handlers) {
  const loaded = new Map<string, One>();
  const borrowed = new Set<Voice>(); // every queue player lent to Compare: full volume again when Compare lets go
  let sounding = '';
  let pending: string | null = null;
  let wanted = false;
  let wantedAt = 0;
  let title = (id: string) => id;
  let seekingTo: number | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastNow = 0;
  let handedOff: (() => void) | null = null;
  let handOffBy = 0;
  const lengths: Record<string, number> = {};
  const aligned = new Set<string>();
  const toMake: string[] = []; // waiting to load, nearest first
  let lastMade = 0;
  let uriOf: Record<string, string> = {};
  let following = false; // the wait before the dial: the queue's own buttons drive the borrowed player, Compare follows
  let stopped = false;

  const now = () => {
    const one = loaded.get(sounding);
    return seekingTo ?? (one?.v.currentTime ?? 0);
  };
  /** The queue's player when it holds the lock screen (from the player), else null. */
  const remote = () => (lockScreen ? [...loaded.values()].find((one) => !one.own && one.id !== HANDOFF) ?? null : null);
  const isReady = (one: One) => one.v.isLoaded && !one.v.isBuffering;
  const drift = (one: One) => (one.own ? DRIFT_S : BORROWED_DRIFT_S);

  const report = () => {
    const ready: Record<string, boolean> = {};
    loaded.forEach((one, id) => {
      ready[id] = isReady(one);
      if (id === sounding || canFlipTo(one)) aligned.add(id);
    });
    const one = loaded.get(sounding);
    onChange({
      sounding,
      pending,
      time: now(),
      duration: one?.v.duration || lengths[sounding] || 0,
      playing: wanted,
      lengths: { ...lengths },
      ready,
      aligned: Object.fromEntries([...aligned].map((id) => [id, true])),
    });
  };

  const setVolumes = () => loaded.forEach((one, id) => (one.v.volume = id === sounding ? 1 : 0));

  const showOnLockScreen = () => {
    if (sounding === HANDOFF) return;
    if (lockScreen) return lockScreen(sounding);
    loaded.get(sounding)?.own?.setActiveForLockScreen(true, { title: title(sounding) }, { showNextTrack: false, showPreviousTrack: false });
  };

  /** Pulls a silent version to the sounding one's second. Playing: aims a little ahead, since the seek takes time. */
  const pull = (one: One, force = false) => {
    const lead = wanted ? one.lead : 0;
    if (one.syncing || (!force && Date.now() - one.lastSync < RESYNC_GAP_MS)) return;
    one.syncing = true;
    one.lastSync = Date.now();
    one.v.seekTo(now() + lead).catch(() => {}).finally(() => {
      one.syncing = false;
      if (!wanted || !loaded.has(one.id)) return;
      // learn this version's lag from where it really landed
      const off = one.v.currentTime - now();
      one.lead = Math.min(Math.max(one.lead - off, 0), MAX_LEAD_S);
    });
  };

  const offBy = (one: One) => Math.abs(one.v.currentTime - now());

  /** Ready, in line and, while playing, really playing: a flip never lands on a player that hasn't started. */
  const canFlipTo = (one: One) => {
    if (!isReady(one) || one.syncing) return false;
    if (wanted && !one.v.playing) return false;
    const length = one.v.duration || lengths[one.id] || 0;
    if (length && now() > length - END_MARGIN_S) return false;
    return offBy(one) <= (one.own ? FLIP_DRIFT_S : BORROWED_FLIP_S);
  };

  const drop = (one: One) => {
    loaded.delete(one.id);
    aligned.delete(one.id);
    if (!one.own) return; // the queue's player: never paused or removed here
    one.own.pause();
    one.own.remove();
  };

  const flip = (id: string) => {
    sounding = id;
    pending = null;
    setVolumes();
    showOnLockScreen();
    if (id === HANDOFF) finishHandOff();
  };

  const finishHandOff = () => {
    const done = handedOff;
    handedOff = null;
    engine.stop();
    done?.();
  };

  const makeNext = () => {
    while (toMake.length) {
      const id = toMake.shift()!;
      if (loaded.has(id) || !uriOf[id]) continue;
      make(id, uriOf[id]);
      lastMade = Date.now();
      return;
    }
  };

  const tick = () => {
    if (stopped) return;
    if (handedOff && Date.now() > handOffBy) return flip(HANDOFF);
    if (toMake.length && Date.now() - lastMade >= STAGGER_MS) makeNext();
    const main = loaded.get(sounding);
    if (!main) return;
    // the wait: the queue's buttons play and pause the borrowed player; the silent versions follow it at once
    if (following && !main.own && isReady(main) && main.v.playing !== wanted) {
      wanted = main.v.playing;
      wantedAt = Date.now();
    }
    // the player the lock screen drives paused or started without us: a lock-screen tap or a call. Everything follows
    // it. From the player that is the queue's player, silent or not (6.4 check 5: a lock-screen pause on another
    // version was undone at once); from Library, the sounding version.
    const control = remote() ?? main;
    if (!handedOff && Date.now() - wantedAt > ADOPT_MS && seekingTo === null && isReady(control) && !control.syncing && control.v.playing !== wanted && !control.finished) {
      wanted = control.v.playing;
      wantedAt = Date.now();
    }
    // a borrowed player loops its song while Compare has it: a jump from the end back to the start is the song's end
    const t = now();
    const length = main.v.duration || lengths[sounding] || 0;
    if (!main.own && !handedOff && seekingTo === null && length && lastNow > length - 1.5 && t < 0.5) {
      lastNow = 0;
      onEnd();
      return;
    }
    lastNow = t;
    loaded.forEach((one) => {
      if (one.v.duration) lengths[one.id] = one.v.duration;
      if (one.finished) return;
      if (following && !one.own) return; // never play or pause the queue's player for it while it has its buttons
      // the lock screen's player out of step for longer than our own command takes: a lock-screen press caught mid-seek
      // or mid-load, adopted above once it settles. Never undo it here (6.5: every press needed a second one)
      if (one === control && one.v.playing !== wanted && Date.now() - wantedAt > ADOPT_MS) return;
      if (wanted && !one.v.playing && one.v.isLoaded) one.v.play();
      if (!wanted && one.v.playing) one.v.pause();
      if (one.id === sounding || seekingTo !== null) return;
      if (one.own ? !one.v.isLoaded : !isReady(one)) return;
      const end = one.v.duration || 0;
      if (end && now() > end) return; // shorter: it waits at its end
      if (offBy(one) > drift(one)) pull(one);
    });
    if (pending) {
      const target = loaded.get(pending);
      if (!target) pending = null;
      else if (canFlipTo(target)) return flip(pending);
    }
    report();
  };

  const make = (id: string, uri: string) => {
    const p = makePlayer(uri, UPDATE_MS);
    p.volume = 0;
    const one: One = { id, v: ownVoice(p), own: p, lead: START_LEAD_S, lastSync: 0, syncing: false, finished: false };
    p.addListener('playbackStatusUpdate', (status) => {
      if (stopped || !loaded.has(id)) return; // a late answer from a player already let go
      if (status.duration) lengths[id] = status.duration;
      if (status.isLoaded && !one.lastSync && id !== sounding) pull(one, true);
      if (status.didJustFinish) {
        one.finished = true;
        if (id === sounding) onEnd();
      }
    });
    loaded.set(id, one);
    return one;
  };

  const lend = (id: string, v: Voice) => {
    borrowed.add(v);
    const one: One = { id, v, own: null, lead: START_LEAD_S, lastSync: Date.now(), syncing: false, finished: false };
    loaded.set(id, one);
    return one;
  };

  const keepOnly = (ids: Set<string>) =>
    loaded.forEach((one) => {
      if (!ids.has(one.id)) drop(one);
    });

  const engine = {
    /** Starts on `id` at `at`. With `voice`, `id` is already sounding there (the queue's player): nothing loads or
     * seeks for it. `others` load silently alongside. */
    start(id: string, uris: Record<string, string>, at: number, play: boolean, others: string[], titleOf: (id: string) => string, voice?: Voice) {
      title = titleOf;
      sounding = id;
      pending = null;
      wanted = play;
      wantedAt = Date.now();
      lastNow = 0;
      stopped = false;
      if (voice) {
        lend(id, voice);
      } else {
        const one = make(id, uris[id]);
        one.lastSync = Date.now();
        if (at > 0) {
          seekingTo = at;
          const settle = () => {
            if (seekingTo === null || !one.v.isLoaded) return;
            const target = seekingTo;
            one.v.seekTo(target).catch(() => {}).finally(() => {
              if (seekingTo === target) seekingTo = null;
            });
          };
          const sub = one.own!.addListener('playbackStatusUpdate', () => {
            if (one.v.isLoaded) {
              sub.remove();
              settle();
            }
          });
          settle();
        }
      }
      setVolumes();
      showOnLockScreen();
      engine.keep([id, ...others], uris);
      timer = setInterval(tick, TICK_MS);
    },

    /** Loads these versions, in this order, one at a time, and lets go of the rest. The sounding and pending ones
     * always stay. */
    keep(ids: string[], uris: Record<string, string>) {
      if (stopped) return;
      uriOf = { ...uriOf, ...uris };
      // the queue's player stays: it exists either way, and dropping it would leave it playing unmanaged
      const lent = [...loaded.values()].filter((one) => !one.own).map((one) => one.id);
      const first = [...new Set([sounding, ...(pending ? [pending] : []), ...lent])];
      const rest = ids.filter((id) => !first.includes(id)).slice(0, Math.max(MAX_PLAYERS - first.length, 0));
      const wantedIds = new Set([...first, ...rest]);
      keepOnly(wantedIds);
      toMake.length = 0;
      wantedIds.forEach((id) => {
        if (!loaded.has(id) && uriOf[id]) toMake.push(id);
      });
      if (Date.now() - lastMade >= STAGGER_MS) makeNext();
      setVolumes();
    },

    /** The wait before the dial shows: the queue's player keeps its own buttons and Compare follows it. Off once the
     * dial shows and Compare drives. */
    follow(on: boolean) {
      following = on;
    },

    /** Loaded now, nearest first, so the store can work out the window. */
    loadedIds: () => [...loaded.keys()],

    /** Flips to `id` once it is ready and in line; the one sounding now keeps playing until then. */
    flipTo(id: string) {
      if (handedOff) return;
      if (id === sounding) {
        pending = null;
        report();
        return;
      }
      pending = id;
      const target = loaded.get(id);
      if (!target && uriOf[id]) {
        // past the loaded window: it loads first, then flips once it plays in line
        toMake.unshift(id);
        makeNext();
      }
      if (target && target.v.isLoaded && offBy(target) > drift(target)) pull(target, true);
      tick();
    },

    /** Done on a version the queue wasn't playing: the queue's player, now loading it silently, takes over the way a
     * flip does. Everything else lets go at once. `onDone` runs when Compare has fully let go. */
    handTo(voice: Voice, onDone: () => void) {
      handedOff = onDone;
      handOffBy = Date.now() + HANDOFF_MS;
      lend(HANDOFF, voice);
      pending = HANDOFF;
      keepOnly(new Set([sounding, HANDOFF]));
      setVolumes();
      tick();
    },

    /** A tap on the player mid hand-off: the queue takes over now, so the tap lands on the one sound. */
    finishNow() {
      if (handedOff) flip(HANDOFF);
    },

    handingOff: () => !!handedOff,

    /** Would a flip to `id` land past its end? */
    tooShort(id: string) {
      const length = loaded.get(id)?.v.duration || lengths[id] || 0;
      return !!length && now() > length - END_MARGIN_S;
    },

    play() {
      loaded.forEach((one) => {
        if (one.finished) {
          one.finished = false;
          one.v.seekTo(0).catch(() => {});
        }
      });
      wanted = true;
      wantedAt = Date.now();
      tick();
    },

    pause() {
      wanted = false;
      wantedAt = Date.now();
      loaded.forEach((one) => one.v.pause());
      report();
    },

    /** Moves every version together. */
    async seek(seconds: number) {
      seekingTo = seconds;
      lastNow = seconds;
      loaded.forEach((one) => {
        one.finished = false;
        one.lastSync = Date.now();
      });
      await Promise.all([...loaded.values()].map((one) => one.v.seekTo(seconds).catch(() => {})));
      if (seekingTo === seconds) seekingTo = null;
      report();
    },

    /** Song end: everything back to 0:00, paused. */
    rewind() {
      wanted = false;
      wantedAt = Date.now();
      loaded.forEach((one) => one.v.pause());
      engine.seek(0);
    },

    time: now,
    sounding: () => sounding,
    playing: () => wanted,

    /** Lets go of everything. Compare's own players stop; a borrowed player is left playing as it is, at full volume. */
    stop() {
      stopped = true;
      toMake.length = 0;
      if (timer) clearInterval(timer);
      timer = null;
      if (!lockScreen) loaded.get(sounding)?.own?.clearLockScreenControls();
      loaded.forEach(drop);
      borrowed.forEach((v) => (v.volume = 1));
      borrowed.clear();
      sounding = '';
      pending = null;
      handedOff = null;
    },
  };
  return engine;
}

export type CompareEngine = ReturnType<typeof createCompareEngine>;
