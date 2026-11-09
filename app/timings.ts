// Real-phone timings (NEXT D, 3.7 groundwork): how long a search takes and how long a tap takes to make sound, sent to
// the laptop so REPORT and I see the phone's own numbers. Numbers only: never the search text or a song title.
// Best effort: a laptop that is off, asleep or too old to know /timings never slows or breaks anything.
// Play first (2026-11-08): each tap names its path when it happens, and each sample says where its time went.
// No React Native here, so a test can load it.
import type { Started } from './playlistCore';

/** Every way a song starts from a tap. Named at the tap, never guessed at first sound. */
export const PATHS = ['session', 'sort', 'library', 'previous', 'lockscreen', 'search', 'restore'] as const;
export type Path = (typeof PATHS)[number];
/** Where the song plays from: the phone's own copy (and its file type) or the laptop's stream. */
export type Source = { src: 'phone' | 'stream'; ext: string };

export type Sample =
  | { kind: 'search'; ms: number; tags: number }
  | ({ kind: 'next'; ms: number; path: Path } & Partial<Started> & Partial<Source>);

const KEPT = 50; // the newest ones wait on the phone; older ones drop
const SEND_AT = 10; // send once this many are waiting (and on going to the background)
const NO_SOUND_MS = 15000; // a tap that never led to sound isn't a timing

let waiting: Sample[] = [];
let pending: { at: number; path: Path; source: Source | null } | null = null;
let sending = false;
let version = '';

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
  search(ms: number, tags: number) {
    add({ kind: 'search', ms: Math.round(ms * 10) / 10, tags });
  },
  setVersion(text: string) {
    version = text;
  },
  waiting: () => waiting,
  ready: () => waiting.length >= SEND_AT,
  /** Sends what's waiting. Kept on any failure (an old laptop's 404 too) until newer ones push them out. */
  async send(url: string, post: typeof fetch = fetch) {
    if (sending || !waiting.length || !url) return false;
    sending = true;
    const batch = waiting;
    try {
      const r = await post(`${url}/timings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Vault-Client': 'app' },
        body: JSON.stringify({ version, samples: batch }),
      });
      if (!r.ok) return false;
      waiting = waiting.filter((one) => !batch.includes(one));
      return true;
    } catch {
      return false;
    } finally {
      sending = false;
    }
  },
  /** Tests only. */
  reset() {
    waiting = [];
    pending = null;
    sending = false;
  },
};

function add(sample: Sample) {
  waiting = [...waiting, sample].slice(-KEPT);
}
