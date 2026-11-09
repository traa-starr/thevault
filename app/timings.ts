// Real-phone timings (NEXT D, 3.7 groundwork): how long a search takes and how long a tap takes to make sound, sent to
// the laptop so REPORT and I see the phone's own numbers. Numbers only: never the search text or a song title.
// Best effort: a laptop that is off, asleep or too old to know /timings never slows or breaks anything.
// Play first (2026-11-08): each tap names its path when it happens, and each sample says where its time went.
// No React Native here, so a test can load it.
import type { EnergySample } from './energy';
import type { Started } from './playlistCore';

/** Every way a song starts from a tap. Named at the tap, never guessed at first sound. */
export const PATHS = ['session', 'sort', 'library', 'previous', 'lockscreen', 'search', 'restore'] as const;
export type Path = (typeof PATHS)[number];
/** Where the song plays from: the phone's own copy (and its file type) or the laptop's stream. */
export type Source = { src: 'phone' | 'stream'; ext: string };

export type Sample =
  | { kind: 'search'; ms: number; tags: number }
  | ({ kind: 'next'; ms: number; path: Path } & Partial<Started> & Partial<Source>)
  | EnergySample;

const KEPT = 50; // the newest ones wait on the phone; older ones drop
const SEND_AT = 10; // send once this many are waiting (and on going to the background)
const NO_SOUND_MS = 15000; // a tap that never led to sound isn't a timing

let waiting: Sample[] = [];
let pending: { at: number; path: Path; source: Source | null } | null = null;
let sending = false;
let version = '';
let copies: { stored: number; wanted: number } | null = null; // Mine songs on the phone, for the laptop's /status
let copiesSent = '';
let fails = 0; // sends that failed in a row: the laptop is off or away
let notBefore = 0; // no try by itself before this time (going to the background or coming back still tries once)
const FIRST_RETRY_MS = 60000;
const MOST_RETRY_MS = 600000;

export const timing = {
  /** A tap that starts a song: the clock starts. A newer tap replaces it (five fast taps time the last one). */
  tap(path: Path, source: Source | null = null, now = Date.now()) {
    pending = { at: now, path, source };
  },
  /** The tap that was waiting gave no sound (a pause, a song that isn't here): nothing to time. */
  cancel() {
    pending = null;
  },
  /** Sound is really coming out (the player heard the time move on, volume up). Only the first after a tap counts. */
  heard(stages: Started | null = null, now = Date.now()) {
    if (!pending) return;
    const { at, path, source } = pending;
    pending = null;
    const ms = now - at;
    if (ms > NO_SOUND_MS) return;
    add({ kind: 'next', ms, path, ...(stages ?? {}), ...(source ?? {}) });
  },
  /** An energy sample (energy.ts): it waits and goes with the rest. */
  energy(sample: EnergySample) {
    add(sample);
  },
  search(ms: number, tags: number) {
    add({ kind: 'search', ms: Math.round(ms * 10) / 10, tags });
  },
  setVersion(text: string) {
    version = text;
  },
  /** How many Mine songs the phone holds, of how many: it rides along with the next send. Two numbers, nothing else. */
  setCopies(stored: number, wanted: number) {
    copies = { stored, wanted };
  },
  waiting: () => waiting,
  /** Enough waiting, and the laptop hasn't just failed to answer: with it off, the old check tried again on every
   * player report, twice a second for as long as music played (found 2026-11-09, battery). */
  ready: (now = Date.now()) => waiting.length >= SEND_AT && !sending && now >= notBefore,
  /** Sends what's waiting. Kept on any failure (an old laptop's 404 too) until newer ones push them out. */
  async send(url: string, post: typeof fetch = fetch, now: () => number = Date.now) {
    const count = copies ? `${copies.stored}/${copies.wanted}` : '';
    if (sending || !url || (!waiting.length && count === copiesSent)) return false;
    sending = true;
    const batch = waiting;
    let sent = false;
    try {
      const r = await post(`${url}/timings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Vault-Client': 'app' },
        body: JSON.stringify({ version, samples: batch, ...(copies ? { copies } : {}) }),
      });
      if (!r.ok) return false;
      waiting = waiting.filter((one) => !batch.includes(one));
      copiesSent = count;
      sent = true;
      return true;
    } catch {
      return false;
    } finally {
      sending = false;
      fails = sent ? 0 : fails + 1;
      notBefore = sent ? 0 : now() + Math.min(FIRST_RETRY_MS * 2 ** (fails - 1), MOST_RETRY_MS); // 1 min, doubling, 10 at most
    }
  },
  /** Tests only. */
  reset() {
    waiting = [];
    pending = null;
    sending = false;
    fails = 0;
    notBefore = 0;
    copies = null;
    copiesSent = '';
  },
};

function add(sample: Sample) {
  waiting = [...waiting, sample].slice(-KEPT);
}

