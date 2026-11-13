// Hidden songs in Settings (calm part 1, 2026-11-12, goal B): node --experimental-strip-types app/hidden.test.mjs
// 815 made-up hidden songs in made-up folders. Search by title and by folder narrows the list, folder + search work
// together, odd letters never throw, the count and empty words are right, and a restore takes the song out of Hidden
// and puts it in Library (through the same outbox rules the phone already uses). Fake names only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hiddenCountLine, hiddenEmptyLine, hiddenFolders, hiddenRowCount, hiddenShown, refusedRestores, restoresOnTheirWay } from './hiddenCore.ts';
import { withoutRestored, withPending } from './playOrder.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const code = (file) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

const FOLDERS = ['Session Music / Other Artist A', 'Session Music / Other Artist B', 'Music', 'Loose files', 'Session Music / Beat Pack (2024)'];
const WORDS = ['velvet', 'harbor', 'neon', 'quarry', 'lantern', 'drift', 'saffron', 'meadow'];
const HIDDEN = Array.from({ length: 815 }, (_, i) => ({
  id: `h${String(i).padStart(4, '0')}`,
  title: `${WORDS[i % WORDS.length]} ${WORDS[(i * 7) % WORDS.length]} ${i}${i === 3 ? ' (demo [v2])' : ''}`,
  where: i % 10 === 0 ? 'cloud' : 'laptop',
  date: null,
  folder: FOLDERS[i % FOLDERS.length],
  mine: 'not mine',
  sorted: true,
}));

ok('815 songs: every folder is a chip, biggest first, and their counts add up to 815', () => {
  const folders = hiddenFolders(HIDDEN);
  assert.equal(folders.length, FOLDERS.length);
  assert.equal(folders.reduce((sum, one) => sum + one.count, 0), 815);
  for (let i = 1; i < folders.length; i++) assert.ok(folders[i - 1].count >= folders[i].count, 'biggest first');
  assert.equal(hiddenFolders([{ ...HIDDEN[0], folder: '' }])[0].name, 'Loose files', 'no folder reads Loose files');
});

ok('search by title narrows the list, any case', () => {
  const got = hiddenShown(HIDDEN, 'HARBOR', null);
  assert.ok(got.length > 0 && got.length < 815);
  assert.ok(got.every((song) => song.title.toLowerCase().includes('harbor')));
  assert.deepEqual(hiddenShown(HIDDEN, '  ', null).length, 815, 'spaces alone keep everything');
});

ok('search by folder narrows the list', () => {
  const got = hiddenShown(HIDDEN, 'artist b', null);
  assert.equal(got.length, HIDDEN.filter((song) => song.folder === 'Session Music / Other Artist B').length);
});

ok('a folder and a search together keep only songs that match both; clearing the search keeps the folder', () => {
  const folder = 'Music';
  const both = hiddenShown(HIDDEN, 'neon', folder);
  assert.ok(both.length > 0);
  assert.ok(both.every((song) => song.folder === folder && song.title.includes('neon')));
  assert.equal(hiddenShown(HIDDEN, '', folder).length, HIDDEN.filter((song) => song.folder === folder).length);
});

ok('odd letters are just letters: "(", "[" and "*" never throw and match literally', () => {
  assert.deepEqual(hiddenShown(HIDDEN, '(demo [v2])', null).map((song) => song.id), ['h0003']);
  assert.deepEqual(hiddenShown(HIDDEN, '(2024)', null).length, 163);
  assert.deepEqual(hiddenShown(HIDDEN, '*', null), []);
});

ok('the count line: all, one, and "N of M" while narrowed; nothing matching is not "Nothing hidden"', () => {
  assert.equal(hiddenCountLine(815, 815, false), '815 hidden songs');
  assert.equal(hiddenCountLine(1, 1, false), '1 hidden song');
  assert.equal(hiddenCountLine(12, 815, true), '12 of 815');
  assert.equal(hiddenEmptyLine(0, '', null), 'Nothing hidden');
  assert.equal(hiddenEmptyLine(815, 'zzz', null), 'No hidden songs match "zzz"');
  assert.equal(hiddenEmptyLine(815, 'zzz', 'Music'), 'No hidden songs match "zzz" in Music');
  assert.equal(hiddenEmptyLine(815, '', 'Music'), 'No hidden songs in Music');
});

ok("Settings' row: the count when known, nothing (never 0 or NaN) while it isn't", () => {
  assert.equal(hiddenRowCount(815), '815');
  assert.equal(hiddenRowCount(1395), '1,395');
  assert.equal(hiddenRowCount(null), '');
  assert.equal(hiddenRowCount(undefined), '');
  assert.equal(hiddenRowCount(NaN), '');
});

ok('restore: out of Hidden and into Library once the change is pending (the outbox rules the phone already has)', () => {
  const restore = { id: 'c1', kind: 'mine_restore', data: { song_id: 'h0005' } };
  assert.ok(!withoutRestored(HIDDEN, [restore]).some((song) => song.id === 'h0005'), 'gone from Hidden next time it opens');
  // Library keeps a restored song out until the laptop answers (its old value comes back from there), then lists it
  const library = [{ id: 'm1', title: 'mine one', mine: 'mine', sorted: true, where: 'laptop', date: null }];
  assert.deepEqual(withPending(library, [restore]).map((song) => song.id), ['m1']);
  const afterLaptop = [...library, { ...HIDDEN[5], mine: 'unknown', sorted: false }];
  assert.ok(withPending(afterLaptop, []).some((song) => song.id === 'h0005'), 'in Library once the laptop has it');
});

ok('the screen: a restored row stays where it is (nothing under the thumb moves), a second tap does nothing, rows are fixed height', () => {
  const hidden = code('./Hidden.tsx');
  assert.ok(hidden.includes('if (restored.has(song.id)) return;'), 'a second tap on the same pill is ignored');
  assert.ok(hidden.includes("<Text style={s.backWordDone}>In Library</Text>"), 'the row says In Library instead of leaving');
  assert.ok(!/setFetched\(\(list\)/.test(hidden), 'the list is never cut while the screen is open');
  assert.ok(/restore: \{ height: 36, width: 96,/.test(hidden), 'Restore and In Library are the same width: the title never moves');
  assert.ok(hidden.includes('getItemLayout={rowLayout}') && hidden.includes('offset: ROW_HEIGHT * index'), 'fixed-height rows: fast with 815');
  assert.ok(hidden.includes("player.playList(url, playable, song.id, false)"), 'a tap plays, streamed, like Sort');
  assert.ok(!hidden.includes("player.open('player')"), 'the list stays: the mini player shows what plays');
  assert.ok(hidden.includes("disabled={off}"), 'a song not on the laptop does not try to play');
  const settings = code('./Settings.tsx');
  assert.ok(settings.includes('Hidden songs') && settings.includes('hiddenRowCount(hidden, onTheirWay)'), 'Settings has the row');
  assert.ok(settings.includes('onBack={() => (setShowHidden(false), onRecount())}'), 'Back lands on Settings, with the count asked again');
});

ok('review catch 1: restores still on their way come off the Settings count at once, and it asks again once they are sent', () => {
  const restore = (id, song) => ({ id, kind: 'mine_restore', data: { song_id: song } });
  const pending = [restore('c1', 'h1'), restore('c2', 'h2'), { id: 'c3', kind: 'mine_set', data: { song_id: 'h2', value: 'not mine' } }, { id: 'c4', kind: 'tag_add', data: { song_id: 'h3' } }];
  assert.equal(restoresOnTheirWay(pending), 1, 'h2 was hidden again after its restore: only h1 is on its way');
  assert.equal(hiddenRowCount(815, restoresOnTheirWay(pending)), '814');
  assert.equal(hiddenRowCount(0, 3), '0', 'never below 0');
  const settings = code('./Settings.tsx');
  assert.ok(settings.includes('if (was.current && !onTheirWay) onRecount();'), 'the outbox emptied: the laptop is asked for the real count');
});

ok('review catch 2: a restore the laptop refused gives the row its Restore back; one it took, or one still waiting, stays In Library', () => {
  const restored = new Map([['h1', 'c1'], ['h2', 'c2'], ['h3', 'c3']]);
  assert.deepEqual(refusedRestores(restored, new Set(['c2']), new Set(['c1'])), ['h3'], 'c1 taken, c2 waiting, c3 gone without being taken');
  const hidden = code('./Hidden.tsx');
  assert.ok(hidden.includes('onSent((accepted) => accepted.forEach((change) => taken.current.add(change.id)))'));
  assert.ok(hidden.includes("const [change] = addChange('mine_restore', song.id);"));
});

ok('review catch 7: a song with no folder is found by "loose files", as its chip says', () => {
  const loose = [{ ...HIDDEN[0], folder: '' }, { ...HIDDEN[1], folder: 'Music' }];
  assert.deepEqual(hiddenShown(loose, 'loose', null).map((song) => song.id), [HIDDEN[0].id]);
});

console.log(`\n${n} passed`);
