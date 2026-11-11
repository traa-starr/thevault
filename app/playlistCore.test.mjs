// Self-test for the playlist player's start spots: node --experimental-strip-types app/playlistCore.test.mjs
// Screenshots can't hear, so a fake player logs every moment sound would come out (playing, loaded, volume up) and the
// spot it comes out at. Pass: the first sound of a song is its start spot, never 0:00.
import assert from 'node:assert/strict';
import { clampStart, playlistEngine } from './playlistCore.ts';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeList(lengths) {
  const listeners = {};
  const list = {
    uris: [],
    currentIndex: 0,
    currentTime: 0,
    isLoaded: false,
    isBuffering: false,
    playing: false,
    volume: 1,
    loop: 'none',
    heard: [], // { song, at }: sound came out
    get trackCount() { return this.uris.length; },
    get duration() { return this.isLoaded ? lengths[this.uris[this.currentIndex]] ?? 200 : 0; },
    addListener(event, fn) { listeners[event] = fn; },
    emit() {
      listeners.playlistStatusUpdate?.({ currentTime: this.currentTime, duration: this.duration, playing: this.playing, isBuffering: false, isLoaded: this.isLoaded, didJustFinish: false });
    },
    hear() {
      if (this.playing && this.isLoaded && this.volume > 0) this.heard.push({ song: this.uris[this.currentIndex], at: this.currentTime });
    },
    moved() { this.currentTime = 0; this.isLoaded = false; listeners.trackChanged?.(); },
    add({ uri }) { this.uris.push(uri); },
    insert({ uri }, i) { this.uris.splice(i, 0, uri); this.currentIndex++; this.currentTime = 0; this.isLoaded = false; },
    remove(i) { this.uris.splice(i, 1); },
    clear() { this.uris = []; this.currentIndex = 0; this.playing = false; this.isLoaded = false; this.currentTime = 0; },
    skipTo(i) { this.currentIndex = i; this.moved(); },
    // the real player moves on and keeps playing: sound at 0:00 as soon as the song loads, unless someone stops it first
    next() { this.currentIndex++; this.moved(); },
    previous() { this.currentIndex--; this.moved(); },
    play() { this.playing = true; this.hear(); },
    pause() { this.playing = false; },
    async seekTo(s) { await flush(); this.currentTime = s; },
    /** The song finished loading: the player starts making sound if it's playing. */
    async load() { this.isLoaded = true; this.hear(); this.emit(); await flush(); await flush(); },
    setActiveForLockScreen() {},
    clearLockScreenControls() {},
  };
  return list;
}

const make = (lengths = {}, startPoint = 0) => {
  const list = fakeList(lengths);
  let engine;
  engine = playlistEngine(list, { onSound: () => {}, onTrack: () => { if (startPoint > 0) engine.startHere(startPoint); } });
  return { list, engine, from: (n) => list.heard.slice(n) };
};

// 1. A load with a start spot: nothing heard until the seek lands; first sound is 0:15
{
  const { list, engine } = make();
  engine.load(['a', 'b', 'c'], 0, 15, true);
  assert.equal(list.playing, false, 'not playing before the song has loaded and found its spot');
  await list.load();
  assert.deepEqual(list.heard, [{ song: 'a', at: 15 }]);
}

// 2. Five fast loads (big Next tapped fast), each before the last one loaded: only the last plays, at its spot
{
  const { list, engine } = make();
  for (const id of ['a', 'b', 'c', 'd', 'e']) engine.load([id, 'x'], 0, 15, true);
  await list.load();
  assert.deepEqual(list.heard, [{ song: 'e', at: 15 }]);
}

// 3. Next while the last song is still seeking: the old seek's finish doesn't start anything
{
  const { list, engine } = make();
  engine.load(['a'], 0, 30, true);
  list.isLoaded = true;
  list.emit(); // seek to 30 starts
  engine.load(['b'], 0, 30, true); // before it lands
  await flush();
  assert.equal(list.playing, false, 'the old seek finishing must not play the new song early');
  await list.load();
  assert.deepEqual(list.heard, [{ song: 'b', at: 30 }]);
}

// 4. A song shorter than its start point starts at 0:00
{
  const { list, engine } = make({ short: 10 });
  engine.load(['short'], 0, 15, true);
  await list.load();
  assert.deepEqual(list.heard, [{ song: 'short', at: 0 }]);
  assert.equal(clampStart(15, 10), 0);
  assert.equal(clampStart(15, 15), 0);
  assert.equal(clampStart(15, 16), 15);
  assert.equal(clampStart(15, 0), 15, 'length not known yet: the spot stands');
}

// 5. The lock screen's Next (the player moves by itself): silent until 0:15, then the volume comes back
{
  const { list, engine, from } = make({}, 15);
  engine.load(['a', 'b', 'c'], 0, 15, true);
  await list.load();
  const n = list.heard.length;
  list.next(); // the real player: next song, still playing
  await list.load();
  assert.deepEqual(from(n), [{ song: 'b', at: 15 }], 'no sound from 0:00 after a lock-screen Next');
  assert.equal(list.volume, 1, 'volume back after the seek');
  assert.equal(list.playing, true);
}

// 6. Two lock-screen Nexts before the first lands: still silent until the spot, and the volume comes back to 1, not 0
{
  const { list, engine, from } = make({}, 15);
  engine.load(['a', 'b', 'c'], 0, 15, true);
  await list.load();
  const n = list.heard.length;
  list.next();
  list.next();
  await list.load();
  assert.deepEqual(from(n), [{ song: 'c', at: 15 }]);
  assert.equal(list.volume, 1);
}

// 7. A Sort card brought back by Undo: an explicit spot (1:12.5) wins and is where it carries on
{
  const { list, engine } = make({}, 30);
  engine.load(['a'], 0, 72.5, true);
  await list.load();
  assert.deepEqual(list.heard, [{ song: 'a', at: 72.5 }]);
}

// 8. A drag on the seek bar while the song is still finding its spot: the drag wins, and it still plays
{
  const { list, engine } = make();
  engine.load(['a'], 0, 15, true);
  await engine.seek(40);
  await list.load();
  assert.deepEqual(list.heard, [{ song: 'a', at: 40 }]);
}

// 9. Paused while waiting (Pause tapped during the load): it seeks but stays quiet
{
  const { list, engine } = make();
  engine.load(['a'], 0, 15, true);
  engine.pause();
  await list.load();
  assert.deepEqual(list.heard, []);
  assert.equal(list.currentTime, 15);
}

// 10. A new list while a lock-screen move is still silent: the volume comes back
{
  const { list, engine } = make({}, 15);
  engine.load(['a', 'b'], 0, 15, true);
  await list.load();
  list.next(); // silent, waiting
  engine.load(['z'], 0, 0, true);
  assert.equal(list.volume, 1);
}

// 11. No start point (Library): a load at 0 plays at once, and a move by the player is left alone
{
  const { list, engine, from } = make();
  engine.load(['a', 'b'], 0, 0, true);
  await list.load();
  const n = list.heard.length;
  list.next();
  await list.load();
  assert.deepEqual(from(n), [{ song: 'b', at: 0 }]);
}

// 12. Paused, then the lock screen's Next: the new song finds its spot and stays paused
{
  const { list, engine } = make({}, 15);
  engine.load(['a', 'b'], 0, 15, true);
  await list.load();
  engine.pause();
  const n = list.heard.length;
  list.next();
  await list.load();
  assert.equal(list.heard.length, n, 'no sound');
  assert.equal(list.playing, false);
  assert.equal(list.currentTime, 15);
  assert.equal(list.volume, 1);
}

// 13. A seek lost because the song had only just changed: sent once more, first sound still at the spot
{
  const { list, engine } = make({}, 15);
  engine.load(['a', 'b'], 0, 15, true);
  await list.load();
  const n = list.heard.length;
  const real = list.seekTo.bind(list);
  let lose = 1;
  list.seekTo = async (s) => { if (lose-- > 0) { await flush(); return; } return real(s); };
  list.next();
  await list.load();
  await flush(); await flush();
  assert.deepEqual(list.heard.slice(n), [{ song: 'b', at: 15 }]);
}

// 14. Compare sets this player's volume while it's silent finding its spot: Compare's level is what comes back
{
  const { list, engine } = make({}, 15);
  engine.load(['a', 'b'], 0, 15, true);
  await list.load();
  list.next();
  const voice = engine.voice();
  voice.volume = 0; // another version is the one heard
  await list.load();
  assert.equal(list.volume, 0, 'not turned back up over Compare');
}

// 15. A song that never loads: giving up the wait brings the volume back, and Play plays
{
  const { list, engine } = make({}, 15);
  engine.load(['a', 'b'], 0, 15, true);
  await list.load();
  list.next(); // never loads
  engine.abandonWait();
  engine.pause();
  assert.equal(list.volume, 1);
  engine.play();
  assert.equal(list.playing, true);
}

// ---------- battery: fewer reports while locked (NEXT 2026-11-09 F) ----------------------------------------------------
{
  const { REPORT_MS } = await import('./playlistCore.ts');
  const { GAP_MS, energyMeter } = await import('./energy.ts');
  // today's build has no way to change the rate: asking for quiet changes nothing and breaks nothing
  {
    const { list, engine } = make();
    engine.load(['a', 'b'], 0, 0, true);
    await list.load();
    engine.setQuiet(true);
    list.emit();
    engine.setQuiet(false);
    assert.equal(list.playing, true);
  }
  // the new build: slow while locked, full rate on screen, and full rate while a song is finding its start spot
  {
    const { list, engine } = make({}, 15);
    const rates = [];
    list.setUpdateInterval = (ms) => rates.push(ms);
    engine.load(['a', 'b', 'c'], 0, 0, true);
    await list.load();
    engine.setQuiet(true); // the phone locks
    assert.deepEqual(rates, [REPORT_MS.locked]);
    list.emit();
    list.emit();
    assert.deepEqual(rates, [REPORT_MS.locked], 'asked once, not on every report');
    list.next(); // the song ends, or Next on the lock screen: the next one must find 0:15 before any sound
    assert.equal(rates.at(-1), REPORT_MS.finding, 'full rate while it finds its start spot');
    await list.load();
    list.currentTime = 15.2;
    list.hear();
    list.emit();
    await flush();
    list.emit();
    assert.equal(rates.at(-1), REPORT_MS.locked, 'found: slow again');
    assert.deepEqual(list.heard.filter((h) => h.song === 'b' && h.at < 15), [], 'and nothing was heard before 0:15');
    engine.setQuiet(false); // unlocked
    assert.equal(rates.at(-1), REPORT_MS.open);
    assert.ok(rates.length <= 5, `the rate changes only when it has to (${rates})`);
    // on screen (2026-11-11): once a second, and twice a second only while the next song finds its start spot
    assert.deepEqual([REPORT_MS.open, REPORT_MS.finding, REPORT_MS.locked], [1000, 500, 2000]);
    const before = rates.length;
    list.emit();
    list.emit();
    assert.equal(rates.length, before, 'on screen: asked once, not on every report');
    list.next();
    assert.equal(rates.at(-1), REPORT_MS.finding, 'on screen too, a song finding its start spot reports at full rate');
    await list.load();
    list.currentTime = 15.2;
    list.hear();
    list.emit();
    await flush();
    list.emit();
    assert.equal(rates.at(-1), REPORT_MS.open, 'found: back to once a second');
  }
  // the energy counter keeps counting playing time at the slow rate
  {
    assert.equal(GAP_MS.locked, 3 * REPORT_MS.locked, 'energy.ts and playlistCore.ts in step');
    assert.equal(GAP_MS.open, 3 * REPORT_MS.open, 'on screen too');
    let now = 1000;
    const out = [];
    const meter = energyMeter((sample) => out.push(sample), () => now);
    meter.setOpen(false);
    meter.setPlaying(true);
    for (let i = 0; i < 301; i++) {
      meter.count('reports');
      now += REPORT_MS.locked;
    }
    meter.flush();
    const total = out.reduce((sum, sample) => sum + sample.ms, 0);
    const reports = out.reduce((sum, sample) => sum + sample.reports, 0);
    assert.equal(total, 600000, '10 locked minutes counted');
    assert.ok(reports / 10 <= 31, `about 30 wake-ups a minute, was 120 (${reports / 10})`);
  }
  console.log('ok  reports every 2 s locked (30 a minute, was 120) and every 1 s on screen (60, was 120), full rate while a song finds its start spot; old build unchanged');
}

console.log('playlistCore: all start-spot checks pass');
