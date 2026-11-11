// Sort's swipe cards (NEXT 2026-11-11 C): node --experimental-strip-types app/cards.test.mjs
// The card changed its look (Deal's swipe card), not what it does. This proves each swipe and tap still does what Sort's
// did: right is Mine, left is Not mine, up is Not sure; short of the mark springs back; down never grabs. And the
// board's break list (board/wave3.md 1-6): a swipe is never also a tap, two fast swipes judge two different songs, Undo
// brings back the right song in its place with its version link undone, nothing is left on the next card, the verdict
// is saved at release before any throw, and up only counts when it is more up than sideways. Fake songs only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { effectsOf, GRAB_PX, grabs, LIFT_MAX, liftY, queueOf, stamps, SWIPE_PX, THROW, undoEffects, verdictAt } from './cardsCore.ts';
import { S } from './theme.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const code = (file) => source(file).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

const SONGS = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, title: `Song ${i}`, mine: 'unknown', sorted: false, where: 'laptop', date: '2024-01-01', folder: 'x' }));

// ---------- a model of the screen: the same rules Cards.tsx runs, with a fake player that only remembers ----------
function deck(songs = SONGS, { pile = false, scope = null } = {}) {
  const marks = new Map(); // what the laptop would be told (player.judge)
  const notSure = new Set(pile ? songs.map((one) => one.id) : []);
  const passed = new Set();
  const log = [];
  let undo = null;
  let pos = { x: 0, y: 0 };
  let flying = null; // the ghost of the judged card: starts at release, lands later
  const open = () => songs.filter((one) => !marks.has(one.id));
  const queue = () => queueOf(open(), scope, notSure, pile, passed);
  const decide = (choice, from) => {
    const song = queue()[0];
    if (!song) return;
    const does = effectsOf(choice, pile);
    if (does.judge) {
      marks.set(song.id, does.judge);
      log.push(['judge', song.id, does.judge]);
    }
    if (does.pass) passed.add(song.id);
    if (does.unsure) notSure.add(song.id);
    undo = { song, choice, link: null };
    pos = { x: 0, y: 0 };
    flying = { song, choice, at: from, landed: false };
  };
  return {
    log,
    queue,
    pos: () => pos,
    flying: () => flying,
    grab: (dx, dy) => grabs(dx, dy),
    move: (dx, dy) => (pos = { x: dx, y: liftY(dy) }),
    release(dx, dy) {
      const choice = verdictAt(dx, dy);
      if (choice) decide(choice, { x: dx, y: liftY(dy) });
      else pos = { x: 0, y: 0 };
      return choice;
    },
    tap: (choice) => decide(choice, { x: 0, y: 0 }),
    land() {
      if (!flying) return;
      flying.at = THROW[flying.choice];
      flying.landed = true;
      flying = null;
    },
    link: (sent) => (undo = undo && { ...undo, link: sent }),
    undo() {
      if (!undo) return;
      const { song, choice, link } = undo;
      const does = undoEffects(choice, pile);
      if (link) log.push(['unlink', link]);
      if (does.unjudge) {
        marks.delete(song.id);
        log.push(['unjudge', song.id]);
      }
      if (does.unpass) passed.delete(song.id);
      if (does.unsure) notSure.delete(song.id);
      undo = null;
      flying = null;
    },
    /** What survives a kill right now: only what was saved. */
    kill: () => ({ marks: new Map(marks), notSure: new Set(notSure) }),
  };
}

// ---------- 1. each swipe does what it did ----------
ok('right past the mark is Mine, left is Not mine, up is Not sure', () => {
  const d = deck();
  assert.equal(d.release(SWIPE_PX + 1, 3), 'mine');
  assert.equal(d.release(-SWIPE_PX - 1, -3), 'not mine');
  assert.equal(d.release(10, -SWIPE_PX - 1), 'not sure');
  assert.deepEqual(d.log, [['judge', 's0', 'mine'], ['judge', 's1', 'not mine']]);
  assert.equal(d.queue()[0].id, 's3', 'Not sure left the pass without a laptop verdict');
});

ok('short of the mark springs back and saves nothing', () => {
  const d = deck();
  for (const [dx, dy] of [[SWIPE_PX, 0], [-SWIPE_PX, 0], [0, -SWIPE_PX], [60, -60], [0, 0]]) {
    d.move(dx, dy);
    assert.equal(d.release(dx, dy), null, `${dx},${dy}`);
    assert.deepEqual(d.pos(), { x: 0, y: 0 });
  }
  assert.equal(d.log.length, 0);
  assert.equal(d.queue()[0].id, 's0');
});

ok('down never grabs; up only when it is more up than sideways; sideways is read first, as built', () => {
  const d = deck();
  assert.equal(d.grab(0, 300), false, 'a pull down is a scroll, not a swipe');
  assert.equal(d.grab(5, 5), false, 'a wobble is not a swipe');
  assert.equal(d.grab(0, -13), true);
  assert.equal(d.grab(13, 0), true);
  assert.equal(d.grab(-13, 0), true);
  d.move(0, 300);
  assert.deepEqual(d.pos(), { x: 0, y: 0 }, 'the card never goes below where it started');
  d.move(0, -SWIPE_PX);
  assert.ok(d.pos().y < 0 && d.pos().y >= -LIFT_MAX, 'an up drag lifts the card');
  d.move(0, -2000);
  assert.equal(d.pos().y, -LIFT_MAX, 'but never under the header');
  assert.equal(d.release(0, 300), null);
  assert.equal(d.release(100, -150), 'not sure', 'more up than sideways, sideways short of the mark');
  assert.equal(d.release(-150, -200), 'not mine', 'sideways past the mark wins, as built');
  assert.equal(d.release(SWIPE_PX + 10, -SWIPE_PX - 10), 'mine');
});

ok('the three buttons do exactly what the three swipes do', () => {
  const swiped = deck();
  swiped.release(200, 0);
  swiped.release(-200, 0);
  swiped.release(0, -200);
  const tapped = deck();
  tapped.tap('mine');
  tapped.tap('not mine');
  tapped.tap('not sure');
  assert.deepEqual(tapped.log, swiped.log);
  assert.deepEqual(tapped.queue().map((one) => one.id), swiped.queue().map((one) => one.id));
});

ok('inside the Not sure pile, Not sure again is a pass; Mine and Not mine still go to the laptop', () => {
  const d = deck(SONGS, { pile: true });
  assert.equal(d.queue().length, 10);
  d.release(0, -200);
  assert.equal(d.queue()[0].id, 's1');
  assert.equal(d.kill().notSure.size, 10, 'still in the pile, only passed over this visit');
  d.release(200, 0);
  assert.deepEqual(d.log, [['judge', 's1', 'mine']]);
});

ok('a set opened one by one shows only its songs', () => {
  const d = deck(SONGS, { scope: new Set(['s2', 's5']) });
  assert.deepEqual(d.queue().map((one) => one.id), ['s2', 's5']);
  d.release(200, 0);
  assert.deepEqual(d.log, [['judge', 's2', 'mine']]);
});

// ---------- 2. the board's break list ----------
ok('break 5: the verdict is saved at release, before the throw lands (a kill mid-throw loses nothing)', () => {
  const d = deck();
  d.release(200, -20);
  const ghost = d.flying();
  assert.equal(ghost.landed, false, 'the throw has not landed yet');
  assert.deepEqual(ghost.at, { x: 200, y: liftY(-20) }, 'the throw starts where the card was drawn when the finger let go');
  assert.equal(d.kill().marks.get('s0'), 'mine', 'already saved');
  d.land();
  assert.equal(d.kill().marks.get('s0'), 'mine');
});

ok('break 2: two fast releases judge two different songs, each once', () => {
  const d = deck();
  d.release(200, 0);
  d.release(200, 0); // before the first throw has landed
  assert.deepEqual(d.log, [['judge', 's0', 'mine'], ['judge', 's1', 'mine']]);
  assert.equal(d.queue()[0].id, 's2');
});

ok('break 4: the live card is at rest with no stamp the moment a verdict lands', () => {
  const d = deck();
  d.move(200, -40);
  d.release(200, -40);
  assert.deepEqual(d.pos(), { x: 0, y: 0 });
  assert.deepEqual(stamps(d.pos().x, d.pos().y), { mine: 0, notMine: 0, notSure: 0 });
  d.release(-200, 0);
  d.release(0, -200);
  assert.deepEqual(d.pos(), { x: 0, y: 0 });
});

ok('break 3: Undo after a throw brings back the right song, in its own place, with its version link undone first', () => {
  const d = deck();
  d.release(200, 0); // s0 Mine
  d.release(200, 0); // s1 Mine
  d.link({ id: 'sent-1' });
  d.undo();
  assert.equal(d.queue()[0].id, 's1', 'back at the front, ahead of s2');
  assert.equal(d.kill().marks.has('s1'), false);
  assert.equal(d.kill().marks.get('s0'), 'mine', 'only the last verdict comes back');
  assert.deepEqual(d.log.slice(-2), [['unlink', { id: 'sent-1' }], ['unjudge', 's1']], 'out of the family first, then no longer Mine');
  assert.equal(d.flying(), null, 'the ghost is gone');
});

ok('Undo for Not sure takes the song out of the pile again', () => {
  const d = deck();
  d.release(0, -200);
  assert.equal(d.kill().notSure.has('s0'), true);
  d.undo();
  assert.equal(d.kill().notSure.has('s0'), false);
  assert.equal(d.queue()[0].id, 's0');
});

ok('break 1: the card has no tap of its own; verdicts come only from a release past the mark or a button', () => {
  const cards = code('./Cards.tsx');
  const start = cards.indexOf('{...pan.panHandlers}');
  assert.ok(start > 0, 'the live card takes the pan');
  const live = cards.slice(cards.lastIndexOf('<Animated.View', start), cards.indexOf('</Animated.View>', start));
  assert.ok(!/onPress|Pressable|Tap\b/.test(live), 'nothing inside the live card answers a tap');
  const card = cards.slice(cards.indexOf('function Card('), cards.indexOf('function Round('));
  assert.ok(/pointerEvents="none"/.test(card) && !/onPress/.test(card), 'the card face swallows no touch');
  assert.ok(/onPanResponderRelease[\s\S]*?verdictAt\(g\.dx, g\.dy\)/.test(cards), 'a release asks the one rule');
  assert.equal((cards.match(/latest\.current\.decide\(/g) ?? []).length, 5, 'one call from the release, three buttons, one from + Version');
});

// ---------- 3. the look follows the rules ----------
ok('stamps fade in with the drag only: none at rest or inside the grab zone, full at the mark, one side at a time', () => {
  assert.deepEqual(stamps(0, 0), { mine: 0, notMine: 0, notSure: 0 });
  const slanted = stamps(GRAB_PX, -SWIPE_PX / 2);
  assert.ok(slanted.mine === 0 && slanted.notMine === 0 && slanted.notSure > 0.3, 'a slightly slanted up drag shows only Not sure');
  const half = stamps(SWIPE_PX / 2, 0);
  assert.ok(half.mine > 0.3 && half.mine < 0.6 && half.notMine === 0 && half.notSure === 0, 'part way at half the mark');
  assert.deepEqual(stamps(SWIPE_PX, 0), { mine: 1, notMine: 0, notSure: 0 });
  assert.deepEqual(stamps(-SWIPE_PX * 2, 0), { mine: 0, notMine: 1, notSure: 0 });
  assert.deepEqual(stamps(0, -SWIPE_PX), { mine: 0, notMine: 0, notSure: 1 });
  assert.deepEqual(stamps(0, 200), { mine: 0, notMine: 0, notSure: 0 }, 'a pull down shows nothing');
});

ok('a thrown card leaves the screen on the side of its verdict', () => {
  assert.ok(THROW.mine.x > 390 && THROW['not mine'].x < -390, 'clear of an iPhone width');
  assert.ok(THROW['not sure'].y < -844, 'clear of an iPhone height');
});

ok('controls: round buttons 44 pt or more with the pressed look; the tick on a swipe is on the decision only', () => {
  const cards = code('./Cards.tsx');
  const round = Number(/const ROUND = (\d+)/.exec(cards)?.[1]);
  assert.ok(round >= S.tap, `round buttons ${round} wide`);
  assert.ok(/<Tap style=\{s\.round\}/.test(cards), 'the round buttons are Tap (instant pressed look)');
  assert.equal((cards.match(/impactAsync/g) ?? []).length, 1, 'one tick, in buzz()');
  const release = cards.slice(cards.indexOf('onPanResponderRelease'), cards.indexOf('onPanResponderTerminate'));
  assert.ok(/buzz\(\)/.test(release) && release.indexOf('if (!choice)') < release.indexOf('buzz()'), 'ticks after a verdict, never on a spring back');
  assert.ok(!/buzz\(\)/.test(cards.slice(cards.indexOf('onPanResponderMove'), cards.indexOf('onPanResponderRelease'))), 'never during the drag');
  assert.ok(/import .*SWIPE_PX.*from '\.\/cardsCore'/.test(cards), 'the screen uses the one mark');
  assert.ok(/C\.accent/.test(cards) && !/#1e5b34|#6a2a2a|#81c995|#f28b82/.test(cards), 'the red and green blocks are gone; amber is the one accent');
});

console.log(`cards: ${n} checks passed`);
