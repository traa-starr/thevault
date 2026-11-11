// Talking to the laptop, as plain rules a test can run (overhaul wave 4): the laptop's address (typed once, kept in a
// file and in the Keychain), when Library asks for the song list again by itself, and what a failed backup means.
// No React Native here, so a test can load it.

export const PORT = 8787;

/** The address as it's kept: no spaces anywhere (a pasted address often brings one along). */
export const cleanAddress = (typed: string | null | undefined) => (typed ?? '').replace(/\s+/g, '');

/** The link every call to the laptop starts with: `http://` unless a scheme was typed, our port unless one was typed. */
export const serverUrl = (address: string, port = PORT) => {
  const clean = cleanAddress(address);
  const withScheme = /^https?:\/\//i.test(clean) ? clean : `http://${clean}`;
  const url = withScheme.replace(/\/+$/, '');
  return /:\d+$/.test(url) ? url : `${url}:${port}`;
};

/** Where the address lives. The file is the first source; the Keychain outlives a delete-and-reinstall. */
export type AddressIO = {
  readFile: () => string;
  writeFile: (address: string) => void;
  readKept: () => string;
  keep: (address: string) => void;
};

/** On open: the file's address (and the Keychain is topped up from it); file gone, the Keychain's, written back to
 * the file. '' when neither has one: first run, the box to type it in. */
export function loadAddress(io: AddressIO) {
  const onFile = cleanAddress(io.readFile());
  if (onFile) {
    io.keep(onFile);
    return onFile;
  }
  const kept = cleanAddress(io.readKept());
  if (kept) {
    try {
      io.writeFile(kept);
    } catch {
      // a full phone: the Keychain still has it next time
    }
  }
  return kept;
}

/** Save: to the file and the Keychain, before the screen shows it. Nothing typed: null, nothing saved. A file that
 * can't be written (a full phone) still leaves the Keychain's copy for the next open. */
export function saveAddress(io: AddressIO, typed: string): string | null {
  const next = cleanAddress(typed);
  if (!next) return null;
  try {
    io.writeFile(next);
  } catch {
    // the Keychain below still keeps it
  }
  io.keep(next);
  return next;
}

// ---------- Library's song list, asked again by itself (wave 3 review, catch 4) -----------------------------------------
/** How long Library waits before asking for the list again by itself, by how many times in a row the list has failed.
 * The first failure: at once, as soon as anything reaches the laptop (it was off and is back: the line clears by
 * itself). After that it waits, longer each time: a laptop that answers small calls while the big list times out (a
 * slow link) used to be asked again on every small call, for ever. A tap on the line always asks now. */
export const LIST_RETRY_WAITS_MS = [0, 60_000, 5 * 60_000];
/** Milliseconds still to wait before the next automatic try (0: now). `fails`: list fetches failed in a row. */
export const listRetryWait = (fails: number, lastFailAt: number, now: number) => {
  const gap = LIST_RETRY_WAITS_MS[Math.min(Math.max(fails, 1), LIST_RETRY_WAITS_MS.length) - 1];
  return Math.max(0, lastFailAt + gap - now);
};

/** What the rule needs from the screen: a clock, a timer, and `ask` (fetch the list again, by itself). */
export type RetryIO = { now: () => number; later: (fn: () => void, ms: number) => unknown; cancel: (timer: unknown) => void; ask: () => void };
/** Library's "ask for the list again by itself" rule, whole: the screen tells it what happened (`started`, `came`,
 * `failed`, and each change of `reachable`), and it calls `ask` when a try is due. Never two tries at once, never a
 * try while the laptop isn't known to answer, and each failure in a row waits longer (listRetryWait). */
export function listRetrier(io: RetryIO) {
  let fails = 0;
  let lastFailAt = 0;
  let failed = false;
  let reach: boolean | null = null;
  let asking = false;
  let timer: unknown = null;
  const drop = () => {
    if (timer !== null) io.cancel(timer);
    timer = null;
  };
  const plan = () => {
    drop();
    if (!failed || reach !== true || asking) return;
    const go = () => {
      timer = null;
      asking = true;
      io.ask();
    };
    const wait = listRetryWait(fails, lastFailAt, io.now());
    if (wait) timer = io.later(go, wait);
    else go();
  };
  return {
    /** A list fetch began (a tap, the first open, or `ask`). */
    started() {
      asking = true;
      drop();
    },
    /** The list came: the count starts again. */
    came() {
      asking = false;
      fails = 0;
      failed = false;
      drop();
    },
    /** The fetch failed. That is itself news that the laptop didn't answer: a try waits for something to reach it. */
    failed() {
      asking = false;
      fails += 1;
      lastFailAt = io.now();
      failed = true;
      reach = false;
      drop();
    },
    /** What the rest of the app last found: true once anything reaches the laptop. */
    reachable(next: boolean | null) {
      reach = next;
      plan();
    },
    stop: drop,
    now: () => ({ fails, failed, waiting: timer !== null }),
  };
}

// ---------- a backup that didn't go (wave 3 review, catch 5) -------------------------------------------------------------
export const TIMED_OUT = 'Timed out';
/** What a failed call says. `refused`: the laptop answered and didn't take it. `timeout`: our own wait ran out, which a
 * laptop that's off and a laptop that's slow with a big body both look like. `silent`: no answer at all. */
export type CallFailure = 'refused' | 'timeout' | 'silent';
export const callFailure = (message: string): CallFailure =>
  message.startsWith('Server said') ? 'refused' : message === TIMED_OUT ? 'timeout' : 'silent';
/** Whether to say "This phone's backup didn't save". A refusal: yes. A timeout: only if the laptop answers a small
 * call right after (`answersNow`), so it's on and the backup really didn't go; it used to be read as "laptop off" and
 * never said. No answer: no, the "Laptop not reachable" line covers it. `waiting`: a fresh install that hasn't had its
 * old backup back yet has sent nothing, so a timeout there is never "didn't save" (it stays quiet and asks again). */
export const backupDidntSave = (failure: CallFailure, answersNow: boolean, waiting = false) =>
  failure === 'refused' || (failure === 'timeout' && answersNow && !waiting);
/** How long the one small call after a backup timeout may take: short, so a laptop that's really off doesn't hold the
 * next backup up for another 10 s. */
export const ANSWERS_NOW_MS = 3000;
