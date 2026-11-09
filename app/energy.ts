// What keeps the phone awake while a song plays (NEXT 2026-11-09 C; LESSONS: nothing measured energy). Counted per
// minute of playing, screen open and locked apart: reports from the player (each wakes the app's thread), redraws
// (the screens told to draw again), network calls and file writes. Sent with the timings: numbers only.
// Also the rules that keep those counts low, as plain functions, so a test can run a locked hour on a pretend clock.
// No React Native here, so a test can load it.

export type Where = 'open' | 'locked';
export type Counted = 'reports' | 'redraws' | 'net' | 'writes';
export type EnergySample = { kind: 'energy'; where: Where; ms: number; reports: number; redraws: number; net: number; writes: number; phone: number; stream: number };

const WINDOW_MS = 5 * 60 * 1000; // one sample per this much playing
const MIN_MS = 60 * 1000; // a shorter stretch says nothing per minute

const fresh = (where: Where): EnergySample => ({ kind: 'energy', where, ms: 0, reports: 0, redraws: 0, net: 0, writes: 0, phone: 0, stream: 0 });

const GAP_MS = 2000; // reports come every 0.5 s while a song plays: a longer gap means it wasn't playing

export function energyMeter(emit: (sample: EnergySample) => void, clock: () => number = Date.now) {
  let where: Where = 'open';
  let window = fresh(where);
  let playing = false;
  let lastReport = 0;
  const close = () => {
    if (window.ms >= MIN_MS) emit(window);
    window = fresh(where);
  };
  return {
    /** The app came to the front (true) or went to the back or the lock screen (false). */
    setOpen(open: boolean) {
      const next: Where = open ? 'open' : 'locked';
      if (next === where) return;
      close();
      where = next;
      window = fresh(where);
    },
    /** Sound started or stopped: only playing counts. */
    setPlaying(on: boolean) {
      playing = on;
    },
    /** One wake-up of this kind. Counted only while a song plays. Playing time is the time between the player's own
     * reports, so a pause the player never announced can't pad the minutes and flatter the numbers. */
    count(kind: Counted) {
      const now = clock();
      if (kind !== 'reports') {
        if (playing && now - lastReport <= GAP_MS) window[kind]++;
        return;
      }
      if (!playing) return;
      if (lastReport && now - lastReport <= GAP_MS) window.ms += now - lastReport;
      lastReport = now;
      window.reports++;
      if (window.ms >= WINDOW_MS) close();
    },
    /** A song started, from the phone's own copy or the laptop's stream. */
    play(src: 'phone' | 'stream') {
      window[src]++;
    },
    /** Closes the stretch so far (going to the background: it gets sent). */
    flush: close,
    where: () => where,
  };
}

// ---------- the rules ---------------------------------------------------------------------------------------------

/** A report that only moves the clock (time, length) draws nothing while locked or in the background: nobody is
 * looking. Anything else (a new song, paused, trouble) still reaches the screens, so they're right when I look. */
export const redrawFor = (open: boolean, changed: readonly string[]) => open || changed.some((key) => key !== 'time' && key !== 'duration');

/** How often the playing spot is saved: every 15 s open, every 60 s locked (a kill while locked loses under a minute).
 * A song change, a pause and going to the background always save at once. */
export const SPOT_EVERY_MS = { open: 15000, locked: 60000 } as const;

/** How long to wait before trying the laptop again after `fails` failures in a row: 10 s, doubling, 5 min at most.
 * The old fixed 10 s meant 360 tries an hour with the laptop off. */
export const retryAfterMs = (fails: number, first = 10000, most = 300000) => Math.min(first * 2 ** Math.max(fails - 1, 0), most);
