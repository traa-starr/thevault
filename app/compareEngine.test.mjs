// Self-test for Compare's sound rules: node --experimental-strip-types app/compareEngine.test.mjs
// Fake players stand in for expo-audio. Rules: one sound at all times, the borrowed queue player is never reloaded,
// Done hands back with no gap, paused stays paused.
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { compareWindow, createCompareEngine, dialReady, HANDOFF_MS, MAX_PLAYERS, WAIT_CAP_MS } from './compareEngine.ts';

mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'] });

const fake = (name, { loaded = true, duration = 200, seekLate = 0, slowPlay = false } = {}) => {
  const f = {
    name, currentTime: 0, duration, isLoaded: loaded, isBuffering: false, playing: false, starting: false, volume: 1,
    removed: false, plays: 0, seeks: [],
    play() { f.plays++; if (slowPlay) f.starting = true; else f.playing = true; },
    pause() { f.playing = false; f.starting = false; },
    seekTo(s) { f.seeks.push(s); f.currentTime = s - seekLate; return Promise.resolve(); },
    remove() { f.removed = true; f.playing = false; },
    addListener: () => ({ remove() {} }),
    setActiveForLockScreen() {},
    clearLockScreenControls() {},
  };
  return f;
};

const made = [];
let makeOpts = () => ({});
const makePlayer = (uri) => {
  const f = fake(uri, makeOpts(uri));
  made.push(f);
  return f;
};
const all = () => [queue, ...made].filter((f) => !f.removed);
const audible = () => all().filter((f) => f.playing && f.volume > 0);
const flush = () => new Promise((r) => setImmediate(r));
// time passes: every playing player moves on, then the engine's ticks run
async function pass(ms) {
  for (let t = 0; t < ms; t += 100) {
    all().forEach((f) => {
      if (f.starting) {
        f.starting = false; // a play() that takes a tick
        f.playing = true;
      } else if (f.playing) f.currentTime += 0.1;
    });
    mock.timers.tick(100);
    await flush();
    assert.ok(audible().length <= 1, `two playing at once: ${audible().map((f) => f.name)}`);
  }
}

let queue;
let ended = 0;
const titles = [];
const engineFor = () =>
  createCompareEngine({ onChange() {}, onEnd: () => ended++, makePlayer, lockScreen: (id) => titles.push(id) });
const uris = { a: 'A', b: 'B', c: 'C' };

// 1. Compare opens on the song already playing: it is borrowed, never reloaded or moved, and keeps playing
queue = fake('queue');
queue.playing = true;
queue.currentTime = 42;
let e = engineFor();
e.start('a', uris, 42, true, ['b'], (id) => id, queue);
assert.ok(!made.some((f) => f.name === 'A'), 'the playing song is not loaded again');
assert.equal(queue.seeks.length, 0, 'the playing song is not sought');
assert.equal(queue.volume, 1);
await pass(1000);
assert.ok(queue.playing && queue.currentTime > 42, 'it played on');
const b = made.find((f) => f.name === 'B');
assert.equal(b.volume, 0, 'the other version is silent');
assert.ok(Math.abs(b.currentTime - queue.currentTime) < 0.3, 'the other version is lined up');

// 2. A flip swaps volumes; the borrowed one goes silent but stays loaded and playing
e.flipTo('b');
await pass(300);
assert.equal(e.sounding(), 'b');
assert.equal(b.volume, 1);
assert.equal(queue.volume, 0);
assert.ok(!queue.removed);
assert.deepEqual(titles.at(-1), 'b', 'the lock screen names the version heard');

// 3. Done on b: the queue reloads b silently; b keeps sounding until the queue plays in line, then the queue takes over
let handed = 0;
queue.currentTime = 0;
queue.playing = false;
queue.isBuffering = true; // loading
e.handTo(queue, () => handed++);
await pass(500);
assert.equal(handed, 0, 'no hand-over while the queue loads');
assert.equal(b.volume, 1, 'b sounds meanwhile: no gap');
assert.ok(!b.removed);
queue.isBuffering = false;
await pass(1500);
assert.equal(handed, 1, 'handed over once the queue plays in line');
assert.equal(queue.volume, 1);
assert.ok(queue.playing);
assert.ok(made.every((f) => f.removed), "Compare's own players are gone");

// 4. The queue never lines up: it takes over anyway after HANDOFF_MS, so two never play on
made.length = 0;
queue = fake('queue');
queue.playing = true;
e = engineFor();
e.start('a', uris, 0, true, ['b'], (id) => id, queue);
await pass(500);
e.flipTo('b');
await pass(300);
handed = 0;
queue.isBuffering = true; // stuck loading
e.handTo(queue, () => handed++);
await pass(HANDOFF_MS + 300);
assert.equal(handed, 1);
assert.equal(queue.volume, 1);
assert.ok(made.every((f) => f.removed));

// 5. A tap mid hand-over finishes it at once
made.length = 0;
queue = fake('queue');
queue.playing = true;
e = engineFor();
e.start('a', uris, 0, true, ['b'], (id) => id, queue);
await pass(500);
e.flipTo('b');
await pass(300);
handed = 0;
queue.isBuffering = true;
e.handTo(queue, () => handed++);
e.finishNow();
assert.equal(handed, 1);
assert.equal(queue.volume, 1);
assert.ok(made.every((f) => f.removed));

// 6. Done on the queue's own song: stop leaves it playing, untouched, at full volume
made.length = 0;
queue = fake('queue');
queue.playing = true;
e = engineFor();
e.start('a', uris, 0, true, ['b', 'c'], (id) => id, queue);
await pass(500);
const seeks = queue.seeks.length;
e.stop();
assert.ok(queue.playing && !queue.removed && queue.volume === 1);
assert.equal(queue.seeks.length, seeks);
assert.ok(made.every((f) => f.removed));

// 7. Paused stays paused: nothing starts by itself, flips included
made.length = 0;
queue = fake('queue');
e = engineFor();
e.start('a', uris, 30, false, ['b', 'c'], (id) => id, queue);
await pass(500);
e.flipTo('b');
await pass(300);
e.flipTo('c');
await pass(120000);
assert.ok(all().every((f) => !f.playing), 'nothing plays while paused');
assert.equal(queue.plays, 0);
e.stop();

// 8. Fast swiping back and forth: only one version is ever heard (checked on every tick by pass)
made.length = 0;
queue = fake('queue');
queue.playing = true;
e = engineFor();
e.start('a', uris, 0, true, ['b', 'c'], (id) => id, queue);
await pass(500);
for (let i = 0; i < 10; i++) {
  e.keep(i % 2 ? ['a', 'b', 'c'] : ['a', 'b'], uris);
  e.flipTo(i % 2 ? 'b' : 'a');
  await pass(100);
}
await pass(1000);
assert.equal(audible().length, 1);
e.stop();

// 9. The borrowed song reaching its end (it loops while Compare has it) counts as the song's end
made.length = 0;
queue = fake('queue', { duration: 10 });
queue.playing = true;
queue.currentTime = 9.5;
e = engineFor();
ended = 0;
e.start('a', uris, 9.5, true, [], (id) => id, queue);
await pass(300);
queue.currentTime = 0.1; // looped
await pass(200);
assert.equal(ended, 1);
e.stop();

// 10. Library: no borrowed player, Compare makes its own for every version
made.length = 0;
queue = fake('queue');
e = createCompareEngine({ onChange() {}, onEnd() {}, makePlayer });
e.start('a', uris, 0, false, ['b'], (id) => id);
assert.deepEqual(made.map((f) => f.name).sort(), ['A', 'B']);
e.stop();
assert.ok(made.every((f) => f.removed));

// ---- Batch 6.4: instant flips (board tests) ----
let sound = null;
const engineSeen = () =>
  createCompareEngine({ onChange: (x) => (sound = x), onEnd: () => ended++, makePlayer, lockScreen: (id) => titles.push(id) });
const fresh = (playing = true, at = 0) => {
  made.length = 0;
  queue = fake('queue');
  queue.playing = playing;
  queue.currentTime = at;
  return engineSeen();
};
const many = Object.fromEntries('abcdefghijkl'.split('').map((id) => [id, id.toUpperCase()]));
const byName = (n) => made.find((f) => f.name === n && !f.removed);

// 11. Instant-ready players: once lined up, a flip lands at once, not seconds later
e = fresh();
e.start('a', uris, 0, true, ['b', 'c'], (id) => id, queue);
await pass(1000);
assert.ok(sound.aligned.b && sound.aligned.c, 'b and c lined up and marked aligned');
e.flipTo('b');
assert.equal(e.sounding(), 'b', 'the flip is immediate when the version is aligned');
e.flipTo('c');
assert.equal(e.sounding(), 'c');
e.stop();

// 12. A seek that lands 0.3 s late: the version learns its lag and still lines up
makeOpts = (n) => (n === 'B' ? { seekLate: 0.3 } : {});
e = fresh();
e.start('a', uris, 0, true, ['b'], (id) => id, queue);
await pass(4000);
assert.ok(sound.aligned.b, 'the late-seeking version lined up');
e.flipTo('b');
await pass(100);
assert.equal(e.sounding(), 'b');
e.stop();
makeOpts = () => ({});

// 13. 20 flips in one tick: exactly one audible every tick while playing, none while paused
e = fresh();
e.start('a', uris, 0, true, ['b', 'c'], (id) => id, queue);
await pass(1000);
for (let i = 0; i < 20; i++) e.flipTo('abc'[i % 3]);
assert.equal(audible().length, 1);
await pass(500);
assert.equal(audible().length, 1);
assert.equal(e.sounding(), 'abc'[19 % 3], 'the last gesture wins');
e.pause();
for (let i = 0; i < 20; i++) e.flipTo('abc'[i % 3]);
await pass(500);
assert.equal(audible().length, 0, 'none while paused');
e.stop();

// 14. play() that takes a tick: no flip onto a version that hasn't started yet
makeOpts = () => ({ slowPlay: true });
e = fresh(false, 10);
e.start('a', uris, 10, false, ['b'], (id) => id, queue);
await pass(500);
e.play();
e.flipTo('b');
assert.equal(e.sounding(), 'a', 'b still starting: a keeps sounding');
await pass(500);
assert.equal(e.sounding(), 'b');
assert.equal(audible().length, 1);
e.stop();
makeOpts = () => ({});

// 15. Fast swipe while paused: nothing starts, ends on the last one
e = fresh(false, 20);
e.start('a', uris, 20, false, ['b', 'c'], (id) => id, queue);
await pass(500);
for (let i = 0; i < 30; i++) {
  e.flipTo('abc'[i % 3]);
  if (i % 5 === 0) await pass(100);
}
await pass(500);
assert.equal(e.sounding(), 'abc'[29 % 3]);
assert.ok(all().every((f) => !f.playing), 'nothing plays while paused');
e.stop();

// 16. 12 versions vs the cap: never more than MAX_PLAYERS loaded; sounding and pending never dropped
const ids12 = Object.keys(many);
assert.equal(compareWindow(ids12, 0, []).length, MAX_PLAYERS);
assert.ok(compareWindow(ids12, 11, ['a']).includes('l'));
assert.ok(!compareWindow(ids12, 11, ['a']).includes('a'), 'far away: let go');
assert.ok(compareWindow(ids12, 5, ['d', 'e', 'f', 'g', 'h']).includes('d'), 'two rows away and loaded: sticky');
assert.ok(!compareWindow(ids12, 5, [], (id) => id === 'e').includes('e'), "a row that can't play never loads");
e = fresh();
e.start('a', many, 0, true, compareWindow(ids12, 0, []).filter((id) => id !== 'a'), (id) => id, queue);
await pass(2000);
assert.ok(all().length <= MAX_PLAYERS, `players: ${all().length}`); // the queue's player counts
e.flipTo('l'); // far past the window: pending, loads first
e.keep(compareWindow(ids12, 11, e.loadedIds()), many);
assert.ok(all().length <= MAX_PLAYERS, `never past the cap: ${all().length}`);
assert.ok(e.loadedIds().includes('a') && e.loadedIds().includes('l'), 'sounding and pending kept');
await pass(3000);
assert.equal(e.sounding(), 'l');
assert.equal(audible().length, 1);
e.keep(compareWindow(ids12, 11, e.loadedIds()), many);
await pass(1000);
assert.ok(all().length <= MAX_PLAYERS, `players after: ${all().length}`);
e.stop();

// 17. A player that never loads: it never counts as aligned; the dial opens at the cap anyway
makeOpts = (n) => (n === 'C' ? { loaded: false } : {});
e = fresh();
e.start('a', uris, 0, true, ['b', 'c'], (id) => id, queue);
await pass(1000);
assert.ok(sound.aligned.b && !sound.aligned.c);
assert.equal(dialReady(['a', 'b', 'c'], sound.aligned, () => false, 1000), false, 'still waiting on c');
assert.equal(dialReady(['a', 'b', 'c'], sound.aligned, () => false, WAIT_CAP_MS), true, 'opens at the cap');
assert.equal(dialReady(['a', 'b', 'c'], sound.aligned, (id) => id === 'c', 0), true, "c can't play: skipped");
// 18. ...and arrives late: it's marked aligned, and never flips by itself
byName('C').isLoaded = true;
await pass(2000);
assert.ok(sound.aligned.c, 'late arrival undims');
assert.equal(e.sounding(), 'a', 'no flip by itself');
e.stop();
makeOpts = () => ({});

// 19. Done after rapid flips, mid-load: one sound, handed over once
e = fresh();
e.start('a', uris, 0, true, ['b', 'c'], (id) => id, queue);
await pass(1000);
for (let i = 0; i < 7; i++) e.flipTo('bc'[i % 2]);
await pass(200);
handed = 0;
queue.currentTime = 0;
queue.playing = false;
queue.isBuffering = true;
e.handTo(queue, () => handed++);
await pass(300);
assert.equal(audible().length, 1, 'one sound mid-load');
queue.isBuffering = false;
await pass(1500);
assert.equal(handed, 1);
await pass(1000);
assert.equal(handed, 1, 'only once');
assert.ok(made.every((f) => f.removed));

// 20. Pause, seek, resume, flip: lands in line
e = fresh();
e.start('a', uris, 0, true, ['b'], (id) => id, queue);
await pass(1000);
e.pause();
await e.seek(90);
await pass(500);
e.play();
await pass(300);
e.flipTo('b');
await pass(300);
assert.equal(e.sounding(), 'b');
assert.ok(Math.abs(byName('B').currentTime - queue.currentTime) < 0.3, 'same second');
assert.equal(audible().length, 1);
e.stop();

// 21. The wait (follow): the queue's own buttons drive; Compare never plays or pauses the queue's player
e = fresh();
e.start('a', uris, 0, true, ['b'], (id) => id, queue);
e.follow(true);
await pass(1000);
const plays = queue.plays;
queue.playing = false; // the queue's Pause
await pass(300);
assert.ok(!byName('B').playing, 'the silent version paused with it');
await pass(3000);
assert.equal(queue.plays, plays, 'Compare never restarted the queue');
assert.ok(!queue.playing);
queue.playing = true; // the queue's Play
await pass(1500);
assert.ok(byName('B').playing && sound.aligned.b);
e.follow(false);
e.flipTo('b');
assert.equal(e.sounding(), 'b');
e.stop();

// 22. Song end fires once
made.length = 0;
queue = fake('queue', { duration: 10 });
queue.playing = true;
queue.currentTime = 9.5;
e = engineSeen();
ended = 0;
e.start('a', uris, 9.5, true, ['b'], (id) => id, queue);
await pass(300);
queue.currentTime = 0.1;
await pass(2000);
assert.equal(ended, 1);
e.stop();

mock.timers.reset();
console.log('compareEngine: all rules pass');
