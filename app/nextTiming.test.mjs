// Tap-to-first-sound, timed: node --experimental-strip-types app/nextTiming.test.mjs
// Screenshots can't hear (LESSONS). A fake iPhone playlist on a pretend clock, with a pretend JavaScript thread: the app's
// code (status reports, the seek finishing, the 25 ms "loaded?" checks) only runs when that thread is free, and a redraw
// keeps it busy. The waits are the phone's (NEXT 2026-11-08 "play first"):
// - SEEK_MS: a seek on a song already loaded. The phone's Sort cards (no Library underneath) took 91 ms typical for
//   seek + start, so 60 + up to one 25 ms check.
// - RENDER_MS: one redraw of Library under the player. Not measurable here: set so the old session Next lands on the
//   phone's 797 ms. Sort replaces Library on screen (App.tsx), a session opens over it, which is the only difference
//   between the two paths. The phone's own stage timings (load, seek, start; the rest is this thread) prove or disprove it.
// - LOAD_MS: a fresh song (Previous rebuilds one): a guess, reported per path by the phone now.
// Pass: the old code reproduces ~800 ms for session Next and ~90 for Sort; the new code is under 300 for both; first
// sound never waits on a redraw of song info on any path; the timing stops at real sound, never at a muted start.
import assert from 'node:assert/strict';
import { playlistEngine } from './playlistCore.ts';
import { SESSION_START_SEC, shownLength, SORT_START_SEC } from './playOrder.ts';
import { PATHS, timing } from './timings.ts';

const SEEK_MS = 60;
const RENDER_MS = 180;
const LOAD_MS = 600;
const STATUS_MS = 500;
const POLL_MS = 25;
const PHONE_SESSION_MS = 797;
const PHONE_SORT_MS = 91;
const TARGET_MS = 300;

/** The phone: a playlist player plus the app's one thread. `library`: 'none' (Sort), 'every' (old: Library redraws on
 * every player change), 'deferred' (new: it redraws only on a song change, at low priority, after the sound). */
function phone({ library = 'none', infoMs = 0 } = {}) {
  let now = 0;
  let jsFree = 0;
  const timers = [];
  const listeners = {};
  const later = (ms, fn, js = true) => timers.push({ at: now + ms, fn, js });
  const busy = (ms) => (jsFree = Math.max(now, jsFree) + ms);
  const lengthOf = (uri) => (uri.startsWith('short') ? 10 : 200);
  const list = {
    uris: [], ready: [], currentIndex: 0, playing: false, loop: 'none', first: null, heardAt: null, stages: null,
    base: 0, startedAt: 0, vol: 1,
    get now() { return now; },
    get isLoaded() { return !!this.ready[this.currentIndex]; },
    get isBuffering() { return false; },
    get trackCount() { return this.uris.length; },
    get duration() { return this.isLoaded ? lengthOf(this.uris[this.currentIndex]) : 0; },
    get currentTime() { return this.playing && this.isLoaded ? this.base + (now - this.startedAt) / 1000 : this.base; },
    get volume() { return this.vol; },
    set volume(v) { this.vol = v; this.sound(); },
    fold() { this.base = this.currentTime; this.startedAt = now; },
    sound() {
      if (!this.first && this.playing && this.isLoaded && this.vol > 0) this.first = { ms: now, song: this.uris[this.currentIndex], at: Math.round(this.currentTime) };
    },
    addListener(event, fn) { listeners[event] = fn; },
    // a report from iOS reaches the app when its thread is free; the old Library redrew on every one
    emit() {
      later(0, () => {
        if (library === 'every') busy(RENDER_MS);
        listeners.playlistStatusUpdate?.({ currentTime: this.currentTime, duration: this.duration, playing: this.playing, isBuffering: false, isLoaded: this.isLoaded, didJustFinish: false });
      });
    },
    moved() {
      later(0, () => {
        if (library === 'every') busy(RENDER_MS); // the song changed: Library redraws (old: in front of everything)
        listeners.trackChanged?.();
      });
      this.emit();
    },
    fresh(i) {
      this.ready[i] = false;
      const uri = this.uris[i];
      later(LOAD_MS, () => { if (this.uris[i] === uri) { if (i === this.currentIndex) this.startedAt = now; this.ready[i] = true; this.sound(); if (i === this.currentIndex) this.emit(); } }, false);
    },
    add({ uri }) { this.uris.push(uri); this.ready.push(this.uris.length > 1); if (this.uris.length === 1) this.fresh(0); },
    insert({ uri }, i) { this.uris.splice(i, 0, uri); this.ready.splice(i, 0, false); this.currentIndex++; this.base = 0; this.fresh(this.currentIndex); },
    remove(i) { this.uris.splice(i, 1); this.ready.splice(i, 1); },
    clear() { this.uris = []; this.ready = []; this.currentIndex = 0; this.playing = false; this.base = 0; },
    skipTo(i) { this.fold(); this.currentIndex = i; this.base = 0; for (let k = i; k < this.uris.length; k++) this.fresh(k); this.moved(); },
    next() { this.fold(); this.currentIndex++; this.base = 0; this.sound(); this.moved(); },
    previous() { this.fold(); this.currentIndex--; this.base = 0; this.fresh(this.currentIndex); this.moved(); },
    play() { this.fold(); this.playing = true; this.sound(); },
    pause() { this.fold(); this.playing = false; },
    seekTo(s) {
      return new Promise((done) => later(SEEK_MS, () => { this.base = s; this.startedAt = now; later(0, done); }, false));
    },
    setActiveForLockScreen() {},
    clearLockScreenControls() {},
  };
  const clock = { now: () => now, later: (ms, fn) => later(ms, fn) };
  const engine = playlistEngine(list, {
    onSound: () => {},
    onTrack: () => {},
    onStarted: (stages) => { list.heardAt = now; list.stages = stages; },
  }, clock);
  /** The app redrawing the player's song info (title, length, tags) right after a tap; Library only in the old code. */
  const info = () => {
    busy(infoMs);
    if (library === 'every') busy(RENDER_MS);
  };
  /** Runs the pretend phone for `ms`. */
  async function run(ms) {
    const end = now + ms;
    while (true) {
      for (let i = 0; i < 6; i++) await null; // the app's promises settle (a seek's then, catch, finally)
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > end) break;
      timers.shift();
      if (t.js && jsFree > t.at) { // the thread is busy: the app's code waits its turn
        timers.push({ ...t, at: jsFree });
        continue;
      }
      now = Math.max(now, t.at);
      t.fn();
    }
    now = Math.max(now, end);
  }
  // iOS reports every 0.5 s while playing
  const tick = () => { if (list.playing) list.emit(); later(STATUS_MS, tick, false); };
  later(STATUS_MS, tick, false);
  /** App code that runs once the thread is free (the old loadOrder asked for the sound in a promise after the redraw). */
  const soon = (fn) => later(0, fn);
  return { list, engine, run, info, busy, soon, get now() { return now; } };
}

/** A phone already playing song c of a-f (two behind, three ahead, as the player keeps it), the queued ones loaded. */
async function playing(options, uris = ['a', 'b', 'c', 'd', 'e', 'f']) {
  const p = phone(options);
  p.engine.load(uris, 2, 0, true);
  await p.run(1500);
  p.list.ready = p.list.ready.map(() => true);
  p.list.first = null;
  p.list.heardAt = null;
  return { ...p, from: p.now };
}

const results = [];
/** One tap: `act` is what the app does with the sound, `after` the screen update. Old order: screen first. */
async function timed(name, options, act, { oldOrder = false, uris } = {}) {
  const p = await playing(options, uris);
  if (oldOrder) {
    p.info();
    p.soon(() => act(p.engine, p.list));
  } else {
    act(p.engine, p.list);
    p.info();
  }
  await p.run(3000);
  assert.ok(p.list.first, `${name}: no sound at all`);
  const ms = p.list.first.ms - p.from;
  results.push(`${name}: ${ms} ms to first sound, at ${p.list.first.at}s of ${p.list.first.song}`);
  return { ms, first: p.list.first, heardAt: p.list.heardAt === null ? null : p.list.heardAt - p.from, stages: p.list.stages, list: p.list };
}

const sessionNext = (e) => e.skip(1, SESSION_START_SEC);
const sortNext = (e) => e.skip(1, SORT_START_SEC);

// 1. The phone's numbers, reproduced: Sort (no Library underneath) ~90 ms, session (Library redrawing on every report
// and every song change, in front of the seek finishing) ~800 ms
const oldSort = await timed('old Sort card Next', { library: 'none' }, sortNext);
const oldSession = await timed('old session Next (Library under it)', { library: 'every' }, sessionNext);
assert.ok(Math.abs(oldSort.ms - PHONE_SORT_MS) <= 40, `old Sort ${oldSort.ms} ms, phone said ${PHONE_SORT_MS}`);
assert.ok(Math.abs(oldSession.ms - PHONE_SESSION_MS) <= 100, `old session ${oldSession.ms} ms, phone said ${PHONE_SESSION_MS}`);

// 2. The fix: Library redraws only when the song changes, at low priority, after the sound
const newSession = await timed('new session Next (Library deferred)', { library: 'deferred' }, sessionNext);
const newSort = await timed('new Sort card Next', { library: 'none' }, sortNext);
for (const [r, at] of [[newSession, SESSION_START_SEC], [newSort, SORT_START_SEC]]) {
  assert.equal(r.first.song, 'd', 'the next song');
  assert.equal(r.first.at, at, 'first sound is the start spot, never 0:00');
  assert.ok(r.ms < TARGET_MS, `${r.ms} ms is over ${TARGET_MS}`);
}
assert.ok(newSession.ms <= 2 * newSort.ms, 'session within 2x Sort');

// 3. Every play path: first sound never waits on the song's info being drawn (a 1 s redraw of title, length and tags
// right after the tap changes nothing for paths with no spot to find, and Library never sits in front)
const paths = {
  session: (e) => e.skip(1, SESSION_START_SEC),
  sort: (e) => e.skip(1, SORT_START_SEC),
  library: (e) => e.skip(1, 0),
  previous: (e) => e.skip(-1, SESSION_START_SEC),
  // iOS starts the next song by itself, from 0:00, before the app hears of it (a blip it silences at once, DECISIONS
  // 2026-11-08): timed from there to the sound at the spot
  lockscreen: (e, l) => { l.next(); l.first = null; e.startHere(SESSION_START_SEC); },
  'library tap': (e) => e.load(['x', 'y', 'z'], 0, 0, true),
  search: (e) => e.load(['x', 'y', 'z'], 0, 42, true),
  restore: (e) => { e.load(['x', 'y', 'z'], 0, 42, false); e.play(); },
};
for (const [name, act] of Object.entries(paths)) {
  const plain = await timed(`${name}`, { library: 'deferred' }, act);
  const info = await timed(`${name}, 1 s info redraw`, { library: 'deferred', infoMs: 1000 }, act);
  const noSpot = name === 'library' || name === 'library tap';
  if (noSpot) assert.equal(info.ms, plain.ms, `${name}: the sound waited on the song info`);
  // with a spot to find, the song was already loading and seeking: only the app's last step can wait for the thread
  else assert.ok(info.ms <= Math.max(plain.ms, 1000 + SEEK_MS + 2 * POLL_MS), `${name}: ${info.ms} ms, the sound waited on more than the redraw`);
  // the timing stops at real sound: never before it, at most one 25 ms check after
  assert.ok(plain.heardAt !== null, `${name}: never timed`);
  assert.ok(plain.heardAt >= plain.ms && plain.heardAt - plain.ms <= POLL_MS, `${name}: timed at ${plain.heardAt}, sound at ${plain.ms}`);
  assert.ok(plain.list.volume === 1, `${name}: volume came back`);
}
// the old order (screen first, then the sound) puts the whole load behind the redraw
{
  const old = await timed('search, old order, 1 s info redraw', { library: 'deferred', infoMs: 1000 }, paths.search, { oldOrder: true });
  const now = await timed('search, new order, 1 s info redraw', { library: 'deferred', infoMs: 1000 }, paths.search);
  assert.ok(old.ms >= 1000 + LOAD_MS, `old order ${old.ms}`);
  assert.ok(now.ms < old.ms - LOAD_MS / 2, `new order ${now.ms} vs old ${old.ms}`);
}
// the stages add up to the time: load + seek + start = the whole wait, nothing hidden
{
  const r = await timed('previous (fresh song)', { library: 'deferred' }, paths.previous);
  assert.ok(r.stages.load >= LOAD_MS - POLL_MS && r.stages.load <= LOAD_MS + POLL_MS, `load stage ${r.stages.load}`);
  assert.equal(r.stages.seek, SEEK_MS);
  assert.ok(Math.abs(r.stages.load + r.stages.seek + r.stages.start - r.heardAt) <= POLL_MS, 'stages add up');
  assert.equal(r.first.at, SESSION_START_SEC);
}

// 4. Three fast Nexts: only the last song sounds, at its spot, volume back
{
  const p = await playing({ library: 'deferred' });
  p.engine.skip(1, 15);
  p.engine.skip(1, 15);
  p.engine.skip(1, 15);
  await p.run(3000);
  assert.equal(p.list.first.song, 'f');
  assert.equal(p.list.first.at, 15);
  assert.equal(p.list.volume, 1, 'the volume came back');
  assert.ok(p.list.first.ms - p.from < TARGET_MS);
  results.push(`three fast Nexts: ${p.list.first.ms - p.from} ms, at 15s of f`);
}

// 5. Lock-screen Next while paused: stays paused and silent, volume back for the next Play
{
  const p = await playing({ library: 'deferred' });
  p.list.pause();
  p.list.next();
  p.engine.startHere(SESSION_START_SEC);
  await p.run(3000);
  assert.equal(p.list.first, null, 'nothing heard');
  assert.equal(p.list.playing, false);
  assert.equal(p.list.volume, 1);
  assert.equal(Math.round(p.list.currentTime), SESSION_START_SEC, 'waiting at its spot');
}

// 6. A song shorter than its start spot plays from 0:00 (the length iOS reports decides, never a stored one)
{
  const r = await timed('short song (10 s)', { library: 'deferred' }, sessionNext, { uris: ['a', 'b', 'c', 'short', 'e', 'f'] });
  assert.equal(r.first.at, 0);
}

// 6b. The length shown (NEXT C): the laptop's at once, kept unless the phone's differs by over 2 s; none known: "–:––" (0)
assert.equal(shownLength(183.4, 0), 183.4, 'at the tap, before the phone has loaded it');
assert.equal(shownLength(183.4, 184.9), 183.4, 'close enough: nothing moves');
assert.equal(shownLength(183.4, 190), 190, 'really different (stored wrong): the phone wins');
assert.equal(shownLength(0, 0), 0, 'no length anywhere yet');
assert.equal(shownLength(0, 201), 201, 'a new song the laptop has no length for');

// 7. Every path sends its timing under its own name, with its stages and source, numbers only (fake report)
{
  timing.reset();
  timing.setVersion('test');
  let t = 1000;
  for (const path of PATHS) {
    timing.tap(path, { src: 'phone', ext: 'mp3' }, t);
    timing.heard({ load: 5, seek: 60, reseek: false, start: 20 }, t + 100);
    t += 1000;
  }
  timing.tap('session', null, t);
  timing.tap('previous', null, t + 10); // a newer tap replaces the last: one timing, the newest path
  timing.heard(null, t + 60);
  timing.heard(null, t + 70); // a second report of sound for one tap counts once
  timing.tap('sort', null, t + 100);
  timing.cancel(); // a tap that made no sound (not on this phone)
  timing.heard(null, t + 200);
  let sent = null;
  const ok = await timing.send('http://laptop', async (url, init) => ((sent = { url, body: JSON.parse(init.body) }), { ok: true }));
  assert.ok(ok && sent.url === 'http://laptop/timings');
  const nexts = sent.body.samples;
  assert.deepEqual(nexts.map((one) => one.path), [...PATHS, 'previous']);
  assert.deepEqual(nexts[0], { kind: 'next', ms: 100, path: 'session', load: 5, seek: 60, reseek: false, start: 20, src: 'phone', ext: 'mp3' });
  assert.equal(nexts.at(-1).ms, 50);
  assert.equal(sent.body.version, 'test');
  results.push(`fake report: ${nexts.length} samples, paths ${nexts.map((one) => one.path).join(', ')}`);
}

console.log(results.join('\n'));
console.log('\nALL PASSED (next timing)');
