// The new frame (NEXT 2026-11-10 B, C, E): node --experimental-strip-types app/frame.test.mjs
// B: the steady-screen spam test again, 200 rounds, now through the tabs, the search button and the mini player that
//    grows into the player, while the app's thread is busy redrawing Library. The rules under test are the ones the
//    phone runs (sheetCore.ts). A swipe down lands where Back goes, from every opener.
// C: the player's tint keeps white text readable on every song's colour, and a song with no letters gets no tint.
// E: the native pieces (Apple's icons, Liquid Glass) are found on the new build and quietly absent on today's.
// The model can't stand in for the phone (LESSONS): the phone's own hang watch staying quiet is the proof of B.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findGlass, findSymbols } from './nativePieces.ts';
import { closeQueue, layers, openSheet, pullCloses, reachable, slideController, sortClosed, sortOpened, swipeDown, tabTapped } from './sheetCore.ts';
import { C, coveredBelow, S } from './theme.ts';
import { contrast, tileOf, TINT_SHARE } from './tileColor.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const code = (file) => source(file).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// ---------- a pretend phone: a clock, the app's thread (sometimes busy), and layers that slide ----------------------
const OPEN_MS = 300;
const CLOSE_MS = 220;
function phone() {
  let now = 0;
  let busyUntil = 0;
  const jobs = [];
  const made = [];
  const run = (fn) => jobs.push(fn);
  const drain = () => {
    while (jobs.length && now >= busyUntil) jobs.shift()();
  };
  const layer = (onGone) => {
    const me = { pos: 1, anim: null, mounted: false, mounts: 0 };
    const stop = () => {
      const was = me.anim;
      me.anim = null;
      if (was) run(() => was.done(false));
    };
    me.ctl = slideController({
      animate: (to, done) => {
        stop();
        me.anim = { from: me.pos, to, start: now, ms: to ? CLOSE_MS : OPEN_MS, done };
      },
      setMounted: (m) => {
        me.mounted = m;
        if (m) me.mounts++;
      },
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
    me.grab = () => me.ctl.grabbed();
    me.drag = (pos) => {
      stop();
      me.pos = pos;
    };
    me.release = (close, onClose) => me.ctl.released(close, onClose);
    made.push(me);
    return me;
  };
  return {
    layer, run,
    busy: (ms) => (busyUntil = Math.max(busyUntil, now + ms)),
    tick(ms) {
      for (let end = now + ms; now < end; ) {
        now += 5;
        made.forEach((one) => one.step());
        drain();
      }
    },
  };
}

/** The whole frame, wired the way App.tsx, nav.tsx and Player.tsx wire it: the place (tab, Sort) and the player's
 * sheet are two separate states; a control only works if a finger could reach it (reachable). */
function app() {
  const p = phone();
  let nav = { sheet: 'none', queueFrom: 'none' };
  let lastNav = { sheet: 'player', queueFrom: 'none' };
  let place = { tab: 'home', sort: false };
  const counts = { pauses: 0, nexts: 0, songLoads: 0, libraryLoads: 1, asked: 0, answered: 0 };
  const sync = () => {
    const visible = nav.sheet !== 'none';
    if (visible) lastNav = nav;
    whole.ctl.setOpen(visible);
    over.ctl.setOpen(layers(lastNav).queueOver);
  };
  const setNav = (next) => {
    nav = next;
    sync();
  };
  const whole = p.layer(() => {
    lastNav = { sheet: 'player', queueFrom: 'none' };
    p.run(sync);
  });
  const over = p.layer();
  const can = () => reachable(nav, place, true);
  /** A tap: asked for now, done when the app's thread gets to it. `reach` is checked when the finger lands. */
  const tap = (reach, fn) => {
    if (!reach) return false;
    counts.asked++;
    p.run(() => {
      counts.answered++;
      fn();
    });
    return true;
  };
  return {
    p, whole, over, counts,
    nav: () => nav,
    place: () => place,
    taps: {
      home: () => tap(can().tabs, () => (place = tabTapped(place, 'home'))),
      library: () => tap(can().tabs, () => (place = tabTapped(place, 'library'))),
      search: () => tap(can().tabs, () => (place = tabTapped(place, 'library'))), // the round button: Library, box in focus
      sort: () => tap(can().tabs && place.tab === 'home', () => (place = sortOpened(place))), // Home's More
      sortBack: () => tap(!can().sheet && place.sort, () => (place = sortClosed(place))),
      mini: () => tap(can().mini, () => setNav(openSheet(nav, 'player'))),
      miniSwipeUp: () => tap(can().mini, () => setNav(openSheet(nav, 'queue'))),
      miniPause: () => tap(can().mini, () => counts.pauses++),
      miniNext: () => tap(can().mini, () => counts.nexts++),
      card: () => tap(!can().sheet && !place.sort, () => (counts.songLoads++, setNav(openSheet(nav, 'player')))), // a Home card or Library row
      queue: () => tap(nav.sheet === 'player', () => setNav(openSheet(nav, 'queue'))),
      down: () => tap(can().sheet, () => setNav(nav.sheet === 'queue' ? closeQueue(nav) : openSheet(nav, 'none'))),
      pause: () => tap(can().sheet && nav.sheet === 'player', () => counts.pauses++),
      pull(dy, vy) {
        if (!can().sheet) return;
        const top = layers(nav).queueOver ? over : whole;
        top.grab();
        top.drag(Math.min(Math.max(dy, 0) / 678, 1));
        p.tick(30);
        top.release(pullCloses(dy, vy), () => setNav(swipeDown(nav)));
      },
    },
  };
}

// ---------- B: 200 rounds of spam through the tabs ------------------------------------------------------------------
{
  ok('200 rounds: tabs, search, mini player, cards, pulls and pauses at random while Library redraws; it always settles where the states say', () => {
    const rnd = seeded(20261110);
    let taps = 0;
    for (let round = 0; round < 200; round++) {
      const a = app();
      const names = Object.keys(a.taps).filter((name) => name !== 'pull');
      for (let i = 0; i < 40; i++) {
        if (rnd() < 0.3) a.p.busy(50 + rnd() * 700); // Library redrawing 1,395 rows
        const pick = rnd();
        if (pick < 0.12) a.taps.pull(rnd() * 400, rnd() * 1.6);
        else if (a.taps[names[Math.floor(rnd() * names.length)]]()) taps++;
        a.p.tick(rnd() < 0.5 ? 5 : Math.floor(rnd() * 200)); // often the very next frame: mid-grow, mid-close
        // at every moment: one tab, and the sheet takes touches exactly when the player says it's open
        assert.ok(['home', 'library'].includes(a.place().tab));
        assert.equal(reachable(a.nav(), a.place(), true).sheet, a.nav().sheet !== 'none');
      }
      a.p.tick(3000); // let everything land
      const open = a.nav().sheet !== 'none';
      assert.equal(a.whole.pos, open ? 0 : 1, `round ${round}: the sheet rests ${open ? 'open' : 'as the mini player'}`);
      assert.equal(a.whole.mounted, open, `round ${round}: nothing left drawn over the app`);
      assert.equal(a.over.pos, layers(a.nav()).queueOver && open ? 0 : 1, `round ${round}: Queue rests where it belongs`);
      assert.equal(a.counts.answered, a.counts.asked, `round ${round}: every tap was answered`);
      assert.equal(a.counts.libraryLoads, 1, 'Library loaded its songs once');
    }
    assert.ok(taps > 3000, `${taps} taps landed`);
  });

  ok('the mini player growing while a tab is tapped in the same frame: the player opens, the tab changes under it, neither is lost', () => {
    const a = app();
    a.taps.mini();
    a.taps.library(); // the finger was already down: both land before the app's thread runs
    a.p.tick(5);
    assert.ok(a.whole.pos > 0.9, 'caught mid-grow');
    a.p.tick(1000);
    assert.deepEqual([a.nav().sheet, a.place().tab, a.whole.pos], ['player', 'library', 0]);
    assert.equal(a.whole.mounts, 1, 'drawn once: the tab change never redraws or reloads the player');
  });

  ok('a tab can\'t be tapped through the open player; the moment the player is told to close, the tabs answer (while it still slides)', () => {
    const a = app();
    a.taps.mini();
    a.p.tick(1000);
    assert.equal(a.taps.library(), false);
    a.taps.down();
    a.p.tick(10);
    assert.ok(a.whole.pos < 0.2, 'still on its way down');
    assert.equal(a.taps.library(), true);
    a.p.tick(1000);
    assert.deepEqual([a.nav().sheet, a.place().tab, a.whole.pos, a.whole.mounted], ['none', 'library', 1, false]);
  });

  ok('a swipe down mid-grow turns it round from where it is; a short pull mid-grow lets it finish growing', () => {
    const a = app();
    a.taps.mini();
    a.p.tick(120);
    const mid = a.whole.pos;
    assert.ok(mid > 0.05 && mid < 0.95, `mid-grow at ${mid.toFixed(2)}`);
    a.taps.pull(300, 0.2);
    a.p.tick(1000);
    assert.deepEqual([a.nav().sheet, a.whole.pos, a.whole.mounted], ['none', 1, false]);
    a.taps.mini();
    a.p.tick(120);
    a.taps.pull(40, 0.1);
    a.p.tick(1000);
    assert.deepEqual([a.nav().sheet, a.whole.pos], ['player', 0]);
  });

  ok('tapping the mini player 10 times in one frame grows one player', () => {
    const a = app();
    for (let i = 0; i < 10; i++) a.taps.mini();
    a.p.tick(1000);
    assert.deepEqual([a.nav().sheet, a.whole.pos, a.whole.mounts], ['player', 0, 1]);
  });

  // where a swipe down lands: the same place as the Back (down) button, from every opener, on the tab I was on
  const openers = [
    ['the mini player on Home', (a) => a.taps.mini(), { tab: 'home', sort: false }],
    ['the mini player on Library', (a) => (a.taps.library(), a.p.tick(50), a.taps.mini()), { tab: 'library', sort: false }],
    ['the mini player over Sort', (a) => (a.taps.sort(), a.p.tick(50), a.taps.mini()), { tab: 'home', sort: true }],
    ['a Home card', (a) => a.taps.card(), { tab: 'home', sort: false }],
    ['a Library row', (a) => (a.taps.library(), a.p.tick(50), a.taps.card()), { tab: 'library', sort: false }],
    ['a search result (the search button, then a row)', (a) => (a.taps.search(), a.p.tick(50), a.taps.card()), { tab: 'library', sort: false }],
  ];
  for (const [name, open, where] of openers) {
    ok(`swipe down from the player opened by ${name}: the mini player, same screen, like the down button`, () => {
      const viaSwipe = app();
      open(viaSwipe);
      viaSwipe.p.tick(1000);
      assert.equal(viaSwipe.nav().sheet, 'player');
      viaSwipe.taps.pull(300, 0.3);
      viaSwipe.p.tick(1000);
      const viaButton = app();
      open(viaButton);
      viaButton.p.tick(1000);
      viaButton.taps.down();
      viaButton.p.tick(1000);
      for (const a of [viaSwipe, viaButton]) assert.deepEqual([a.nav().sheet, a.place(), a.whole.pos], ['none', where, 1]);
    });
    ok(`Queue over the player opened by ${name}: a swipe down uncovers the player, a second lands on the mini player`, () => {
      const a = app();
      open(a);
      a.p.tick(1000);
      a.taps.queue();
      a.p.tick(1000);
      a.taps.pull(300, 0.3);
      a.p.tick(1000);
      assert.deepEqual([a.nav().sheet, a.whole.pos, a.over.pos], ['player', 0, 1]);
      a.taps.pull(300, 0.3);
      a.p.tick(1000);
      assert.deepEqual([a.nav().sheet, a.place(), a.whole.pos], ['none', where, 1]);
    });
  }
  ok('Queue swiped up from the mini player: a swipe down lands back on the mini player, never on the player', () => {
    for (const tab of ['home', 'library']) {
      const a = app();
      a.taps[tab]();
      a.p.tick(50);
      a.taps.miniSwipeUp();
      a.p.tick(1000);
      assert.equal(a.nav().sheet, 'queue');
      a.taps.pull(300, 0.3);
      a.p.tick(1000);
      assert.deepEqual([a.nav().sheet, a.place().tab, a.whole.pos], ['none', tab, 1]);
    }
  });

  ok('a tab leaves Sort; Sort\'s Back returns to the tab under it; neither says anything about the player', () => {
    assert.deepEqual(tabTapped({ tab: 'home', sort: true }, 'library'), { tab: 'library', sort: false });
    assert.deepEqual(sortClosed(sortOpened({ tab: 'library', sort: false })), { tab: 'home', sort: false });
    assert.deepEqual(Object.keys(tabTapped({ tab: 'home', sort: false }, 'home')).sort(), ['sort', 'tab']);
    assert.deepEqual(reachable({ sheet: 'none', queueFrom: 'none' }, { tab: 'home', sort: true }, true), { sheet: false, tabs: false, mini: true });
    assert.deepEqual(reachable({ sheet: 'none', queueFrom: 'none' }, { tab: 'home', sort: false }, false), { sheet: false, tabs: true, mini: false });
  });

  ok('the phone runs this: tabs and player are separate stores, the frame\'s layers are siblings, Home and Library stay drawn', () => {
    const nav = code('./nav.tsx');
    assert.ok(nav.includes('setPlace(tabTapped(place, tab))') && nav.includes('setPlace(sortOpened(place))') && nav.includes('setPlace(sortClosed(place))'), 'the place moves by the tested rules');
    assert.ok(!/player\.(open|playList|toggle|next)\(/.test(nav.slice(nav.indexOf('export const goTab'), nav.indexOf('export const closeSort'))), 'a tab tap never calls the player');
    const app = code('./App.tsx');
    const order = ['<Home ', '<Library ', '<Sort ', '<UndoToast />', '<TabBar />', '<MiniPlayer />', '<PlayerSheet />', '<VersionsLayer '].map((tag) => app.indexOf(tag));
    assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), 'screens first, then the tab bar, mini player, player sheet and Versions above them');
    assert.ok(/\(tab !== 'home' \|\| sort\) && s\.away/.test(app) && /\(tab !== 'library' \|\| sort\) && s\.away/.test(app) && /away: \{ display: 'none' \}/.test(app), 'the tab not showing is hidden, never unmounted');
    assert.ok(!/\bModal\b/.test(app) && !/\bModal\b/.test(code('./Frame.tsx')) && !/\bModal\b/.test(code('./Home.tsx')), 'no iOS pop-up sheet anywhere in the frame');
    const player = code('./Player.tsx');
    assert.ok(player.includes("pointerEvents={visible ? 'auto' : 'none'}"), 'the sheet takes touches only while the player says it is open');
    // one value moves the mini player and the sheet, so they can't come apart (two fades would flicker)
    const mini = player.slice(player.indexOf('export function MiniPlayer'), player.indexOf('function Action'));
    const sheet = player.slice(player.indexOf('export function PlayerSheet'));
    assert.ok(mini.includes('sheetAt.interpolate(') && sheet.includes('sheetAt.interpolate(') && sheet.includes('useSlide(sheetAt,'));
    assert.equal((player.match(/new Animated\.Value\(1\)/g) ?? []).length, 3, 'sheetAt, Queue\'s own layer, and the Compare pulse: no second value for the mini player');
  });

  ok('a list\'s last row clears the tab bar and the mini player; the mini player sits just above the tabs', () => {
    assert.equal(coveredBelow(true, true), S.homeBar + S.tabBottom + S.tabBar + S.miniGap + S.mini + 8);
    assert.equal(coveredBelow(true, false), S.homeBar + S.tabBottom + S.tabBar + 8);
    assert.equal(coveredBelow(false, false), S.homeBar);
    const app = code('./App.tsx');
    assert.ok(app.includes('paddingBottom: coveredBelow(true, !!song)') && app.includes('paddingBottom: coveredBelow(false, !!song)'));
    assert.ok(code('./Home.tsx').includes('paddingBottom: coveredBelow(true, !!playing) + 24'));
    for (const size of [S.tap, S.mini, S.tabBar, S.search, S.play, S.actions]) assert.ok(size >= 44, 'every control is 44 pt or more');
  });
}

// ---------- C: the tile and the tint --------------------------------------------------------------------------------
{
  const WORDS = ['Midnight', 'Cold', 'Paper', 'Gold', 'Blue', 'Static', 'Late', 'Basement', 'Window', 'Echo', 'Lights', 'Rooftop', 'Still', 'Slow', 'Glass', 'Neon', 'Empty', 'Second', 'Loose', 'Summer', 'ночной', '夜', 'É'];
  const titles = Array.from({ length: 500 }, (_, i) => `${WORDS[i % WORDS.length]} ${WORDS[(i * 7 + 3) % WORDS.length]} ${i}`);
  const TEXT = [0xf2, 0xf2, 0xf4];
  const DIM = [0xa0, 0xa0, 0xaa];
  ok('500 songs, every year from 2010 to 2030 and no date: white text on the tint reads at 7 to 1 or better, quiet text at 4.5 to 1', () => {
    let worst = 99;
    let worstDim = 99;
    for (const title of titles)
      for (const date of [null, '', '2010', '2014-01-01', '2020-06-30', '2026-11-10', '2030']) {
        const t = tileOf(title, date);
        assert.match(t.base, /^#[0-9a-f]{6}$/);
        assert.match(t.tint, /^#[0-9a-f]{6}$/);
        assert.ok(t.glow.every((v) => Number.isInteger(v) && v >= 0 && v <= 255));
        worst = Math.min(worst, contrast(TEXT, t.tintRgb));
        worstDim = Math.min(worstDim, contrast(DIM, t.tintRgb));
      }
    assert.ok(worst >= 7, `worst ${worst.toFixed(1)}`);
    assert.ok(worstDim >= 4.5, `worst quiet text ${worstDim.toFixed(1)}`);
    console.log(`      worst contrast on the tint: text ${worst.toFixed(1)}, quiet text ${worstDim.toFixed(1)} (tint share ${TINT_SHARE})`);
  });
  ok('a song with no art to make (no letter or digit in the title, or no title): a grey tile, "?", and plain black, never a broken colour', () => {
    for (const title of ['???', '', '   ', null, undefined, '🔥🔥', '---']) {
      const t = tileOf(title, '2020');
      assert.deepEqual([t.grey, t.letters, t.tint], [true, '?', '#000000'], String(title));
      assert.match(t.base, /^#[0-9a-f]{6}$/);
    }
  });
  ok('a song\'s tile never changes, older songs are darker, and different songs get different colours', () => {
    assert.deepEqual(tileOf('Midnight Run', '2019-03-14'), tileOf('Midnight Run', '2019-03-14'));
    const lum = (hex) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
    assert.ok(lum(tileOf('Midnight Run', '2014').base) < lum(tileOf('Midnight Run', '2020').base));
    assert.ok(lum(tileOf('Midnight Run', '2020').base) < lum(tileOf('Midnight Run', '2026').base));
    assert.ok(new Set(titles.map((title) => tileOf(title, '2020').base)).size > 150, 'hundreds of colours, not a handful');
    assert.equal(tileOf('ночной забег', null).letters, 'но');
    assert.equal(tileOf('🔥 2019-03-14', null).letters, '20');
    assert.equal(tileOf('(demo) x', null).letters, 'de');
  });
  ok('the brightest tile stays dim enough for a dark room', () => {
    for (const title of titles.slice(0, 100)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(tileOf(title, '2026').base.slice(i, i + 2), 16));
      assert.ok(Math.max(r, g, b) <= 215, `${title}: ${tileOf(title, '2026').base}`);
    }
  });
  ok('the player draws the tint from the same song as its title, and only the grab bar pulls the sheet', () => {
    const player = code('./Player.tsx');
    assert.ok(/function SheetTint\(\)[\s\S]*?<Tint title=/.test(player) && player.includes("{base === 'queue' ? null : <SheetTint />}"));
    assert.equal((player.match(/\{\.\.\.whole\.grab\}/g) ?? []).length, 1);
    assert.equal((player.match(/\{\.\.\.over\.grab\}/g) ?? []).length, 1);
  });
  ok('one accent, used only where the design system allows; no screen of the new frame types its own colour', () => {
    assert.equal(C.accent, '#ffb020');
    for (const file of ['./Home.tsx', './Frame.tsx']) {
      const found = (code(file).match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).filter((hex) => hex !== '#000');
      assert.deepEqual(found, [], `${file} uses theme.ts`);
    }
  });
}

// ---------- E: the native pieces, on today's build and on the new one ------------------------------------------------
{
  const View = function SymbolView() {};
  ok('today\'s build (no native piece): nothing is found, nothing is even asked for, nothing throws', () => {
    let loads = 0;
    const old = { find: () => null, load: () => (loads++, {}) };
    assert.equal(findSymbols(old), null);
    assert.equal(findGlass(old), null);
    assert.equal(loads, 0, 'the package\'s code is never run on a build without its native half');
  });
  ok('a lookup that throws, or a package that loads broken: still null, never a crash', () => {
    const throws = { find: () => { throw new Error('no such module'); }, load: () => ({}) };
    assert.equal(findSymbols(throws), null);
    assert.equal(findGlass(throws), null);
    const broken = { find: () => ({ isLiquidGlassAvailable: true }), load: () => { throw new Error('native view missing'); } };
    assert.equal(findSymbols(broken), null);
    assert.equal(findGlass(broken), null);
    assert.equal(findSymbols({ find: () => ({}), load: () => ({}) }), null, 'a package without the view');
  });
  ok('the new build: Apple\'s icons are found; glass only when this iOS has it (iOS 26)', () => {
    const fresh = (glass) => ({ find: (name) => (name === 'SymbolModule' ? {} : { isLiquidGlassAvailable: glass }), load: (pkg) => (pkg === 'expo-symbols' ? { SymbolView: View } : { GlassView: View }) });
    assert.equal(findSymbols(fresh(true)), View);
    assert.equal(findGlass(fresh(true)), View);
    assert.equal(findGlass(fresh(false)), null, 'the new build on an older iOS: the solid stand-in');
    assert.equal(findSymbols(fresh(false)), View);
  });
  ok('every symbol has Apple\'s name and a drawn stand-in, and glass has a solid one', () => {
    const icon = source('./Icon.tsx');
    const names = [...icon.slice(icon.indexOf('export type IconName'), icon.indexOf('/** Apple\'s name')).matchAll(/'(\w+)'/g)].map((m) => m[1]);
    assert.ok(names.length >= 20);
    for (const name of names) {
      assert.ok(new RegExp(`\\b${name}: '[a-z0-9.]+'`).test(icon), `Apple's name for ${name}`);
      assert.ok(icon.includes(`case '${name}':`), `a stand-in for ${name}`);
    }
    assert.ok(icon.includes('if (SymbolView)') && icon.includes('return <Drawn name={name} size={size} color={color} />;'));
    const frame = source('./Frame.tsx');
    assert.ok(frame.includes('if (GlassView)') && frame.includes('<View style={[s.solid,'));
    const native = code('./native.ts');
    assert.ok(native.includes('requireOptionalNativeModule(name)') && !/^import .* from 'expo-(symbols|glass-effect)'/m.test(native), 'never imported at the top: only asked for once found');
    const pkg = JSON.parse(source('./package.json'));
    assert.ok(pkg.dependencies['expo-symbols'] && pkg.dependencies['expo-glass-effect'], 'in the build');
  });
  ok('glass only where the design system allows it: the tab bar, the search button, the mini player, the transport pill', () => {
    const uses = ['./Frame.tsx', './Player.tsx', './Home.tsx', './Library.tsx', './Sort.tsx', './Tagging.tsx'].map((file) => [file, (code(file).match(/<Glass\b/g) ?? []).length]);
    assert.deepEqual(uses, [['./Frame.tsx', 2], ['./Player.tsx', 2], ['./Home.tsx', 0], ['./Library.tsx', 0], ['./Sort.tsx', 0], ['./Tagging.tsx', 0]]);
  });
}

console.log(`\n${n} frame checks passed`);
