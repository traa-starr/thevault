// Compare's own sound, kept apart from the queue's player. Every loaded version runs at the same second and only the
// sounding one has volume (full, at its true level: no loudness matching), so a flip just swaps volumes: nothing loads or seeks at the moment of the flip.
// Nothing here knows about families or the queue: compareStore.ts decides what is loaded and what sounds.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const UPDATE_MS = 250;
const TICK_MS = 100;
const DRIFT_S = 0.08; // a silent version further off than this is pulled back in line
const FLIP_DRIFT_S = 0.12; // close enough to flip to without a jump you can hear
const RESYNC_GAP_MS = 1000; // one pull per version per second at most, so seeks don't pile up
const START_LEAD_S = 0.05; // a seek on a playing version lands late by about this; learned per version
const MAX_LEAD_S = 0.5;
const END_MARGIN_S = 0.5; // a version that ends within this of now can't be flipped to
const ADOPT_MS = 1500; // a pause or play that lasts this long and wasn't ours came from the lock screen or a call

type One = { id: string; uri: string; p: AudioPlayer; lead: number; lastSync: number; syncing: boolean; finished: boolean };
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
};
type Handlers = { onChange: (sound: CompareSound) => void; onEnd: () => void };

export function createCompareEngine({ onChange, onEnd }: Handlers) {
  const loaded = new Map<string, One>();
  let sounding = '';
  let pending: string | null = null;
  let wanted = false;
  let wantedAt = 0;
  let title = (id: string) => id;
  let seekingTo: number | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const lengths: Record<string, number> = {};

  const now = () => {
    const one = loaded.get(sounding);
    return seekingTo ?? (one?.p.currentTime ?? 0);
  };
  const isReady = (one: One) => one.p.isLoaded && !one.p.isBuffering;

  const report = () => {
    const ready: Record<string, boolean> = {};
    loaded.forEach((one, id) => (ready[id] = isReady(one)));
    const one = loaded.get(sounding);
    onChange({
      sounding,
      pending,
      time: now(),
      duration: one?.p.duration ?? lengths[sounding] ?? 0,
      playing: wanted,
      lengths: { ...lengths },
      ready,
    });
  };

  const setVolumes = () => loaded.forEach((one, id) => (one.p.volume = id === sounding ? 1 : 0));

  const lockScreen = () => {
    const one = loaded.get(sounding);
    one?.p.setActiveForLockScreen(true, { title: title(sounding) }, { showNextTrack: false, showPreviousTrack: false });
  };

  /** Pulls a silent version to the sounding one's second. Playing: aims a little ahead, since the seek takes time. */
  const pull = (one: One, force = false) => {
    const lead = wanted ? one.lead : 0;
    if (one.syncing || (!force && Date.now() - one.lastSync < RESYNC_GAP_MS)) return;
    one.syncing = true;
    one.lastSync = Date.now();
    one.p.seekTo(now() + lead, 0, 0).catch(() => {}).finally(() => {
      one.syncing = false;
      if (!wanted || !loaded.has(one.id)) return;
      // learn this version's lag from where it really landed
      const off = one.p.currentTime - now();
      one.lead = Math.min(Math.max(one.lead - off, 0), MAX_LEAD_S);
    });
  };

  const offBy = (one: One) => Math.abs(one.p.currentTime - now());

  const canFlipTo = (one: One) => {
    if (!isReady(one) || one.syncing) return false;
    const length = one.p.duration || lengths[one.id] || 0;
    if (length && now() > length - END_MARGIN_S) return false;
    return offBy(one) <= FLIP_DRIFT_S;
  };

  const flip = (id: string) => {
    sounding = id;
    pending = null;
    setVolumes();
    lockScreen();
  };

  const tick = () => {
    const main = loaded.get(sounding);
    if (!main) return;
    // the sounding version paused or started without us: a lock-screen tap or a call. Everything follows it.
    if (Date.now() - wantedAt > ADOPT_MS && seekingTo === null && isReady(main) && !main.syncing && main.p.playing !== wanted && !main.finished) {
      wanted = main.p.playing;
      wantedAt = Date.now();
    }
    loaded.forEach((one) => {
      if (one.finished) return;
      if (wanted && !one.p.playing && one.p.isLoaded) one.p.play();
      if (!wanted && one.p.playing) one.p.pause();
      if (one.id === sounding || !one.p.isLoaded || seekingTo !== null) return;
      const length = one.p.duration || 0;
      if (length && now() > length) return; // shorter: it waits at its end
      if (offBy(one) > DRIFT_S) pull(one);
    });
    if (pending) {
      const target = loaded.get(pending);
      if (!target) pending = null;
      else if (canFlipTo(target)) flip(pending);
    }
    report();
  };

  const make = (id: string, uri: string) => {
    const p = createAudioPlayer({ uri }, { updateInterval: UPDATE_MS });
    p.volume = 0;
    const one: One = { id, uri, p, lead: START_LEAD_S, lastSync: 0, syncing: false, finished: false };
    p.addListener('playbackStatusUpdate', (status) => {
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

  const drop = (one: One) => {
    one.p.pause();
    one.p.remove();
    loaded.delete(one.id);
  };

  return {
    /** Starts on `id` at `at`. `others` load silently alongside. */
    start(id: string, uris: Record<string, string>, at: number, play: boolean, others: string[], titleOf: (id: string) => string) {
      title = titleOf;
      sounding = id;
      pending = null;
      wanted = play;
      wantedAt = Date.now();
      const one = make(id, uris[id]);
      one.lastSync = Date.now();
      if (at > 0) {
        seekingTo = at;
        const settle = () => {
          if (seekingTo === null || !one.p.isLoaded) return;
          const target = seekingTo;
          one.p.seekTo(target, 0, 0).catch(() => {}).finally(() => {
            if (seekingTo === target) seekingTo = null;
          });
        };
        const sub = one.p.addListener('playbackStatusUpdate', () => {
          if (one.p.isLoaded) {
            sub.remove();
            settle();
          }
        });
        settle();
      }
      setVolumes();
      lockScreen();
      this.keep([id, ...others], uris);
      timer = setInterval(tick, TICK_MS);
    },

    /** Loads these versions and lets go of the rest. The sounding and pending ones always stay. */
    keep(ids: string[], uris: Record<string, string>) {
      const wantedIds = new Set([...ids, sounding, ...(pending ? [pending] : [])]);
      loaded.forEach((one) => {
        if (!wantedIds.has(one.id)) drop(one);
      });
      wantedIds.forEach((id) => {
        if (!loaded.has(id) && uris[id]) make(id, uris[id]);
      });
      setVolumes();
    },

    /** Flips to `id` once it is ready and in line; the one sounding now keeps playing until then. */
    flipTo(id: string) {
      if (id === sounding) {
        pending = null;
        report();
        return;
      }
      pending = id;
      const target = loaded.get(id);
      if (target && target.p.isLoaded && offBy(target) > DRIFT_S) pull(target, true);
      tick();
    },

    /** Would a flip to `id` land past its end? */
    tooShort(id: string) {
      const length = loaded.get(id)?.p.duration || lengths[id] || 0;
      return !!length && now() > length - END_MARGIN_S;
    },

    play() {
      loaded.forEach((one) => {
        if (one.finished) {
          one.finished = false;
          one.p.seekTo(0).catch(() => {});
        }
      });
      wanted = true;
      wantedAt = Date.now();
      tick();
    },

    pause() {
      wanted = false;
      wantedAt = Date.now();
      loaded.forEach((one) => one.p.pause());
      report();
    },

    /** Moves every version together. */
    async seek(seconds: number) {
      seekingTo = seconds;
      loaded.forEach((one) => {
        one.finished = false;
        one.lastSync = Date.now();
      });
      await Promise.all([...loaded.values()].map((one) => one.p.seekTo(seconds, 0, 0).catch(() => {})));
      if (seekingTo === seconds) seekingTo = null;
      report();
    },

    /** Song end: everything back to 0:00, paused. */
    rewind() {
      wanted = false;
      wantedAt = Date.now();
      loaded.forEach((one) => one.p.pause());
      this.seek(0);
    },

    time: now,
    sounding: () => sounding,
    playing: () => wanted,

    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      loaded.get(sounding)?.p.clearLockScreenControls();
      loaded.forEach(drop);
      sounding = '';
      pending = null;
    },
  };
}

export type CompareEngine = ReturnType<typeof createCompareEngine>;
