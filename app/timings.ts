// Real-phone timings (NEXT D, 3.7 groundwork): how long a search takes and how long Next takes to make sound, sent to
// the laptop so REPORT and I see the phone's own numbers. Numbers only: never the search text or a song title.
// Best effort: a laptop that is off, asleep or too old to know /timings never slows or breaks anything.
// No React Native here, so a test can load it.

export type Sample =
  | { kind: 'search'; ms: number; tags: number }
  | { kind: 'next'; ms: number; path: 'session' | 'sort' | 'library' };

const KEPT = 50; // the newest ones wait on the phone; older ones drop
const SEND_AT = 10; // send once this many are waiting (and on going to the background)
const NO_SOUND_MS = 15000; // a tap that never led to sound isn't a timing

let waiting: Sample[] = [];
let tapAt = 0;
let sending = false;
let version = '';

export const timing = {
  /** A Next or Previous tap: the clock starts. A newer tap restarts it (five fast taps time the last one). */
  tap(now = Date.now()) {
    tapAt = now;
  },
  /** The player reports sound coming out (playing, loaded, not waiting for its spot). Only the first after a tap counts. */
  heard(path: 'session' | 'sort' | 'library', now = Date.now()) {
    if (!tapAt) return;
    const ms = now - tapAt;
    tapAt = 0;
    if (ms <= NO_SOUND_MS) add({ kind: 'next', ms, path });
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
    tapAt = 0;
    sending = false;
  },
};

function add(sample: Sample) {
  waiting = [...waiting, sample].slice(-KEPT);
}
