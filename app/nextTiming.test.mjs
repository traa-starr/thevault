// Next-to-first-sound, timed: node --experimental-strip-types app/nextTiming.test.mjs
// Screenshots can't hear (LESSONS). A fake playlist player on a pretend clock, with the delays the real one has: a song
// handed over fresh takes LOAD_MS to load, the songs already waiting in its queue are loaded, a seek takes SEEK_MS.
// It logs the moment sound first comes out and where. Pass: session Next and Sort-card Next both sound within 1 s, at
// their start spot (never 0:00), and the old full-reload path is shown to be the slow one. A model, not the phone:
// the phone's own numbers come from the timings report (`vault_cli.py timings`).
import assert from 'node:assert/strict';
import { playlistEngine } from './playlistCore.ts';
import { moveBy, SESSION_START_SEC, SORT_START_SEC } from './playOrder.ts';

const LOAD_MS = 800; // a fresh song: file opened, decoded far enough to play (worse with a full list rebuild)
const SEEK_MS = 300;
const LIMIT_MS = 1000;

function clockedList() {
  let now = 0;
  const timers = [];
  const listeners = {};
  const later = (ms, fn) => timers.push({ at: now + ms, fn });
  const list = {
    uris: [],
    ready: [], // per position: loaded?
    currentIndex: 0,
    currentTime: 0,
    playing: false,
    volume: 1,
    loop: 'none',
    first: null, // { ms, song, at }: first sound
    get now() { return now; },
    get isLoaded() { return !!this.ready[this.currentIndex]; },
    get isBuffering() { return false; },
    get trackCount() { return this.uris.length; },
    get duration() { return this.isLoaded ? 200 : 0; },
    addListener(event, fn) { listeners[event] = fn; },
    emit() { listeners.playlistStatusUpdate?.({ currentTime: this.currentTime, duration: this.duration, playing: this.playing, isBuffering: false, isLoaded: this.isLoaded, didJustFinish: false }); },
    hear() {
      if (!this.first && this.playing && this.isLoaded && this.volume > 0) this.first = { ms: now, song: this.uris[this.currentIndex], at: this.currentTime };
    },
    // a fresh song loads after LOAD_MS; the ones queued behind the current one are already loaded (the real queue preloads)
    fresh(i) {
      this.ready[i] = false;
      const uri = this.uris[i];
      later(LOAD_MS, () => { if (this.uris[i] === uri) { this.ready[i] = true; if (i === this.currentIndex) { this.hear(); this.emit(); } } });
    },
    add({ uri }) { this.uris.push(uri); this.ready.push(this.uris.length > 1 && this.ready.length > 0 ? 'queued' : false); if (this.uris.length === 1) this.fresh(0); },
    insert({ uri }, i) { this.uris.splice(i, 0, uri); this.ready.splice(i, 0, false); this.currentIndex++; this.currentTime = 0; this.fresh(this.currentIndex); },
    remove(i) { this.uris.splice(i, 1); this.ready.splice(i, 1); },
    clear() { this.uris = []; this.ready = []; this.currentIndex = 0; this.playing = false; this.currentTime = 0; },
    // the real skipTo rebuilds the list from there: every song made fresh again
    skipTo(i) { this.currentIndex = i; this.currentTime = 0; for (let k = i; k < this.uris.length; k++) this.fresh(k); this.moved(); },
    next() { this.currentIndex++; this.currentTime = 0; this.hear(); this.moved(); },
    previous() { this.currentIndex--; this.currentTime = 0; this.fresh(this.currentIndex); this.moved(); },
    moved() { listeners.trackChanged?.(); },
    play() { this.playing = true; this.hear(); },
    pause() { this.playing = false; },
    seekTo(s) { return new Promise((done) => later(SEEK_MS, () => { this.currentTime = s; done(); })); },
    setActiveForLockScreen() {},
    clearLockScreenControls() {},
    /** Runs the pretend clock until nothing is left to happen. */
    async run() {
      for (let guard = 0; guard < 1000; guard++) {
        await new Promise((r) => setTimeout(r, 0));
        timers.sort((a, b) => a.at - b.at);
        const t = timers.shift();
        if (!t) return;
        now = Math.max(now, t.at);
        t.fn();
        this.emit();
      }
    },
  };
  return list;
}

// a list playing song c (two behind, three ahead, as the player keeps it), the queued ones loaded
async function playing() {
  const list = clockedList();
  const engine = playlistEngine(list, { onSound: () => {}, onTrack: () => {} });
  engine.load(['a', 'b', 'c', 'd', 'e', 'f'], 2, 0, true);
  await list.run();
  list.ready = list.ready.map(() => true);
  list.first = null;
  return { list, engine, from: list.now };
}

const results = [];
async function timed(name, start, step) {
  const { list, engine, from } = await playing();
  step(engine);
  await list.run();
  assert.ok(list.first, `${name}: no sound at all`);
  const ms = list.first.ms - from;
  results.push(`${name}: first sound after ${ms} ms, at ${list.first.at}s of ${list.first.song}`);
  return { ms, first: list.first };
}

// the new path: through the queue, silent until the start spot
const session = await timed('session Next (queue)', SESSION_START_SEC, (e) => e.skip(1, SESSION_START_SEC));
const sort = await timed('Sort card Next (queue)', SORT_START_SEC, (e) => e.skip(1, SORT_START_SEC));
// the old path, for comparison: a full reload of the list carrying the spot
const old = await timed('old session Next (full reload)', SESSION_START_SEC, (e) => e.load(['b', 'c', 'd', 'e', 'f', 'g'], 2, SESSION_START_SEC, true));

assert.equal(moveBy(SESSION_START_SEC, true), 'queue', 'the session takes the queued song');
assert.equal(moveBy(SORT_START_SEC, true), 'queue', 'so does Sort');
for (const [r, at] of [[session, SESSION_START_SEC], [sort, SORT_START_SEC]]) {
  assert.equal(r.first.song, 'd', 'the next song');
  assert.equal(r.first.at, at, 'first sound is the start spot, never 0:00');
  assert.ok(r.ms <= LIMIT_MS, `${r.ms} ms is over 1 s`);
}
assert.ok(old.ms > LIMIT_MS, 'the model shows the old full reload as the slow one');

// five fast taps: only the last song sounds, at its spot, volume back
{
  const { list, engine, from } = await playing();
  list.ready = list.ready.map(() => true);
  engine.skip(1, 15);
  engine.skip(1, 15);
  engine.skip(1, 15);
  await list.run();
  assert.equal(list.first.song, 'f');
  assert.equal(list.first.at, 15);
  assert.equal(list.volume, 1, 'the volume came back');
  assert.ok(list.first.ms - from <= LIMIT_MS);
  results.push(`three fast Nexts: first sound after ${list.first.ms - from} ms, at 15s of f`);
}

// Previous rebuilds the list from one back (a fresh song): still at its spot, volume back
{
  const { list, engine } = await playing();
  engine.skip(-1, 15);
  await list.run();
  assert.equal(list.first.song, 'b');
  assert.equal(list.first.at, 15);
  assert.equal(list.volume, 1);
  results.push(`session Previous: first sound at 15s of b (fresh song: about ${LOAD_MS + SEEK_MS} ms)`);
}

// Library (no start point): straight to the queued song from 0:00, no pause
{
  const { list, engine, from } = await playing();
  engine.skip(1, 0);
  await list.run();
  assert.deepEqual([list.first.song, list.first.at, list.first.ms - from], ['d', 0, 0]);
}

console.log(results.join('\n'));
console.log('\nALL PASSED (next timing)');
