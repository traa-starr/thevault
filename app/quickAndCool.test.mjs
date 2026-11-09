// Cool, quick and rated (NEXT 2026-11-09): node --experimental-strip-types app/quickAndCool.test.mjs
// A: the pressed look lets go on time during a slow load; the next song's info is ready before Next.
// B: the eye keeps my choice across songs and a restart.
// C: a locked hour on a pretend clock: wake-ups, redraws, network calls and file writes per minute, before and after.
// D: rating rules, and Shelved missing from every way the app picks a song while search still finds it.
// The model can't stand in for the phone (LESSONS): the phone's own `timings` energy lines are the proof of C.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { energyMeter, redrawFor, retryAfterMs, SPOT_EVERY_MS } from './energy.ts';
import { FLASH_MS, FLASH_TOTAL_MS, litAt, oldLetGoAt } from './pressLook.ts';
import {
  currentId, eyeSetting, nextInOrder, pickable, ratingAfterTap, ratingsFrom, ratingsWithPending, sessionLap, sessionPool,
  startOrder, tagIndex, upNext, walkAhead,
} from './playOrder.ts';
import { buildIndex, searchSongs } from './search.ts';
import { timing } from './timings.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const okAsync = async (name, fn) => {
  await fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

// ---------- A: the pressed look ------------------------------------------------------------------------------------
{
  const LOAD_MS = 2000; // the app's thread is busy this long after the tap (a slow load and its redraws)
  /** When the look is last lit, for a tap at `down` let go at `up`, with the thread busy until `freeAt`. */
  const newLetGo = (down) => {
    let last = down;
    for (let ms = 0; ms <= 3000; ms++) if (litAt(ms) > 0) last = down + ms;
    return last + 1;
  };
  ok(`a tap during a 2 s load: the look lets go ${newLetGo(0)} ms after finger-down (old: ${oldLetGoAt(80, LOAD_MS)} ms)`, () => {
    assert.ok(newLetGo(0) <= FLASH_MS + 30, 'lets go about 100 ms after the tap');
    assert.equal(oldLetGoAt(80, LOAD_MS), LOAD_MS, 'the old look waited for the thread');
    assert.ok(litAt(8) > 0.5 && litAt(16) === 1 && litAt(60) === 1, 'lit within a frame, and stays lit meanwhile');
    assert.equal(litAt(FLASH_TOTAL_MS), 0);
  });
  ok('a fast double tap during the load: each tap gets its own flash, neither stays lit', () => {
    const first = newLetGo(0);
    const second = newLetGo(180);
    assert.ok(first < 180, 'the first has let go before the second lands');
    assert.ok(second - 180 <= FLASH_MS + 30);
  });
  ok('the flash is one animation on the animation thread, and every player button uses it', () => {
    const tap = source('./Tap.tsx');
    assert.ok(tap.includes('useNativeDriver: true'), 'runs off the app thread');
    assert.ok(!/Animated\.(sequence|delay)/.test(tap), 'never a chain: a second step would wait for the app thread');
    assert.ok(tap.includes('onPressIn'), 'starts at finger-down, before the tap does its work');
    const player = source('./Player.tsx');
    assert.ok(!/p\.pressed|tint\(p\)|pressed &&/.test(player), 'no player button still draws its look from the app thread');
    for (const label of ['Previous', 'Next', "'Pause' : 'Play'", 'Not mine', 'Mine']) assert.ok(player.includes(label));
    assert.ok((player.match(/<Tap\b/g) ?? []).length >= 14, 'Previous, Play, Next, Shuffle, Fire, Shelve, Back, eye, Mine, Not mine, the bar, the session');
  });
}

// ---------- A: the next song's info is ready before the tap --------------------------------------------------------
{
  const copy = Array.from({ length: 600 }, (_, i) => ({ id: `t${i}`, song_id: `s${i % 120}`, text: `line ${i}`, at_sec: (i * 7) % 180, made_at: `2026-11-0${1 + (i % 9)}` }));
  const pending = [{ id: 'c1', kind: 'tag_add', data: { tag_id: 'new', song_id: 's5', text: 'unsent', at_sec: 3, made_at: 'x' } }];
  const index = tagIndex(copy, pending);
  ok('every song\'s tags are worked out once, the next song\'s included, before any tap', () => {
    const order = startOrder(Array.from({ length: 120 }, (_, i) => `s${i}`), 's4', false);
    const next = currentId(nextInOrder(order));
    assert.equal(next, 's5');
    const ready = index.get(next);
    assert.equal(ready.length, 6);
    assert.ok(ready.some((tag) => tag.id === 'new' && tag.onPhone), 'an unsent tag is in it');
    assert.ok(ready.every((tag, i) => i === 0 || ready[i - 1].at_sec <= tag.at_sec), 'in time order');
    assert.equal(index.get(next), ready, 'asking again is a lookup: the same list, nothing worked out at the tap');
  });
  ok('tagStore hands out that index, and the phone-copy check is remembered', () => {
    const store = source('./tagStore.ts');
    assert.ok(/indexNow\(laptopCopy, pending[^)]*\)\.get\(songId\)/.test(store));
    const offline = source('./offline.ts');
    assert.ok(offline.includes('const known = new Map'), 'each file is checked on disk once');
    for (const where of ['function tidy() {\n  known.clear()', 'known.delete(id)', 'known.delete(song.id)']) assert.ok(offline.includes(where), `forgotten when the file changes: ${where}`);
  });
}

// ---------- B: the eye keeps my choice -----------------------------------------------------------------------------
{
  const disk = { there: false, broken: false };
  const file = () => ({
    get exists() { return disk.there; },
    create() { if (disk.broken) throw new Error('full'); disk.there = true; },
    delete() { if (disk.broken) throw new Error('full'); disk.there = false; },
  });
  ok('the eye stays where I left it across 10 shuffled songs, and after a restart', () => {
    let eye = eyeSetting(file);
    assert.equal(eye.hidden(), false, 'a fresh phone: buttons showing');
    assert.equal(eye.toggle(), true);
    let order = startOrder(Array.from({ length: 30 }, (_, i) => `s${i}`), 's0', true, () => 0.37);
    for (let i = 0; i < 10; i++) {
      order = nextInOrder(order); // sorted, unsorted, Mine: nothing about the song reaches the eye
      assert.equal(eye.hidden(), true, `song ${i + 1}`);
    }
    eye = eyeSetting(file); // the app killed and opened again
    assert.equal(eye.hidden(), true, 'hidden after a restart');
    assert.equal(eye.toggle(), false);
    assert.equal(eyeSetting(file).hidden(), false, 'showing after a restart');
  });
  ok('toggled over and over, and with a file that can\'t be written: it still flips, never throws', () => {
    const eye = eyeSetting(file);
    for (let i = 0; i < 7; i++) eye.toggle();
    assert.equal(eye.hidden(), true);
    assert.equal(disk.there, true, 'the file follows');
    disk.broken = true;
    assert.equal(eye.toggle(), false);
    disk.broken = false;
    disk.there = false; // a re-sign or a wipe took the file
    assert.equal(eye.reload(), false, 'a missing file is just "showing"');
  });
  ok('nothing in the player changes the eye but my tap and a restore', () => {
    const store = source('./playerStore.ts');
    const sets = (store.match(/buttonsHidden: [^,}\n]+/g) ?? []).map((one) => one.trim());
    assert.deepEqual(sets.sort(), ['buttonsHidden: boolean;', 'buttonsHidden: buttonsHiddenFile().exists', 'buttonsHidden: eye.hidden()', 'buttonsHidden: eye.reload()', 'buttonsHidden: eye.toggle()'].sort());
    assert.ok(!store.includes('sortedAlready') && !store.includes('eyeFor'), 'the per-song rule is gone');
  });
}

// ---------- C: a locked hour ---------------------------------------------------------------------------------------
// The laptop's ceilings (server/vault_server/timings.py CEILINGS), per minute of playing, screen locked.
const CEILING = { reports: 130, redraws: 6, net: 2, writes: 6 };
{
  const HOUR = 3600 * 1000;
  const REPORT_MS = 500; // iOS tells the app the time twice a second while a song plays
  const SONG_MS = 180 * 1000;
  /** One locked hour of listening with the laptop off, 10 timings waiting and one change unsent. */
  function lockedHour(rules) {
    let now = 0;
    const samples = [];
    const meter = energyMeter((s) => samples.push(s), () => now);
    meter.setOpen(false);
    meter.setPlaying(true);
    let lastSave = 0;
    let nextTimingTry = 0;
    let timingFails = 0;
    let nextOutboxTry = 0;
    let outboxFails = 0;
    for (now = REPORT_MS; now <= HOUR; now += REPORT_MS) {
      meter.count('reports');
      const songChanged = now % SONG_MS === 0;
      const changed = songChanged ? ['order', 'song', 'time', 'duration', 'note', 'trouble'] : ['time', 'duration'];
      if (rules.redraw(changed)) meter.count('redraws');
      if (songChanged || now - lastSave >= rules.saveEvery) {
        lastSave = now;
        meter.count('writes');
      }
      // the laptop is off: every try is a network call that fails about 5 s later
      if (rules.timingsFromLock && now >= nextTimingTry) {
        meter.count('net');
        timingFails++;
        nextTimingTry = now + 5000 + rules.timingWait(timingFails);
      }
      if (rules.outboxRetries && now >= nextOutboxTry) {
        meter.count('net');
        outboxFails++;
        nextOutboxTry = now + 10000 + rules.outboxWait(outboxFails);
      }
    }
    meter.flush();
    const minutes = samples.reduce((sum, s) => sum + s.ms, 0) / 60000;
    const per = (key) => samples.reduce((sum, s) => sum + s[key], 0) / minutes;
    return { minutes, samples, reports: per('reports'), redraws: per('redraws'), net: per('net'), writes: per('writes') };
  }
  const before = lockedHour({
    redraw: () => true, // every report redrew the bar, the sheet, the toast and Queue
    saveEvery: 15000,
    timingsFromLock: true, timingWait: () => 0, // tried again on the next report, for as long as music played
    outboxRetries: true, outboxWait: () => 10000, // a fixed 10 s, for ever
  });
  const after = lockedHour({
    redraw: (changed) => redrawFor(false, changed),
    saveEvery: SPOT_EVERY_MS.locked,
    timingsFromLock: false, timingWait: () => 0,
    outboxRetries: false, outboxWait: (fails) => retryAfterMs(fails),
  });
  const line = (r) => `wake-ups ${r.reports.toFixed(0)}, redraws ${r.redraws.toFixed(1)}, network ${r.net.toFixed(1)}, writes ${r.writes.toFixed(1)}`;
  console.log(`      locked hour, per minute, before: ${line(before)}`);
  console.log(`      locked hour, per minute, after:  ${line(after)}`);
  ok('a locked hour stays under every ceiling (the old code broke three of them)', () => {
    assert.ok(Math.abs(after.minutes - 60) < 0.1 && after.samples.every((s) => s.where === 'locked'), 'the whole hour is measured as locked');
    for (const key of Object.keys(CEILING)) assert.ok(after[key] <= CEILING[key], `${key} ${after[key]} over ${CEILING[key]}`);
    assert.ok(before.redraws > CEILING.redraws && before.net > CEILING.net, 'the model sees the old causes');
    assert.ok(after.redraws < 1 && after.net === 0 && after.writes < 1.5);
  });
  ok('locked: only the clock moving draws nothing; a new song, a pause or trouble still does. Open: everything draws', () => {
    assert.equal(redrawFor(false, ['time', 'duration']), false);
    assert.equal(redrawFor(false, ['time', 'duration', 'wanted']), true);
    assert.equal(redrawFor(false, ['song']), true);
    assert.equal(redrawFor(true, ['time', 'duration']), true);
  });
  ok('the laptop off: tries wait 10 s, then double, 5 minutes at most', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 20].map((f) => retryAfterMs(f) / 1000), [10, 20, 40, 80, 160, 300, 300, 300]);
    let tries = 0;
    for (let at = 0, fails = 0; at < HOUR; at += retryAfterMs(++fails)) tries++;
    assert.ok(tries <= 16, `${tries} tries an hour with the phone open, not 360`);
  });
  ok('the meter counts only while a song plays, open and locked apart, and says where plays came from', () => {
    let now = 0;
    const out = [];
    const meter = energyMeter((s) => out.push(s), () => now);
    meter.count('net'); // nothing playing: not counted
    meter.play('phone');
    meter.setPlaying(true);
    for (now = 500; now <= 120000; now += 500) meter.count('reports');
    now = 120000;
    meter.play('stream');
    meter.setOpen(false); // locked: the open stretch closes
    for (now = 120500; now <= 240000; now += 500) meter.count('reports');
    now = 240000;
    meter.setPlaying(false);
    now += 600000; // paused for ten minutes: no time added
    meter.flush();
    assert.equal(out.length, 2);
    assert.deepEqual([out[0].where, Math.round(out[0].ms / 1000), out[0].reports, out[0].net, out[0].phone, out[0].stream], ['open', 120, 240, 0, 1, 1]);
    assert.deepEqual([out[1].where, Math.round(out[1].ms / 1000), out[1].reports], ['locked', 120, 240]);
    const short = [];
    const brief = energyMeter((s) => short.push(s), () => now);
    brief.setPlaying(true);
    now += 30000;
    brief.flush();
    assert.equal(short.length, 0, 'under a minute says nothing per minute');
  });
}

// ---------- C: the timings no longer hammer a laptop that is off ----------------------------------------------------
await okAsync('timings: after a failed send, nothing tries again by itself for a minute, then two, then four', async () => {
  timing.reset();
  let now = 1000000;
  let calls = 0;
  const off = async () => { calls++; throw new Error('laptop off'); };
  for (let i = 0; i < 12; i++) timing.search(5, 10);
  assert.equal(timing.ready(now), true);
  await timing.send('http://laptop', off, () => now);
  assert.equal(timing.ready(now + 59000), false, 'the old code tried again on the next player report');
  assert.equal(timing.ready(now + 61000), true);
  now += 61000;
  await timing.send('http://laptop', off, () => now);
  assert.equal(timing.ready(now + 119000), false);
  assert.equal(timing.ready(now + 121000), true);
  // the laptop is back: sent, with the phone's copy count riding along, and the wait is gone
  let body = null;
  timing.setCopies(670, 671);
  timing.energy({ kind: 'energy', where: 'locked', ms: 300000, reports: 600, redraws: 2, net: 0, writes: 5, phone: 2, stream: 0 });
  const on = async (_url, init) => { body = JSON.parse(init.body); return { ok: true }; };
  assert.equal(await timing.send('http://laptop', on, () => now), true);
  assert.deepEqual(body.copies, { stored: 670, wanted: 671 });
  assert.ok(body.samples.some((s) => s.kind === 'energy' && s.where === 'locked'));
  assert.equal(calls, 2);
  assert.equal(await timing.send('http://laptop', on, () => now), false, 'nothing new: no call at all');
  timing.setCopies(671, 671);
  assert.equal(await timing.send('http://laptop', on, () => now), true, 'a new count goes even with no timings waiting');
  timing.reset();
});

// ---------- D: rating ----------------------------------------------------------------------------------------------
{
  const rate = (song, value, id = `${song}-${value}-${Math.random()}`) => ({ id, kind: 'rating_set', data: { song_id: song, value } });
  ok('a tap turns a rating on, the same tap again turns it off; never a cycle', () => {
    assert.equal(ratingAfterTap(null, 'fire'), 'fire');
    assert.equal(ratingAfterTap('fire', 'fire'), 'none', 'a double tap on Fire ends unrated, never Shelved');
    assert.equal(ratingAfterTap('fire', 'shelved'), 'shelved');
    assert.equal(ratingAfterTap('shelved', 'shelved'), 'none');
  });
  ok('unsent taps sit on top of the laptop\'s ratings, in order: the latest wins', () => {
    const laptop = ratingsFrom([{ id: 'a', rating: 'fire' }, { id: 'b', rating: null }, { id: 'c' }, { id: 'd', rating: 'shelved' }, { id: 'e', rating: 'five stars' }]);
    assert.deepEqual([...laptop], [['a', 'fire'], ['d', 'shelved']]);
    const tag = { id: 't', kind: 'tag_add', data: { tag_id: 'x', song_id: 'a', text: '', at_sec: 1, made_at: '' } };
    const mine = { id: 'm', kind: 'mine_set', data: { song_id: 'a', value: 'not mine' } };
    // offline: Shelve b then Undo; Fire c; a from Fire to Shelved; d off the shelf
    const shown = ratingsWithPending(laptop, [rate('b', 'shelved'), tag, rate('b', 'none'), rate('c', 'fire'), mine, rate('a', 'shelved'), rate('d', 'none')]);
    assert.deepEqual([...shown].sort(), [['a', 'shelved'], ['c', 'fire']]);
    assert.deepEqual([...laptop], [['a', 'fire'], ['d', 'shelved']], 'the laptop\'s side is never changed in place');
  });

  // 40 Mine songs, 6 of them Shelved
  const songs = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, mine: 'mine' }));
  const shelved = new Set(['s3', 's4', 's11', 's20', 's21', 's39']);
  const isShelved = (id) => shelved.has(id);
  ok('Shelved never comes up on shuffle: 200 Nexts, the queue ahead, and Up next', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let order = startOrder(songs.map((s) => s.id), 's0', true, random);
    assert.ok(walkAhead(order, 30, shelved).every((o) => !isShelved(currentId(o))), 'the songs the player loads ahead');
    assert.ok(upNext(order, 200, shelved).every((id) => !isShelved(id)), 'Up next');
    const played = new Set(['s0']);
    for (let i = 0; i < 200; i++) {
      const moved = nextInOrder(order, shelved);
      if (!moved) { order = startOrder(songs.map((s) => s.id), 's0', true, random); continue; }
      order = moved;
      assert.ok(!isShelved(currentId(order)), `Next ${i} landed on a Shelved song`);
      played.add(currentId(order));
    }
    assert.equal(played.size, 34, 'every other song still comes up');
  });
  ok('a list played in order (shuffle off) is my own pick: it still plays every song; a Library shuffle never starts on one', () => {
    let order = startOrder(songs.map((s) => s.id), 's2', false);
    order = nextInOrder(order, shelved);
    assert.equal(currentId(order), 's3', 'list order plays every song in the list, as before');
    assert.ok(pickable(songs, isShelved).every((s) => !isShelved(s.id)) && pickable(songs, isShelved).length === 34);
  });
  ok('a tagging session never deals a Shelved song', () => {
    const pool = sessionPool(songs, (song) => !isShelved(song.id), () => false);
    assert.equal(pool.length, 34);
    const lap = sessionLap(pool, new Set());
    assert.ok(lap.every((id) => !isShelved(id)) && lap.length === 34);
  });
  ok('every song Shelved: Next says the list is done, it never loops or lands on one', () => {
    const order = startOrder(['s3', 's4'], 's3', true);
    assert.equal(nextInOrder(order, shelved), null);
  });
  ok('a Shelved song I pick myself still plays, and search still finds it (even as the only hit)', () => {
    const order = startOrder(songs.map((s) => s.id), 's3', false); // tapped directly
    assert.equal(currentId(order), 's3');
    const index = buildIndex([{ id: 't1', song_id: 's3', text: 'off direction but mine', at_sec: 30 }, { id: 't2', song_id: 's9', text: 'gold chain', at_sec: 4 }]);
    const { rows } = searchSongs(index, 'direction');
    assert.deepEqual(rows.map((r) => r.songId), ['s3']);
  });
  ok('the player, the session and Library all ask the one Shelved rule', () => {
    assert.ok(/const avoid = \(\) => \{[\s\S]*?ratingStore\.isShelved\(song\.id\)[\s\S]*?\};/.test(source('./playerStore.ts')), 'avoid(): Next, shuffle, lock screen, Up next');
    assert.ok(source('./playerStore.ts').includes('onRated(() => {'), 'a rating tap rebuilds what comes next');
    assert.ok(source('./sessionStore.ts').includes('!ratingStore.isShelved(song.id)'));
    assert.ok(source('./Library.tsx').includes('pickable(all, ratingStore.isShelved)'));
  });
}

console.log(`\nALL PASSED (${n})`);
