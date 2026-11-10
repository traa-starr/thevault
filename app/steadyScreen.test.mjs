// Steady screen and straight-back Queue (NEXT 2026-11-09 A, B): node --experimental-strip-types app/steadyScreen.test.mjs
// A: the player sheet's slide (sheetCore.ts, the code the phone runs) hammered with open / close / pull / pause / Next
//    while the app's thread is busy redrawing Library: it always ends where the player says, and never takes touches
//    while it shouldn't. The old iOS pop-up sheet, modelled from React Native's own code, gets stuck under the same taps.
//    The hang watch (hang.ts) reports a stall, and a tap the app never came back from.
// B: a swipe down on Queue lands where its Back goes, from every opener, and never shows the screen behind on the way.
// The model can't stand in for the phone (LESSONS): the phone's own hang watch staying quiet is the proof of A.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BEAT_MS, hangWatch, STALL_MS } from './hang.ts';
import { closeQueue, layers, openSheet, pullCloses, slideController, swipeDown } from './sheetCore.ts';
import { timing } from './timings.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// ---------- a pretend phone: a clock, the app's thread (sometimes busy), and layers that slide ----------------------
const OPEN_MS = 280;
const CLOSE_MS = 200;
function phone() {
  let now = 0;
  let busyUntil = 0; // the app's thread is redrawing Library until then: nothing of ours runs meanwhile
  const jobs = []; // work waiting for the app's thread, in order
  const layersMade = [];
  const run = (fn) => jobs.push(fn);
  const drain = () => {
    while (jobs.length && now >= busyUntil) jobs.shift()();
  };
  /** One sliding layer driven by the real controller. `pos`: 0 on screen, 1 off the bottom (the animation thread). */
  const layer = (onGone) => {
    const me = { pos: 1, anim: null, mounted: false, finger: false };
    const stop = () => {
      const was = me.anim;
      me.anim = null;
      if (was) run(() => was.done(false)); // told on the app's thread, like the phone does
    };
    me.ctl = slideController({
      animate: (to, done) => {
        stop();
        me.anim = { from: me.pos, to, start: now, ms: to ? CLOSE_MS : OPEN_MS, done };
      },
      setMounted: (m) => (me.mounted = m),
      later: (fn) => run(fn),
      onGone,
    });
    me.step = () => {
      const a = me.anim;
      if (!a) return;
      const t = Math.min((now - a.start) / a.ms, 1);
      me.pos = a.from + (a.to - a.from) * t;
      if (t >= 1) {
        me.anim = null;
        run(() => a.done(true));
      }
    };
    me.grab = () => {
      me.finger = true;
      me.ctl.grabbed();
    };
    me.drag = (pos) => {
      stop();
      me.pos = pos;
    };
    me.release = (close, onClose) => {
      me.finger = false;
      me.ctl.released(close, onClose);
    };
    layersMade.push(me);
    return me;
  };
  return {
    layer,
    run,
    busy: (ms) => (busyUntil = Math.max(busyUntil, now + ms)),
    tick(ms) {
      for (let end = now + ms; now < end; ) {
        now += 5;
        layersMade.forEach((one) => one.step());
        drain();
      }
    },
    now: () => now,
  };
}

/** The whole sheet and Queue-over-player, wired to the real rules the way Player.tsx wires them. */
function app() {
  const p = phone();
  let nav = { sheet: 'none', queueFrom: 'none' };
  let lastNav = { sheet: 'player', queueFrom: 'none' };
  let wanted = true; // playing
  let nexts = 0;
  const sync = () => {
    const visible = nav.sheet !== 'none';
    if (visible) lastNav = nav;
    whole.ctl.setOpen(visible);
    over.ctl.setOpen(layers(lastNav).queueOver);
  };
  const set = (next) => {
    nav = next;
    sync(); // the store tells the screen at once (useSyncExternalStore), then the slide follows
  };
  const whole = p.layer(() => {
    lastNav = { sheet: 'player', queueFrom: 'none' };
    p.run(sync);
  });
  const over = p.layer();
  const takesTouches = () => nav.sheet !== 'none';
  return {
    p, whole, over,
    nav: () => nav,
    taps: { // each is a real control: it only works if a finger could reach it
      openPlayer: () => !takesTouches() && p.run(() => set(openSheet(nav, 'player'))), // the bar, or a Library row
      swipeUpOnBar: () => !takesTouches() && p.run(() => set(openSheet(nav, 'queue'))),
      swipeUpInPlayer: () => nav.sheet === 'player' && p.run(() => set(openSheet(nav, 'queue'))),
      back: () => takesTouches() && p.run(() => set(nav.sheet === 'queue' ? closeQueue(nav) : openSheet(nav, 'none'))),
      home: () => takesTouches() && p.run(() => set(openSheet(nav, 'none'))),
      pause: () => p.run(() => (wanted = !wanted)), // the bar's and the player's: one of them is always in reach
      next: () => p.run(() => nexts++),
      pull(dy, vy) {
        if (!takesTouches()) return;
        const top = layers(nav).queueOver ? over : whole;
        top.grab();
        top.drag(Math.min(Math.max(dy, 0) / 800, 1));
        p.tick(30);
        top.release(pullCloses(dy, vy), () => set(swipeDown(nav)));
      },
    },
    counts: () => ({ wanted, nexts }),
  };
}

// ---------- A: 200 rounds of spam while Library redraws -------------------------------------------------------------
{
  const rounds = 200;
  let moves = 0;
  let turnedRound = 0;
  ok(`${rounds} rounds of open / pause / Next / close / pull while Library redraws: the sheet always ends where the player says`, () => {
    for (let round = 0; round < rounds; round++) {
      const random = seeded(round + 1);
      const a = app();
      const names = Object.keys(a.taps);
      let pauses = 0;
      let nexts = 0;
      for (let i = 0; i < 30; i++) {
        const name = names[Math.floor(random() * names.length)];
        if (random() < 0.3) a.p.busy(random() * 400); // Library redrawing 1,395 rows under it
        if (a.whole.anim || a.over.anim) turnedRound++;
        if (name === 'pull') a.taps.pull(random() * 300, random() * 1.6);
        else a.taps[name]();
        if (name === 'pause') pauses++;
        if (name === 'next') nexts++;
        moves++;
        a.p.tick(Math.floor(random() * 5) * 40); // 0 to 160 ms later: often mid-slide
        // touches follow the player's state at once, whatever the slide is doing: none taken while it's closed
        const { sheet } = a.nav();
        assert.equal(a.whole.ctl.now().open, sheet !== 'none', 'the slide heads where the state says');
      }
      a.p.tick(1500); // hands off: everything settles
      const { sheet, queueFrom } = a.nav();
      const where = `round ${round}: ${sheet} from ${queueFrom}`;
      assert.equal(a.whole.anim, null, `${where}: nothing still sliding`);
      assert.equal(a.whole.pos, sheet === 'none' ? 1 : 0, `${where}: the sheet rests on screen exactly when it's open`);
      if (sheet !== 'none') assert.equal(a.over.pos, layers(a.nav()).queueOver ? 0 : 1, `${where}: Queue rests over the player exactly when it's open`);
      if (sheet === 'none') assert.equal(a.whole.mounted, false, `${where}: closed and drawn no more`);
      // no tap was swallowed: every pause and Next was answered, in or out of a slide
      assert.equal(a.counts().nexts, nexts, `${where}: every Next answered`);
      assert.equal(a.counts().wanted, pauses % 2 === 0, `${where}: every pause answered`);
    }
    assert.ok(turnedRound > 500, `many taps landed mid-slide (${turnedRound} of ${moves})`);
  });

  // The old sheet, from React Native's RCTModalHostViewComponentView.mm: it notes "presented" the moment it asks iOS,
  // and iOS drops a present or dismiss asked for while the other is still sliding (about half a second each).
  const oldSheet = () => {
    let now = 0;
    let noted = false; // what React Native believes
    let real = false; // what iOS is really showing
    let slidingUntil = 0;
    return {
      set(visible) {
        if (visible === noted) return;
        noted = visible;
        if (now < slidingUntil) return; // iOS is mid-slide: the request is dropped, and nothing asks again
        real = visible;
        slidingUntil = now + 500;
      },
      tick: (ms) => (now += ms),
      stuck: () => now >= slidingUntil && noted !== real,
    };
  };
  ok('the old iOS pop-up sheet gets stuck under the same taps: closed in the app, still over the screen (the freeze)', () => {
    let stuck = 0;
    for (let round = 0; round < 200; round++) {
      const random = seeded(round + 1);
      const sheet = oldSheet();
      let visible = false;
      for (let i = 0; i < 30; i++) {
        if (random() < 0.4) sheet.set((visible = !visible));
        sheet.tick(Math.floor(random() * 5) * 40 + (random() < 0.3 ? random() * 400 : 0));
      }
      sheet.tick(1500);
      if (sheet.stuck()) stuck++;
    }
    assert.ok(stuck > 20, `stuck in ${stuck} of 200 rounds`);
    // the plain case: open, and close again inside the half second (a fast Back, or a double tap)
    const sheet = oldSheet();
    sheet.set(true);
    sheet.tick(200);
    sheet.set(false);
    sheet.tick(2000);
    assert.ok(sheet.stuck(), 'opened and closed within half a second: iOS keeps an empty sheet over the app');
  });

  ok('opened and closed within half a second, the new sheet just turns round', () => {
    const a = app();
    a.taps.openPlayer();
    a.p.tick(120);
    assert.ok(a.whole.pos > 0 && a.whole.pos < 1, 'half-way up');
    a.taps.back();
    a.p.tick(20);
    assert.equal(a.whole.anim?.to, 1, 'already heading back down, from where it was');
    a.taps.openPlayer(); // and again, mid-close
    a.p.tick(1000);
    assert.equal(a.whole.pos, 0);
    assert.equal(a.nav().sheet, 'player');
  });

  ok('a slide that stops short goes on to where it belongs, once (never a loop)', () => {
    let calls = 0;
    const ctl = slideController({ animate: (_to, done) => (calls++, done(false)), setMounted: () => {}, later: (fn) => fn() });
    ctl.setOpen(true);
    assert.equal(calls, 2);
  });

  ok('the phone runs this code: the sheet is a layer in the app, never an iOS pop-up sheet', () => {
    const player = source('./Player.tsx');
    assert.ok(!/\bModal\b/.test(player.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')), 'no Modal left in the player');
    assert.ok(player.includes('slideController(') && player.includes('pullCloses('), 'the slide is the tested one');
    assert.ok(player.includes("pointerEvents={visible ? 'auto' : 'none'}"), 'it takes touches only while the player says it is open');
    const store = source('./playerStore.ts');
    assert.ok(store.includes('update(openSheet(state, sheet))') && store.includes('update(closeQueue(state))'), 'the store uses the tested rules');
  });
}

// ---------- A: the hang watch ---------------------------------------------------------------------------------------
{
  const made = (mark = null, flag = false) => {
    const out = { now: 1700000000000, sent: [], mark, flag, screen: 'Library' };
    out.watch = hangWatch({ now: () => out.now, emit: (s) => out.sent.push(s), screen: () => out.screen, saveMark: (m) => (out.mark = m), loadMark: () => out.mark,
      setOnScreen: (on) => (out.flag = on), wasOnScreen: () => out.flag });
    out.beats = (count, every = BEAT_MS) => {
      for (let i = 0; i < count; i++) {
        out.now += every;
        out.watch.beat();
      }
    };
    return out;
  };
  ok('beats on time: no stall; a beat 3.4 s late: one stall, with its length, screen and tap', () => {
    const w = made();
    w.watch.setActive(true);
    w.beats(30);
    assert.deepEqual(w.sent, []);
    w.watch.tap('pause');
    w.screen = 'Library+player';
    w.now += BEAT_MS + 3400; // the fake stall
    w.watch.beat();
    assert.deepEqual(w.sent, [{ kind: 'stall', ms: 3400, screen: 'Library+player', tap: 'pause', gone: false }]);
    w.beats(5);
    assert.equal(w.sent.length, 1);
  });
  ok(`a stall just under ${STALL_MS / 1000} s isn't reported; one just over is; an old tap isn't blamed`, () => {
    const w = made();
    w.watch.setActive(true);
    w.watch.tap('next');
    w.beats(20); // the tap is 20 s old by the stall
    w.now += BEAT_MS + STALL_MS - 1;
    w.watch.beat();
    assert.deepEqual(w.sent, []);
    w.now += BEAT_MS + STALL_MS + 1;
    w.watch.beat();
    assert.deepEqual(w.sent, [{ kind: 'stall', ms: STALL_MS + 1, screen: 'Library', tap: '', gone: false }]);
  });
  ok('locked or in the background is not a stall: an hour away, then back', () => {
    const w = made();
    w.watch.setActive(true);
    w.beats(10);
    w.watch.setActive(false);
    w.now += 3600000;
    w.watch.setActive(true);
    w.beats(10);
    assert.deepEqual(w.sent.filter((s) => s.kind === 'stall'), []);
  });
  ok('a tap leaves a mark until the next beat; a mark still there at launch is a screen that never came back', () => {
    const w = made();
    w.watch.setActive(true);
    w.watch.tap('open player');
    assert.deepEqual(w.mark, { screen: 'Library', tap: 'open player' });
    w.beats(1);
    assert.equal(w.mark, null, 'alive after the tap: the mark goes');
    w.watch.tap('pause'); // ...and here the screen freezes for good; force quit
    const next = made(w.mark);
    next.watch.start();
    assert.deepEqual(next.sent, [{ kind: 'stall', ms: 0, screen: 'Library', tap: 'pause', gone: true }]);
    assert.equal(next.mark, null);
    const clean = made();
    clean.watch.start();
    assert.deepEqual(clean.sent, [], 'no mark, no line');
  });
  ok('a tap, then the phone locked within the second: no false alarm', () => {
    const w = made();
    w.watch.setActive(true);
    w.watch.tap('pause');
    w.watch.setActive(false);
    assert.equal(w.mark, null);
  });
  ok('frozen with no tap just before: the on-screen flag is still up at launch, so it is reported; locked first, it is not', () => {
    const w = made();
    w.watch.setActive(true);
    w.beats(30); // ...the screen freezes here, no tap near it; force quit
    assert.equal(w.flag, true);
    const next = made(null, w.flag);
    next.watch.start();
    assert.deepEqual(next.sent, [{ kind: 'stall', ms: 0, screen: '', tap: '', gone: true }]);
    assert.equal(next.flag, false, 'reported once');
    const both = made({ screen: 'Library', tap: 'pause' }, true);
    both.watch.start();
    assert.equal(both.sent.length, 1, 'a mark and the flag are one freeze, named by the mark');
    assert.equal(both.sent[0].tap, 'pause');
    const calm = made();
    calm.watch.setActive(true);
    calm.beats(30);
    calm.watch.setActive(false); // locked, then closed from the app switcher
    assert.equal(calm.flag, false);
    const after = made(null, calm.flag);
    after.watch.start();
    assert.deepEqual(after.sent, []);
  });
  ok('how long it watched goes too, so "quiet" means something: 10 min on screen, 0 stalls', () => {
    const w = made();
    w.watch.setActive(true);
    w.beats(600);
    w.watch.setActive(false);
    assert.deepEqual(w.sent, [{ kind: 'watch', ms: 600000, stalls: 0 }]);
    w.watch.setActive(true);
    w.beats(20); // under a minute: kept for the next time, no line yet
    w.watch.setActive(false);
    assert.equal(w.sent.length, 1);
  });
  ok('stall lines ride with the timings, and the app starts the watch and names its taps', () => {
    timing.reset();
    timing.hang({ kind: 'stall', ms: 3400, screen: 'Library', tap: 'pause', gone: false });
    assert.deepEqual(timing.waiting(), [{ kind: 'stall', ms: 3400, screen: 'Library', tap: 'pause', gone: false }]);
    timing.reset();
    const app = source('./App.tsx');
    assert.ok(app.includes('hang.start(') && app.includes("hang.setActive(state === 'active')"));
    const store = source('./playerStore.ts');
    for (const tap of ["hang.tap('pause')", "hang.tap('play')", "hang.note('next')", "hang.note('previous')", "hang.tap('close queue')", '`open ${sheet}`']) assert.ok(store.includes(tap), tap);
  });
  ok('play first: a tap that starts a song touches the disk only after the sound is asked for', () => {
    const w = made();
    w.watch.setActive(true);
    w.watch.note('next');
    assert.equal(w.mark, null, 'noted in memory: nothing on disk in front of the sound');
    w.watch.mark();
    assert.deepEqual(w.mark, { screen: 'Library', tap: 'next' });
    w.beats(1);
    w.watch.note('jump to a song'); // a tap that started nothing...
    w.beats(5);
    w.watch.mark(); // ...is not marked late, by a song ending 5 s on
    assert.equal(w.mark, null);
    const store = source('./playerStore.ts');
    assert.ok(store.indexOf('engine!.skip(step, startPoint);') < store.indexOf('hang.mark(); // the sound is on its way'), 'Next through the queue: skip, then the mark');
    assert.ok(/if \(modeReady\) toSound\(false\);\s+hang\.mark\(\);/.test(store), 'a fresh load: the sound, then the mark');
    assert.ok(/engine\?\.pause\(\);\s+hang\.tap\('pause'\)/.test(store) && /engine\?\.play\(\);\s+hang\.tap\('play'\)/.test(store), 'pause and play: the sound, then the mark');
  });
}

// ---------- B: where a swipe down on Queue lands, per opener --------------------------------------------------------
{
  const none = { sheet: 'none', queueFrom: 'none' };
  // the full player, however it was opened (a Library row, a Sort set's song, the bar on Home, a tagging session)
  for (const opener of ['Library', 'Sort', 'Home', 'a session']) {
    ok(`Queue from the full player (opened on ${opener}): a swipe down lands on the player, like Back, and the player never leaves the screen`, () => {
      const a = app();
      a.taps.openPlayer();
      a.p.tick(600);
      a.taps.swipeUpInPlayer();
      a.p.tick(600);
      assert.deepEqual(a.nav(), { sheet: 'queue', queueFrom: 'player' });
      assert.deepEqual(layers(a.nav()), { base: 'player', queueOver: true }, 'the player stays drawn under Queue');
      assert.deepEqual(swipeDown(a.nav()), closeQueue(a.nav()), 'the gesture goes where Back goes');
      a.over.grab();
      a.over.drag(0.4); // pulled part-way: mid-close
      a.p.tick(30);
      assert.equal(a.whole.pos, 0, 'mid-pull: the sheet itself has not moved, so no Library shows');
      a.over.release(true, () => a.taps.back());
      for (let i = 0; i < 60; i++) {
        a.p.tick(10);
        assert.equal(a.whole.pos, 0, 'all the way down: the player is on screen the whole time, never Library');
        assert.notEqual(a.nav().sheet, 'none');
      }
      assert.equal(a.nav().sheet, 'player');
      assert.equal(a.over.pos, 1);
    });
  }
  // the mini player (the bar), on each screen it sits on
  for (const screen of ['Library', 'Sort', 'Home']) {
    ok(`Queue from the mini player on ${screen}: a swipe down lands back on ${screen}`, () => {
      const a = app();
      a.taps.swipeUpOnBar();
      a.p.tick(600);
      assert.deepEqual(a.nav(), { sheet: 'queue', queueFrom: 'none' });
      assert.deepEqual(layers(a.nav()), { base: 'queue', queueOver: false });
      assert.deepEqual(swipeDown(a.nav()), none);
      a.taps.pull(200, 0);
      a.p.tick(600);
      assert.deepEqual(a.nav(), none, 'out: the screen under it, untouched (the sheet never changes screen)');
      assert.equal(a.whole.pos, 1);
    });
  }
  ok('a swipe down mid-animation (Queue still sliding up) turns round to the player; a short pull springs back', () => {
    const a = app();
    a.taps.openPlayer();
    a.p.tick(600);
    a.taps.swipeUpInPlayer();
    a.p.tick(100); // Queue half-way up
    a.taps.pull(200, 0);
    a.p.tick(600);
    assert.equal(a.nav().sheet, 'player');
    assert.equal(a.over.pos, 1);
    assert.equal(a.whole.pos, 0);
    a.taps.swipeUpInPlayer();
    a.p.tick(600);
    a.taps.pull(60, 0.1); // not far, not fast
    a.p.tick(600);
    assert.equal(a.nav().sheet, 'queue');
    assert.equal(a.over.pos, 0, 'back up');
  });
  ok('Queue after a session, Home from Queue, then the player again: no Queue left on top', () => {
    const a = app();
    a.taps.openPlayer();
    a.p.tick(600);
    a.taps.swipeUpInPlayer();
    a.p.tick(600);
    a.taps.home();
    a.p.tick(600);
    assert.deepEqual(a.nav().sheet, 'none');
    a.taps.openPlayer();
    a.p.tick(600);
    assert.equal(a.over.pos, 1);
    assert.equal(a.whole.pos, 0);
  });
  ok('the pull that closes: far (over 120 pt) or fast, as before', () => {
    assert.ok(pullCloses(121, 0) && pullCloses(10, 0.9));
    assert.ok(!pullCloses(120, 0.8) && !pullCloses(60, 0.1));
  });
}

console.log(`\n${n} steady-screen checks passed`);
