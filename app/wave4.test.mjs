// Overhaul wave 4 (A and C): node --experimental-strip-types app/wave4.test.mjs
// A: Queue, Versions and Compare changed look only. Reorder, set Main and compare do what they did: the rules are run
//    here (playOrder.ts, family.ts), and the screens are read to check they still call them.
// C: the whole-app pass (no screen types a colour of its own any more), catch 17 (the session's pill and "+ Version"
//    line up) and catch 20 (Not played in a while changes songs by day, not only their order).
// Catch 18 (Delete apart from Cancel) is in taggingLook.test.mjs; catches 4 and 5 in laptop.test.mjs.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { applyEdit, applyPicks, makeMainEdit, membersOf, settle, versionMenu } from './family.ts';
import { dayOf, LONG_AGO_POOL, notPlayedInAWhile, ROW_SONGS } from './playLog.ts';
import { currentId, dialTarget, moveInOrder, queueDrop, startOrder, upNext } from './playOrder.ts';
import { closeQueue, layers, openSheet, swipeDown } from './sheetCore.ts';
import { S } from './theme.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const code = (file) => source(file).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
const stylesOf = (file) => {
  const text = code(file);
  return text.slice(text.lastIndexOf('StyleSheet.create({'));
};
const style = (file, name) => new RegExp(`\\b${name}: \\{([^}]*)\\}`).exec(stylesOf(file))?.[1] ?? assert.fail(`${file} has no style ${name}`);

// ---------- A: reorder ---------------------------------------------------------------------------------------------------
ok('A: a Queue row dropped on any slot ends up on that slot, from every slot, and the song playing never moves', () => {
  const list = ['now', 'a', 'b', 'c', 'd', 'e', 'f'];
  const order = startOrder(list, 'now', false);
  const rows = upNext(order, 99);
  assert.deepEqual(rows, ['a', 'b', 'c', 'd', 'e', 'f']);
  for (let from = 0; from < rows.length; from++) {
    for (let to = 0; to < rows.length; to++) {
      const drop = queueDrop(rows, from, to);
      const moved = moveInOrder(order, drop.id, drop.afterId);
      const want = rows.filter((id) => id !== rows[from]);
      want.splice(to, 0, rows[from]);
      assert.deepEqual(upNext(moved, 99), want, `row ${from} dropped on slot ${to}`);
      assert.equal(currentId(moved), 'now');
    }
  }
  assert.deepEqual(queueDrop(rows, 3, 0), { id: 'd', afterId: null }, 'first: right after the song playing');
  assert.deepEqual(queueDrop(rows, 0, 5), { id: 'a', afterId: 'f' });
});

ok('A: the phone runs this: a drop goes through queueDrop to the player, one tick on lift and one per slot passed, hold 300 ms, no drag on a Sort card', () => {
  const player = code('./Player.tsx');
  const queue = player.slice(player.indexOf('function QueueRow('), player.indexOf('function useSlide('));
  assert.ok(/const drop = queueDrop\(shown\.current, from, to\);\s*setFrozen\(null\);\s*player\.moveUpNext\(drop\.id, drop\.afterId\);/.test(queue));
  assert.ok(/const onDragStart = useCallback\(\(\) => \{\s*'worklet';\s*runOnJS\(tick\)\(\);\s*runOnJS\(freeze\)\(\);/.test(queue), 'a tick as the row lifts, and the rows freeze under the finger');
  assert.ok(/const onIndexChange = useCallback\(\(\) => \{\s*'worklet';\s*runOnJS\(tick\)\(\);/.test(queue), 'one tick per slot passed');
  assert.ok(/const HOLD_MS = 300;/.test(player) && queue.includes('delayLongPress={HOLD_MS}') && queue.includes('onLongPress={sorting ? undefined : lift}'));
  assert.ok(queue.includes('dragEnabled={!sorting}') && queue.includes('onPress={() => player.jump(id)}'), 'a tap still jumps to the song');
  assert.ok(queue.includes('if (e.from === e.to) runOnJS(thaw)();'), 'a row dropped where it started thaws the list');
});

ok('A: Queue closes by swipe to where its Back goes, from the player and from the mini player', () => {
  const player = code('./Player.tsx');
  assert.ok(player.includes('onPress={player.closeQueue} accessibilityLabel="Back"'), 'Back');
  assert.ok(player.includes('const over = useSlide(overAt, height, queueOver, player.closeQueue);'), 'the pull on Queue over the player: the same call as Back');
  const none = { sheet: 'none', queueFrom: 'none' };
  const fromPlayer = openSheet(openSheet(none, 'player'), 'queue');
  assert.deepEqual(swipeDown(fromPlayer), closeQueue(fromPlayer));
  assert.equal(swipeDown(fromPlayer).sheet, 'player');
  assert.deepEqual(layers(fromPlayer), { base: 'player', queueOver: true });
  const fromMini = openSheet(none, 'queue');
  assert.deepEqual(swipeDown(fromMini), closeQueue(fromMini));
  assert.equal(swipeDown(fromMini).sheet, 'none');
});

// ---------- A: set Main --------------------------------------------------------------------------------------------------
ok('A: a version\'s menu offers what the alert did: Make main on a version, Keep as Main on an unpicked Main, Not mine never on the Main, Cancel last', () => {
  assert.deepEqual(versionMenu(false, false), ['Play', 'Make main', 'Remove from Versions', 'Not mine', 'Cancel']);
  assert.deepEqual(versionMenu(true, false), ['Play', 'Keep as Main', 'Remove from Versions', 'Cancel']);
  assert.deepEqual(versionMenu(true, true), ['Play', 'Remove from Versions', 'Cancel']);
  for (const menu of [versionMenu(false, false), versionMenu(true, false), versionMenu(true, true)]) assert.equal(menu.at(-1), 'Cancel');
});

ok('A: Make main still makes that version the Main of its whole family and keeps my pick when a newer one joins', () => {
  const families = new Map([['a', 'c'], ['b', 'c'], ['c', 'c']]); // c is the newest, so the Main
  const dates = { a: '2025-01-01', b: '2025-02-01', c: '2025-03-01', d: '2025-04-01' };
  const dateOf = (id) => dates[id];
  const edit = settle(families, new Set(), makeMainEdit(families, 'a'), dateOf, 'a');
  const after = applyEdit(families, edit);
  const picks = applyPicks(new Set(), edit);
  assert.deepEqual(membersOf(after, 'b'), ['a', 'b', 'c'].sort((x, y) => (x === 'a' ? -1 : y === 'a' ? 1 : x < y ? -1 : 1)), 'a leads its family');
  assert.equal(after.get('b'), 'a');
  assert.ok(picks.has('a'), 'my pick');
  // a newer version joins: the pick holds
  const joined = settle(after, picks, { songs: { d: 'a' }, before: { d: null } }, dateOf);
  assert.equal(applyEdit(after, joined).get('d'), 'a');
  const versions = code('./Versions.tsx');
  assert.ok(versions.includes("else if (choice === 'Make main' || choice === 'Keep as Main') makeMainWithToast(id);"));
  assert.ok(/function makeMainWithToast\(id: string\) \{\s*const sent = versions\.makeMain\(id\);/.test(versions) && versions.includes('is Main now`, undo: () => versions.undo(sent)'), 'through the same store call, with its Undo');
  assert.ok(versions.includes("if (choice === 'Play') player.playNow(url,") && versions.includes('const sent = versions.remove(id);') && versions.includes("else if (choice === 'Not mine') notMine(url, id);"));
  assert.ok(!/\bAlert\b/.test(versions), 'the menu is the app\'s own half sheet, no iOS alert box');
  assert.ok(versions.includes('versionMenu(menuIsMain, versions.isPicked(menuOpen))'));
});

// ---------- A: compare ---------------------------------------------------------------------------------------------------
ok('A: Compare is opened the same two ways, and its wheel keeps its size, snap and rules', () => {
  const versions = code('./Versions.tsx');
  assert.ok(versions.includes('close(); setTimeout(() => compare.openFromLibrary(url, versionsOf), AFTER_CLOSE_MS);'), 'from the Versions sheet: the sheet goes first');
  assert.ok(code('./Player.tsx').includes('onPress={() => compare.openFromPlayer(player.url())}'), 'from the player');
  const wheel = code('./Compare.tsx');
  assert.ok(/WHEEL_ROW = 32;/.test(wheel) && /WHEEL_WIDTH = 168;/.test(wheel), 'the same slot: nothing beside it moves');
  assert.ok(wheel.includes('snapToInterval={WHEEL_ROW}') && wheel.includes('compare.rest(index);') && wheel.includes('dialTarget(resting.current, landed, ids.map((id) => !blocked(id)))'));
  // two versions: a flick from one lands on the other; a version that can't play is stepped over
  assert.equal(dialTarget(0, 1, [true, true]), 1);
  assert.equal(dialTarget(1, 0, [true, true]), 0);
  assert.equal(dialTarget(0, 1, [true, false, true]), 2);
});

// ---------- A and C: the look ---------------------------------------------------------------------------------------------
ok('A: Queue, Versions and the picker use the list row every screen uses: 60 high with a 44 tile; Back and Done are 44 to touch', () => {
  assert.equal(S.row, 60);
  assert.equal(S.rowTile, 44);
  assert.ok(/height: S\.row\b/.test(style('./Player.tsx', 'queueRow')));
  assert.ok(/height: S\.tap\b/.test(style('./Player.tsx', 'queueBack')) && /minWidth: S\.tap\b/.test(style('./Player.tsx', 'queueBack')));
  assert.ok(/width: S\.tap, height: S\.tap/.test(style('./Player.tsx', 'queueGrip')));
  const player = code('./Player.tsx');
  assert.equal((player.slice(player.indexOf('function QueueRow('), player.indexOf('function useSlide(')).match(/<Tile [^>]*size=\{S\.rowTile\}/g) ?? []).length, 2, 'the playing row and every row up next');
  const versions = code('./Versions.tsx');
  assert.ok(/const ROW_HEIGHT = S\.row;/.test(versions) && /height: ROW_HEIGHT/.test(style('./Versions.tsx', 'row')));
  assert.equal((versions.match(/<Tile [^>]*size=\{S\.rowTile\}/g) ?? []).length, 2, 'the picker and the Versions sheet');
  assert.ok(/height: S\.tap\b/.test(style('./Versions.tsx', 'headWord')) && /height: S\.tap\b/.test(style('./Versions.tsx', 'compareTap')));
  assert.ok(/MENU_ROW = 52;/.test(versions) && /height: MENU_ROW/.test(style('./Versions.tsx', 'menuItem')));
  assert.ok(/paddingVertical: 13/.test(style('./Versions.tsx', 'chip')), '"Versions · 3" in the player is 44 to touch');
  // the playing song, in Queue and in Versions: amber, as in every list
  assert.ok(/color: C\.accent/.test(style('./Player.tsx', 'queueNow')) && /color: C\.accent/.test(style('./Versions.tsx', 'rowPlaying')));
});

ok('C: no screen types a colour of its own any more (black on a white button aside): every one comes from theme.ts', () => {
  const screens = readdirSync(new URL('.', import.meta.url)).filter((file) => file.endsWith('.tsx') && file !== 'Icon.tsx' && file !== 'Art.tsx');
  assert.ok(screens.length >= 16, `${screens.length} screens read`);
  for (const file of screens) {
    const hexes = (code(`./${file}`).match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).filter((hex) => hex !== '#000');
    assert.deepEqual(hexes, [], `${file} types its own colours`);
  }
  for (const file of ['Sort.tsx', 'Hidden.tsx', 'Notices.tsx', 'Versions.tsx', 'Compare.tsx', 'Settings.tsx']) assert.ok(code(`./${file}`).includes("from './theme'"), file);
  assert.ok(!/s\.good|s\.bad/.test(code('./Sort.tsx')), 'no green and red blocks in Sort: amber is the one accent');
});

ok('C: Sort, Hidden and Settings share one header: Back (44 to touch), then the screen\'s name', () => {
  for (const file of ['./Sort.tsx', './Hidden.tsx', './Settings.tsx', './Cards.tsx']) {
    assert.ok(/height: S\.tap, minWidth: S\.tap/.test(style(file, 'back')), `${file}: Back is 44`);
    assert.ok(/\.\.\.T\.title/.test(style(file, 'title')), `${file}: the screen title`);
  }
  assert.ok(!code('./nav.tsx').includes('HomeButton'), 'the old Home link is gone for good');
});

ok('catch 17: in a session "+ Version" starts on the Not mine pill\'s left edge, not centred under it', () => {
  const player = code('./Player.tsx');
  assert.ok(player.includes('<View style={[s.versionRow, inSession && s.versionRowSession]}>'));
  assert.ok(/justifyContent: 'flex-start'/.test(style('./Player.tsx', 'versionRowSession')));
  // the pill starts 10 in from a row that starts 10 out; the word has 8 of padding in a row that starts 8 out: both at the page's edge
  assert.ok(/marginLeft: 10\b/.test(style('./Player.tsx', 'sessionPill')) && /marginHorizontal: -10\b/.test(style('./Player.tsx', 'quiet')));
  assert.ok(/marginLeft: -8\b/.test(style('./Player.tsx', 'versionRowSession')) && /paddingHorizontal: 8\b/.test(style('./Player.tsx', 'word')));
  assert.ok(/justifyContent: 'center'/.test(style('./Player.tsx', 'versionRow')), 'outside a session it stays centred');
});

// ---------- catch 20: Not played in a while, by day -----------------------------------------------------------------------
const DAY = 24 * 3600 * 1000;
const songs = (count) => Array.from({ length: count }, (_, i) => ({ id: `s${i}` }));
const morning = new Date(2026, 10, 11, 8).getTime();
const heardLongAgo = (list) => new Map(list.map((song, i) => [song.id, { n: 1, last: morning - (40 + i) * DAY }]));
const idsOf = (list) => list.map((song) => song.id);

ok('catch 20: every song heard long ago: tomorrow\'s row holds different songs, not the same ones in another order', () => {
  const all = songs(60);
  const plays = heardLongAgo(all);
  const today = idsOf(notPlayedInAWhile(all, plays, morning));
  const tomorrow = idsOf(notPlayedInAWhile(all, plays, morning + DAY));
  assert.equal(today.length, ROW_SONGS);
  assert.notDeepEqual([...today].sort(), [...tomorrow].sort(), 'not the same songs');
  // it used to be the 12 longest-unheard, every day, until I played them
  const oldRow = [...all].sort((a, b) => plays.get(a.id).last - plays.get(b.id).last).slice(0, ROW_SONGS).map((song) => song.id);
  const week = Array.from({ length: 7 }, (_, d) => idsOf(notPlayedInAWhile(all, plays, morning + d * DAY)));
  assert.ok(week.filter((row) => [...row].sort().join() !== [...oldRow].sort().join()).length >= 6, 'the old fixed dozen is the exception now');
  const met = new Set(week.flat());
  assert.ok(met.size >= ROW_SONGS + 8, `a week shows ${met.size} different songs`);
  // still the long-unheard: every pick is among the longest-unheard (three times the seats), shown longest ago first
  const pool = new Set([...all].sort((a, b) => plays.get(a.id).last - plays.get(b.id).last).slice(0, ROW_SONGS * LONG_AGO_POOL).map((song) => song.id));
  for (const row of week) {
    assert.ok(row.every((id) => pool.has(id)));
    assert.deepEqual(row, [...row].sort((a, b) => plays.get(a).last - plays.get(b).last));
  }
});

ok('catch 20: a mix of heard-long-ago and never-played: both halves change by day', () => {
  const all = songs(669);
  const plays = heardLongAgo(all.slice(0, 80));
  const today = idsOf(notPlayedInAWhile(all, plays, morning));
  const tomorrow = idsOf(notPlayedInAWhile(all, plays, morning + DAY));
  const half = ROW_SONGS / 2;
  assert.ok(today.slice(0, half).every((id) => plays.has(id)) && today.slice(half).every((id) => !plays.has(id)), 'half heard long ago, half never played');
  assert.notDeepEqual([...today.slice(0, half)].sort(), [...tomorrow.slice(0, half)].sort(), 'the long-ago half');
  assert.notDeepEqual([...today.slice(half)].sort(), [...tomorrow.slice(half)].sort(), 'the never-played half');
});

ok('catch 20: the same songs all day (the local day, not UTC\'s), and a short list still shows everything it has', () => {
  const all = songs(60);
  const plays = heardLongAgo(all);
  const start = new Date(2026, 10, 11, 0, 0, 1).getTime();
  const end = new Date(2026, 10, 11, 23, 59, 58).getTime();
  assert.equal(dayOf(start), '2026-11-11');
  assert.equal(dayOf(end), '2026-11-11');
  assert.deepEqual(idsOf(notPlayedInAWhile(all, plays, start)), idsOf(notPlayedInAWhile(all, plays, end)));
  assert.notEqual(dayOf(end + 3000), '2026-11-11', 'it turns over at my midnight');
  for (const few of [0, 1, 5, ROW_SONGS]) {
    const list = songs(few);
    const row = idsOf(notPlayedInAWhile(list, heardLongAgo(list), morning));
    assert.deepEqual([...row].sort(), idsOf(list).sort(), `${few} songs: all of them, none twice`);
  }
});

ok('catch 20: 1,395 songs: the row is worked out in well under 50 ms', () => {
  const all = songs(1395);
  const plays = heardLongAgo(all.slice(0, 700));
  const began = performance.now();
  for (let i = 0; i < 10; i++) notPlayedInAWhile(all, plays, morning + i * DAY);
  const each = (performance.now() - began) / 10;
  assert.ok(each < 50, `${each.toFixed(1)} ms`);
});

console.log(`\n${n} wave 4 checks passed`);
