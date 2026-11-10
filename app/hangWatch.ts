// The app's one hang watch (hang.ts): its beat, its mark file, and where its lines go (with the timings).
import { File, Paths } from 'expo-file-system';
import { BEAT_MS, hangWatch, STALL_MS, type Mark } from './hang';
import { timing } from './timings';

const markFile = () => new File(Paths.document, 'hang-mark.json');
const flagFile = () => new File(Paths.document, 'hang-on-screen.txt');
let screenNow: () => string = () => '';
let beat: ReturnType<typeof setInterval> | undefined;

const watch = hangWatch({
  now: Date.now,
  emit: (sample) => timing.hang(sample),
  screen: () => screenNow(),
  saveMark(mark) {
    try {
      const file = markFile();
      if (!mark) {
        if (file.exists) file.delete();
        return;
      }
      if (!file.exists) file.create();
      file.writeSync(JSON.stringify(mark));
    } catch {
      // a full phone: the watch still times stalls, it just can't name a freeze after a force quit
    }
  },
  setOnScreen(on) {
    try {
      const file = flagFile();
      if (on && !file.exists) file.create();
      else if (!on && file.exists) file.delete();
    } catch {
      // a full phone: stalls are still timed
    }
  },
  wasOnScreen() {
    try {
      return flagFile().exists;
    } catch {
      return false;
    }
  },
  loadMark() {
    try {
      const file = markFile();
      if (!file.exists) return null;
      const mark = JSON.parse(file.textSync()) as Mark;
      return typeof mark?.screen === 'string' && typeof mark?.tap === 'string' ? mark : { screen: '', tap: '' };
    } catch {
      return { screen: '', tap: '' }; // a mark was there, unreadable: still a run that never came back
    }
  },
});

export const hang = {
  /** At launch. `screen` names what's showing, in fixed words. `active`: the app is on screen right now. */
  start(screen: () => string, active: boolean) {
    screenNow = screen;
    watch.start();
    hang.setActive(active);
  },
  tap: (what: string) => watch.tap(what),
  /** A tap that starts a song: noted now, its mark saved by `mark()` once the sound is asked for (play first). */
  note: (what: string) => watch.note(what),
  mark: () => watch.mark(),
  /** An iOS pop-up sheet was asked for. Call what this returns once it shows (or is no longer wanted): if 2 s pass
   * first, it's reported like a stall, because a sheet iOS never showed can leave the screen dead. */
  expect(what: string) {
    const timer = setTimeout(
      () => timing.hang({ kind: 'stall', ms: STALL_MS, screen: screenNow(), tap: `${what} never showed`, gone: false }),
      STALL_MS,
    );
    return () => clearTimeout(timer);
  },
  /** The app came to the front (true) or left it (false): the beat only runs while I can see the screen. */
  setActive(on: boolean) {
    watch.setActive(on);
    if (on && !beat) beat = setInterval(watch.beat, BEAT_MS);
    if (!on && beat) {
      clearInterval(beat);
      beat = undefined;
    }
  },
};
