// What lives only on the phone, copied to the laptop so a delete-and-reinstall gets it back (DECISIONS 2026-11-06).
// The laptop keeps it as one file outside the journal: it records no choice. A fresh install never sends a backup
// until it has asked the laptop for the old one, so an empty phone can't overwrite the copy it needs.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { BACKUP_WITHIN_MS, choicesKey, HEALTH_GOOD_MS } from './energy';
import { ANSWERS_NOW_MS, backupDidntSave, callFailure, TIMED_OUT } from './laptopCore';
import { onOutbox, pendingNow, restoreChanges } from './outbox';
import { player } from './playerStore';
import type { Change } from './playOrder';
import { loadNotSure, saveNotSure } from './sortData';

const TIMEOUT_MS = 10000;
const EVERY_MS = 5 * 60 * 1000;
// player files copied as they are: the last song and spot, and the two display settings
const LAST_PLAY = 'last-play.json';
const PLAYER_FILES = [LAST_PLAY, 'time-left.txt', 'buttons-hidden.txt'];
// The laptop server's code this app needs (server.py SERVER_LEVEL). Raise both together.
export const NEEDS_SERVER = 5;

type Backup = {
  stamp: string;
  notSure: string[];
  outbox: Change[];
  files: Record<string, string>;
  saved_at?: string;
};
export type Restored = { savedAt: string; notSure: number; changes: number; lastSong: boolean; settings: boolean };
type State = {
  /** A fresh install that hasn't heard from the laptop's backup yet. */
  waiting: boolean;
  /** What came back after a reinstall, shown once until OK. */
  restored: Restored | null;
  /** The laptop answers, but runs older code than this app needs. */
  outOfDate: boolean;
  /** The laptop answered but didn't save the last copy. Cleared by the next one that saves. */
  saveFailed: boolean;
};

const file = (name: string) => new File(Paths.document, name);
const stampFile = () => file('survival-stamp.txt');
const waitingFile = () => file('restore-pending.txt');

/** Written once at first open and never changed: if this date changes, the phone wiped the app's data (ROADMAP 1.18).
 * Writing it also marks the install as fresh, so it asks the laptop for a backup before sending one. */
export function survivalStamp() {
  const stamp = stampFile();
  if (stamp.exists) return stamp.textSync().trim();
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const made = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
  const waiting = waitingFile();
  if (!waiting.exists) waiting.create();
  stamp.create();
  stamp.writeSync(made);
  update({ waiting: true });
  return made;
}

// still waiting from an earlier open that never reached the laptop
let state: State = { waiting: waitingFile().exists, restored: null, outOfDate: false, saveFailed: false };
let url = '';
let lastSent = '';
let soon: ReturnType<typeof setTimeout> | undefined;
let every: ReturnType<typeof setInterval> | undefined;
let busy = false;
let healthAt = 0; // when the laptop last said which version it runs (0: ask before the next backup)
let away = false; // the app is in the background
const listeners = new Set<() => void>();

const update = (changes: Partial<State>) => {
  state = { ...state, ...changes };
  listeners.forEach((listener) => listener());
};

const readText = (name: string) => {
  try {
    const f = file(name);
    return f.exists ? f.textSync() : null;
  } catch {
    return null;
  }
};

const gather = (): Backup => {
  const files: Record<string, string> = {};
  PLAYER_FILES.forEach((name) => {
    const text = readText(name);
    if (text !== null) files[name] = text;
  });
  return { stamp: survivalStamp(), notSure: [...loadNotSure()], outbox: pendingNow(), files };
};

async function call(path: string, init?: RequestInit, timeout = TIMEOUT_MS) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeout);
  try {
    const r = await fetch(`${url}${path}`, { ...init, signal: abort.signal });
    if (!r.ok) throw new Error(`Server said ${r.status}`);
    return await r.json();
  } catch (e) {
    // our own wait ran out: said apart from "no answer at all", which is what a laptop that's off gives
    if (abort.signal.aborted) throw new Error(TIMED_OUT);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Puts back what the laptop kept. Only fills what's missing: nothing newer on this phone is replaced. */
function apply(backup: Backup): Restored {
  const notSure = loadNotSure();
  const before = notSure.size;
  (Array.isArray(backup.notSure) ? backup.notSure : []).forEach((id) => typeof id === 'string' && notSure.add(id));
  if (notSure.size !== before) saveNotSure(notSure);
  const changes = restoreChanges(Array.isArray(backup.outbox) ? backup.outbox : []);
  const back: string[] = [];
  Object.entries(backup.files ?? {}).forEach(([name, text]) => {
    if (!PLAYER_FILES.includes(name) || typeof text !== 'string' || file(name).exists) return;
    try {
      const f = file(name);
      f.create();
      f.writeSync(text);
      back.push(name);
    } catch {
      // a full phone: that one stays lost, the rest still come back
    }
  });
  const settings = back.some((name) => name !== LAST_PLAY);
  if (settings) player.reloadSettings();
  if (back.includes(LAST_PLAY)) player.restore(url);
  return { savedAt: backup.saved_at ?? '', notSure: notSure.size - before, changes, lastSong: back.includes(LAST_PLAY), settings };
}

/** A fresh install asks the laptop for its backup once it answers. Nothing there, or this phone's own: nothing to say. */
async function fetchBack() {
  const answer: { backup: Backup | null } = await call('/phone-backup');
  const backup = answer.backup;
  const restored = backup && backup.stamp !== survivalStamp() ? apply(backup) : null;
  try {
    waitingFile().delete();
  } catch {
    // already gone
  }
  update({ waiting: false, restored });
}

async function send() {
  if (!url || busy) return;
  busy = true;
  try {
    // the laptop's version: asked on open, on a retry tap and every few minutes, not before every backup
    if (Date.now() - healthAt >= HEALTH_GOOD_MS || state.outOfDate) {
      let health: { server?: unknown };
      try {
        health = await call('/health');
      } catch {
        return; // laptop off: Library says so already. The next open, change or timer tries again
      }
      healthAt = Date.now();
      const outOfDate = !(typeof health.server === 'number' && health.server >= NEEDS_SERVER);
      if (outOfDate !== state.outOfDate) update({ outOfDate });
    }
    try {
      if (state.waiting) await fetchBack();
      const body = JSON.stringify(gather());
      if (body === lastSent) return;
      await call('/phone-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Vault-Client': 'app' },
        body,
      });
      lastSent = body;
      if (state.saveFailed) update({ saveFailed: false });
    } catch (e) {
      const failure = callFailure(String(e instanceof Error ? e.message : e));
      // a timeout is what a laptop that's off looks like, and also a laptop that's on but slow with a big backup:
      // one small call tells them apart (wave 3 review, catch 5: every timeout used to read as "laptop off")
      // (a fresh install still waiting for its old backup has sent nothing: its timeout is never "didn't save")
      let answersNow = false;
      if (failure === 'timeout' && !state.waiting) {
        try {
          await call('/health', undefined, ANSWERS_NOW_MS);
          answersNow = true;
        } catch {
          // off after all
        }
      }
      // the laptop didn't answer at all (off, or out of reach since its version was asked): nothing to say here,
      // Library says so; the version is asked again next time
      if (!backupDidntSave(failure, answersNow, state.waiting)) {
        healthAt = 0;
        return;
      }
      // the laptop answered but didn't take it (older code, a full disk, too slow): say so, and try again later.
      // A fresh install keeps waiting and sends nothing.
      if (!state.saveFailed) update({ saveFailed: true });
    }
  } finally {
    busy = false;
  }
}

export const phoneBackup = {
  /** On open and each time the app comes back to the front. */
  start(serverUrl: string) {
    url = serverUrl;
    away = false;
    healthAt = 0;
    clearInterval(every);
    every = setInterval(send, EVERY_MS);
    send();
  },

  /** The app went to the back: one last copy while iOS still lets it run, then quiet. */
  pause() {
    clearInterval(every);
    every = undefined;
    clearTimeout(soon);
    soon = undefined; // this send covers it; the next choice after coming back starts its own minute
    away = true;
    send();
  },

  /** A choice of mine joined or left the outbox: a copy goes within a minute. One already on its way covers this
   * change too, so a run of choices makes one backup, not one each. */
  soon() {
    if (away || soon !== undefined) return; // locked: it waits for the next open (no network while locked)
    soon = setTimeout(() => {
      soon = undefined;
      send();
    }, BACKUP_WITHIN_MS);
  },

  dismiss: () => update({ restored: null }),

  /** Ask the laptop again now: a tap on the out-of-date or not-saved line. */
  retry: () => {
    healthAt = 0;
    return send();
  },
};

// A choice of mine joining or leaving the outbox: a copy goes soon. A play is not a choice (it is safe in the outbox
// and on its way to the laptop already): it used to cost a backup each, two more network calls a song (2026-11-11).
let choicesWas = choicesKey(pendingNow());
onOutbox(() => {
  const choices = choicesKey(pendingNow());
  if (choices === choicesWas) return;
  choicesWas = choices;
  phoneBackup.soon();
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const usePhoneBackup = () => useSyncExternalStore(subscribe, () => state);
