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

// A gap much longer than the player's report rate means it wasn't playing. Reports come every 1 s on screen and every
// 2 s locked (REPORT_MS in playlistCore.ts; a test keeps the two files in step).
export const GAP_MS = { open: 3000, locked: 6000 } as const;

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
        if (playing && now - lastReport <= GAP_MS[where]) window[kind]++;
        return;
      }
      if (!playing) return;
      if (lastReport && now - lastReport <= GAP_MS[where]) window.ms += now - lastReport;
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

/** The parts of an update that really differ from what the player already holds. A report that changes nothing (the
 * same second again while a song loads, the same length) draws nothing, on screen too (2026-11-11: with the screen
 * open every report redrew, 167 to 198 times a minute). */
export const changedKeys = <T extends object>(was: T, changes: Partial<T>): string[] =>
  Object.keys(changes).filter((key) => was[key as keyof T] !== changes[key as keyof T]);

/** My choices waiting in the outbox, as one word that changes only when a choice joins or leaves. A play joining it is
 * not a choice: nothing is backed up or fetched again for it (each play used to cost a backup: 2 more network calls). */
export const choicesKey = (pending: readonly { id: string; kind: string }[]) =>
  pending.filter((change) => change.kind !== 'play_add').map((change) => change.id).join();

/** A choice the song list carries (Mine, a rating, a versions link): once the laptop has it, Library asks for the
 * list again. A tagged line isn't in the song list (tags have their own copy), so it never fetches 1,395 songs. */
export const inSongList = (change: { kind: string }) => change.kind !== 'play_add' && change.kind !== 'tag_add' && change.kind !== 'tag_remove';

/** After a choice the phone's backup goes within this long, one for a run of choices, not one each (it was 3 s after
 * every change). Going to the background still sends one at once, and the choice itself is sent the moment it's made. */
export const BACKUP_WITHIN_MS = 60000;
/** The backup asks the laptop's version first; that answer is good for this long (it was asked before every backup). */
export const HEALTH_GOOD_MS = 5 * 60 * 1000;

/** A play's first line (it counts) is sent at once while the app is in front. Its second line (the play's full
 * length, written when the song is left) is saved on the phone and rides along with the next send: one network
 * call a song, not two. Locked, nothing is sent. */
export const playSendsNow = (line: { end?: boolean }, inFront: boolean) => inFront && !line.end;

/** How often the playing spot is saved: every 15 s open, every 60 s locked (a kill while locked loses under a minute).
 * A song change, a pause and going to the background always save at once. */
export const SPOT_EVERY_MS = { open: 15000, locked: 60000 } as const;

/** How long to wait before trying the laptop again after `fails` failures in a row: 10 s, doubling, 5 min at most.
 * The old fixed 10 s meant 360 tries an hour with the laptop off. */
export const retryAfterMs = (fails: number, first = 10000, most = 300000) => Math.min(first * 2 ** Math.max(fails - 1, 0), most);
