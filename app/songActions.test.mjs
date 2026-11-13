// One world (ROADMAP O.6), Fable kit goal 1: node --experimental-strip-types app/songActions.test.mjs
// Written by Opus 2026-11-12 BEFORE the code, failing on purpose: Fable makes it pass (docs/overhaul/FABLE-KIT.md).
// The rules from docs/overhaul/WORLD-MAP.md, as pure functions in app/songActions.ts (no React Native, so this loads):
//   songActions(ctx)  the song sheet's rows, top to bottom, for one song where it was opened
//   actionLabel(a, ctx) the plain words on each row
//   playerFace(ctx)   what the player shows on its face (Mine / Not mine only while unsorted; Compare with 2+ versions)
//   holdFires(ms, px) a hold opens the sheet only if held 0.4 s without moving more than 8 px (scrolling never does)
//   HOME_MENU, LIBRARY_MENU, SHUFFLE_POOLS, SET_ACTIONS  the small fixed menus
// Screens are read as text at the end to check they call these rules instead of deciding for themselves.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actionLabel, HOLD_MS, HOLD_SLOP, HOME_MENU, holdFires, LIBRARY_MENU, playerFace, SET_ACTIONS, SHUFFLE_POOLS, songActions } from './songActions.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const code = (file) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

// A plain Mine song, alone (no versions), opened from a Library row
const base = { rating: 'mine', favorite: false, archived: false, familySize: 1, comparing: false, inSession: false, from: 'library' };
const ctx = (more) => ({ ...base, ...more });

ok('a Mine song from Library: favorite, not mine, add as a version, archive, select', () => {
  assert.deepEqual(songActions(ctx()), ['favorite', 'not_mine', 'add_version', 'archive', 'select']);
});

ok('an unsorted song offers both verdicts, Mine first', () => {
  const rows = songActions(ctx({ rating: null }));
  assert.ok(rows.indexOf('mine') >= 0 && rows.indexOf('mine') < rows.indexOf('not_mine'), rows.join());
});

ok('a hidden (not mine) song offers Mine back, never Not mine again', () => {
  const rows = songActions(ctx({ rating: 'not_mine' }));
  assert.ok(rows.includes('mine') && !rows.includes('not_mine'), rows.join());
});

ok('favorite and archive read their state: the row says what a tap will do', () => {
  const rows = songActions(ctx({ favorite: true, archived: true }));
  assert.ok(rows.includes('unfavorite') && !rows.includes('favorite'), rows.join());
  assert.ok(rows.includes('unarchive') && !rows.includes('archive'), rows.join());
});

ok('in a family: Versions and Compare, no "add as a version"', () => {
  const rows = songActions(ctx({ familySize: 3 }));
  assert.ok(rows.includes('versions') && rows.includes('compare') && !rows.includes('add_version'), rows.join());
  assert.ok(rows.indexOf('versions') < rows.indexOf('compare'), 'Versions above Compare');
});

ok('Queue only from the player; Select only from Library and Home', () => {
  assert.ok(songActions(ctx({ from: 'player' })).includes('queue'));
  assert.ok(!songActions(ctx({ from: 'player' })).includes('select'));
  for (const from of ['library', 'home']) assert.ok(songActions(ctx({ from })).includes('select'), from);
  for (const from of ['library', 'home', 'search', 'cards']) assert.ok(!songActions(ctx({ from })).includes('queue'), from);
  for (const from of ['search', 'cards', 'player']) assert.ok(!songActions(ctx({ from })).includes('select'), from);
});

ok('in a tagging session: no Queue, no Compare (the session owns the order)', () => {
  const rows = songActions(ctx({ from: 'player', inSession: true, familySize: 2 }));
  assert.ok(!rows.includes('queue') && !rows.includes('compare') && rows.includes('versions'), rows.join());
});

ok('while comparing: Favorite only', () => {
  assert.deepEqual(songActions(ctx({ from: 'player', comparing: true, familySize: 2 })), ['favorite']);
  assert.deepEqual(songActions(ctx({ from: 'player', comparing: true, familySize: 2, favorite: true })), ['unfavorite']);
});

ok('the order never changes: favorite, verdicts, versions, compare, add, archive, queue, select', () => {
  const ORDER = ['favorite', 'unfavorite', 'mine', 'not_mine', 'versions', 'compare', 'add_version', 'archive', 'unarchive', 'queue', 'select'];
  for (const rating of ['mine', 'not_mine', null])
    for (const familySize of [1, 2])
      for (const from of ['player', 'library', 'home', 'search', 'cards']) {
        const rows = songActions(ctx({ rating, familySize, from }));
        const at = rows.map((row) => ORDER.indexOf(row));
        assert.ok(at.every((i) => i >= 0), `unknown row in ${rows.join()}`);
        assert.deepEqual(at, [...at].sort((a, b) => a - b), `${rating} ${familySize} ${from}: ${rows.join()}`);
        assert.equal(new Set(rows).size, rows.length, 'no row twice');
      }
});

ok('plain labels, Versions with its count', () => {
  assert.equal(actionLabel('favorite', base), 'Favorite');
  assert.equal(actionLabel('unfavorite', base), 'Unfavorite');
  assert.equal(actionLabel('mine', base), 'Mine');
  assert.equal(actionLabel('not_mine', base), 'Not mine');
  assert.equal(actionLabel('versions', ctx({ familySize: 3 })), 'Versions (3)');
  assert.equal(actionLabel('compare', base), 'Compare');
  assert.equal(actionLabel('add_version', base), 'Add as a version of…');
  assert.equal(actionLabel('archive', base), 'Archive');
  assert.equal(actionLabel('unarchive', base), 'Unarchive');
  assert.equal(actionLabel('queue', base), 'Queue');
  assert.equal(actionLabel('select', base), 'Select');
});

ok('player face: Mine / Not mine only while the song is unsorted (the eye is gone)', () => {
  assert.equal(playerFace(ctx({ rating: null })).verdicts, true);
  assert.equal(playerFace(ctx({ rating: 'mine' })).verdicts, false);
  assert.equal(playerFace(ctx({ rating: 'not_mine' })).verdicts, false);
  assert.equal(playerFace(ctx({ rating: null, comparing: true })).verdicts, false, 'Compare acts on the version heard: no verdicts');
});

ok('player face: Compare only with 2 or more versions', () => {
  assert.equal(playerFace(ctx({ familySize: 1 })).compare, false);
  assert.equal(playerFace(ctx({ familySize: 2 })).compare, true);
});

ok('player face: four slots, the last is "..." (Next song in a session)', () => {
  assert.deepEqual(playerFace(ctx()).slots, ['favorite', 'tag', 'lines', 'more']);
  assert.deepEqual(playerFace(ctx({ inSession: true })).slots, ['favorite', 'tag', 'lines', 'next']);
});

ok('a hold: 0.4 s still opens the sheet; moving over 8 px (a scroll) never does', () => {
  assert.equal(HOLD_MS, 400);
  assert.equal(HOLD_SLOP, 8);
  assert.equal(holdFires(400, 0), true);
  assert.equal(holdFires(399, 0), false);
  assert.equal(holdFires(2000, 9), false, 'a 2 s flick-scroll never opens it');
  assert.equal(holdFires(600, 8), true);
});

ok('the small menus', () => {
  assert.deepEqual(HOME_MENU, ['sort', 'tag_songs', 'settings']);
  assert.deepEqual(LIBRARY_MENU, ['shuffle', 'order', 'select']);
  assert.deepEqual(SHUFFLE_POOLS, ['mine', 'favorites', 'unsorted']);
  assert.deepEqual(SET_ACTIONS, ['all_mine', 'all_not_mine']);
});

ok('goal 1, the player uses the rules: one song sheet, no eye', () => {
  const player = code('./Player.tsx');
  assert.ok(/playerFace\(/.test(player), 'Player.tsx asks playerFace what to show');
  assert.ok(!/buttonsHidden|eyeSetting/.test(player), 'the eye is gone from the player');
  const sheet = code('./SongSheet.tsx');
  assert.ok(/songActions\(/.test(sheet) && /actionLabel\(/.test(sheet), 'SongSheet.tsx draws songActions with actionLabel');
  assert.ok(!/Alert\.alert/.test(sheet), 'no iOS dialogs in the sheet (LESSONS 2026-11-08)');
});

ok('goal 2, a hold opens the same sheet on every screen', () => {
  for (const screen of ['./Library.tsx', './Home.tsx', './SearchScreen.tsx', './Cards.tsx'])
    assert.ok(/SongSheet|openSongSheet/.test(code(screen)), `${screen} opens the song sheet on a hold`);
  assert.ok(/holdFires\(|HOLD_MS/.test(code('./SongRow.tsx') + code('./Library.tsx')), 'Library rows use the tested hold rule');
});

console.log(`\n${n} song sheet checks passed`);
