// The hang watch (NEXT 2026-11-09 A; LESSONS: the screen froze for good while the music played on, and nothing said
// where). While the app is on screen a beat runs once a second. A beat that arrives over 2 s late means the screen was
// stuck that long: the phone reports how long, on which screen and after which tap, with its timings. A tap also leaves
// a small mark on the phone until the next beat: a mark still there at the next launch means the app never came back
// from that tap (frozen and force quit, or closed within a second of it). Words from the code only: never a song title.
// No React Native here, so a test can load it.

export const BEAT_MS = 1000;
export const STALL_MS = 2000;
const TAP_NEAR_MS = 5000; // a tap this soon before the stall began is named with it
const MIN_WATCH_MS = 60000; // a shorter watch isn't worth a line
const SAME_TAP_MS = 100; // one tap can reach the watch twice (a Library row plays, then opens the player): the first name stays

export type StallSample = { kind: 'stall'; ms: number; screen: string; tap: string; gone: boolean };
export type WatchSample = { kind: 'watch'; ms: number; stalls: number };
export type Mark = { screen: string; tap: string };

export type HangIO = {
  now: () => number;
  emit: (sample: StallSample | WatchSample) => void;
  /** The screen showing now, as a fixed word ("Library", "Library+player"). */
  screen: () => string;
  saveMark: (mark: Mark | null) => void;
  loadMark: () => Mark | null;
  /** A flag on the phone's disk for as long as the app is on screen. A frozen app can't take it down, so one still
   * there at launch means the last run ended on screen: frozen at any moment (not only after a tap), crashed or killed. */
  setOnScreen: (on: boolean) => void;
  wasOnScreen: () => boolean;
};

export function hangWatch(io: HangIO) {
  let last = 0; // the last beat; 0: not watching (locked or in the background)
  let tap: { what: string; at: number } | null = null;
  let marked = false; // a mark is on the phone's disk
  let unmarked = false; // a tap is noted and its mark not yet saved
  let watched = 0;
  let stalls = 0;
  const clearMark = () => {
    if (!marked) return;
    marked = false;
    io.saveMark(null);
  };
  return {
    /** At launch: a mark or the on-screen flag left by the last run is a screen that never came back. The mark names
     * the tap; the flag alone means it ended on screen with no tap in the second before. */
    start() {
      const mark = io.loadMark();
      const flag = io.wasOnScreen();
      if (mark) io.emit({ kind: 'stall', ms: 0, screen: mark.screen, tap: mark.tap, gone: true });
      else if (flag) io.emit({ kind: 'stall', ms: 0, screen: '', tap: '', gone: true });
      if (mark) io.saveMark(null);
      if (flag) io.setOnScreen(false);
    },
    /** A tap on a watched control (a fixed word: "pause", "open player"): noted, and its mark saved. */
    tap(what: string) {
      this.note(what);
      this.mark();
    },
    /** The tap alone, in memory: for a tap that starts a song, where nothing may sit in front of the sound. */
    note(what: string) {
      if (tap && io.now() - tap.at < SAME_TAP_MS) return; // the same tap, heard again: its first name and its mark stand
      tap = { what, at: io.now() };
      unmarked = true;
    },
    /** Saves the mark of a tap noted earlier, once the sound has been asked for. Nothing to do without one. */
    mark() {
      if (!unmarked || !tap) return;
      unmarked = false;
      if (!last || io.now() - tap.at > STALL_MS) return; // an old note (its tap started nothing): never marked late
      marked = true;
      io.saveMark({ screen: io.screen(), tap: tap.what });
    },
    /** Once a second while the app is on screen. */
    beat() {
      const now = io.now();
      if (last) {
        const gap = now - last;
        watched += gap;
        if (gap > BEAT_MS + STALL_MS) {
          stalls++;
          const near = tap && tap.at >= last - TAP_NEAR_MS;
          io.emit({ kind: 'stall', ms: gap - BEAT_MS, screen: io.screen(), tap: near ? tap!.what : '', gone: false });
        }
      }
      last = now;
      clearMark(); // the screen is alive after that tap
    },
    /** On screen (true) or locked / in the background (false): only time on screen is watched. */
    setActive(on: boolean) {
      if (on === !!last) return;
      io.setOnScreen(on);
      if (on) {
        last = io.now();
        return;
      }
      last = 0;
      clearMark(); // the app's thread is running, so it isn't frozen: a kill in the background is not a hang
      if (watched < MIN_WATCH_MS) return;
      io.emit({ kind: 'watch', ms: watched, stalls });
      watched = 0;
      stalls = 0;
    },
    watching: () => !!last,
  };
}
