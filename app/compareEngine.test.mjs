// Self-test for Compare's sound rules: node --experimental-strip-types app/compareEngine.test.mjs
// Fake players stand in for expo-audio. Rules: one sound at all times, the borrowed queue player is never reloaded,
// Done hands back with no gap, paused stays paused.
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { createCompareEngine, HANDOFF_MS } from './compareEngine.ts';

mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'] });

const fake = (name, { loaded = true, duration = 200 } = {}) => {
  const f = {
    name, currentTime: 0, duration, isLoaded: loaded, isBuffering: false, playing: false, volume: 1,
    removed: false, plays: 0, seeks: [],
    play() { f.plays++; f.playing = true; },
    pause() { f.playing = false; },
    seekTo(s) { f.seeks.push(s); f.currentTime = s; return Promise.resolve(); },
    remove() { f.removed = true; f.playing = false; },
    addListener: () => ({ remove() {} }),
    setActiveForLockScreen() {},
    clearLockScreenControls() {},
  };
  return f;
};

const made = [];
const makePlayer = (uri) => {
  const f = fake(uri);
  made.push(f);
  return f;
};
const all = () => [queue, ...made].filter((f) => !f.removed);
const audible = () => all().filter((f) => f.playing && f.volume > 0);
const flush = () => new Promise((r) => setImmediate(r));
// time passes: every playing player moves on, then the engine's ticks run
async function pass(ms) {
  for (let t = 0; t < ms; t += 100) {
    all().forEach((f) => { if (f.playing) f.currentTime += 0.1; });
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

mock.timers.reset();
console.log('compareEngine: all rules pass');
