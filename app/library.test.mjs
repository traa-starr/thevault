// Library in Wall's style and Home's new rows (NEXT 2026-11-10 B, C): node --experimental-strip-types app/library.test.mjs
// B: the full 1,395-song list. Every chip keeps exactly its songs, every order holds every song once, and a fast
//    flick from top to bottom finds a row at every spot: rows are one fixed height, so the list always knows which
//    rows belong on screen without measuring any (the 70-character title can't push the next row down).
// C: each new Home row follows its rule, is the top of what its "See all" opens, and hides when it has nothing
//    (a fresh install: all five gone).
// The model can't stand in for the phone (LESSONS): the phone's hang watch and my thumb judge the flick itself.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHIPS, chipSongs, HOME_ROW, HOME_ROWS, homeRows, keepIfSame, linesByRow, MOST_PLAYED_FROM, nextSort, ROW_HEIGHT, rowLayout, rowsInView, SORTS, sortSongs } from './libraryCore.ts';
import { S } from './theme.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const code = (file) => source(file).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// ---------- a made-up library the size of the real one ---------------------------------------------------------------
const WORDS = ['midnight', 'run', 'cold', 'brew', 'lights', 'out', 'paper', 'planes', 'basement', 'tape', 'gold', 'teeth', 'window', 'seat', 'static', 'late', 'rooftop', 'still', 'overtime', 'blue', 'hour', 'echo', 'park'];
const LONG = 'this is the one where the hook finally lands after the second verse (final final v7 REAL)';
function library(count = 1395) {
  const rnd = seeded(20261110);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const songs = Array.from({ length: count }, (_, i) => ({
    id: `s${String(i).padStart(4, '0')}`,
    title: i === 7 ? LONG : `${pick(WORDS)} ${pick(WORDS)} ${i % 50}`,
    date: rnd() < 0.05 ? null : rnd() < 0.1 ? `${2014 + Math.floor(rnd() * 12)}` : `${2014 + Math.floor(rnd() * 12)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
    mine: rnd() < 0.48 ? 'mine' : 'unknown', sorted: rnd() < 0.99,
  }));
  const ratings = new Map();
  const plays = new Map();
  const families = new Map(); // row id -> how many versions
  const lines = new Map();
  for (const song of songs) {
    const r = rnd();
    if (song.mine === 'mine' && r < 0.08) ratings.set(song.id, 'fire');
    else if (r < 0.12) ratings.set(song.id, 'shelved');
    if (rnd() < 0.06) plays.set(song.id, { n: 1 + Math.floor(rnd() * 20), last: 1.7e12 + Math.floor(rnd() * 1e9) });
    if (song.mine === 'mine' && rnd() < 0.05) families.set(song.id, 2 + Math.floor(rnd() * 4));
    if (song.mine === 'mine' && rnd() < 0.04) lines.set(song.id, 1 + Math.floor(rnd() * 30));
  }
  lines.set(songs[7].id, 30);
  const facts = {
    rating: (id) => ratings.get(id), grouped: (id) => families.has(id), tagged: (id) => lines.has(id),
    plays, versions: (id) => families.get(id) ?? 1,
  };
  return { songs, ratings, plays, families, lines, facts };
}
const LIB = library();
const ids = (list) => list.map((song) => song.id);

// ---------- B: chips and orders ----------------------------------------------------------------------------------------
ok('every order holds all 1,395 songs once; Newest puts no-date songs last and a year-only date after that year\'s full dates', () => {
  for (const sort of SORTS) {
    const list = sortSongs(LIB.songs, sort, LIB.plays);
    assert.equal(list.length, 1395);
    assert.equal(new Set(ids(list)).size, 1395, sort);
  }
  const newest = sortSongs(LIB.songs, 'date');
  const firstBlank = newest.findIndex((song) => !song.date);
  assert.ok(firstBlank > 1000 && newest.slice(firstBlank).every((song) => !song.date), 'no date: at the end');
  for (let i = 1; i < firstBlank; i++) assert.ok(newest[i - 1].date >= newest[i].date, `row ${i} is not newer than row ${i - 1}`);
  const mixed = sortSongs([{ id: 'a', title: 'a', date: '2024' }, { id: 'b', title: 'b', date: '2024-01-02' }, { id: 'c', title: 'c', date: '2023-12-31' }], 'date');
  assert.deepEqual(ids(mixed), ['b', 'a', 'c']);
  const az = sortSongs(LIB.songs, 'title');
  for (let i = 1; i < az.length; i++) assert.ok(az[i - 1].title.localeCompare(az[i].title) <= 0);
  assert.deepEqual(ids(sortSongs(LIB.songs, 'date')), ids(sortSongs([...LIB.songs].reverse(), 'date')), 'the same order whatever order the laptop sent');
});

ok('Most played: most plays first, then heard latest; never-played songs follow, newest first; the order word cycles through all three', () => {
  const list = sortSongs(LIB.songs, 'plays', LIB.plays);
  const played = list.filter((song) => LIB.plays.has(song.id));
  assert.deepEqual(ids(list.slice(0, played.length)), ids(played), 'every played song is above every unplayed one');
  for (let i = 1; i < played.length; i++) {
    const [a, b] = [LIB.plays.get(played[i - 1].id), LIB.plays.get(played[i].id)];
    assert.ok(a.n > b.n || (a.n === b.n && a.last >= b.last));
  }
  assert.deepEqual(ids(list.slice(played.length)), ids(sortSongs(LIB.songs.filter((song) => !LIB.plays.has(song.id)), 'date')));
  assert.deepEqual([nextSort('date'), nextSort('title'), nextSort('plays')], ['title', 'plays', 'date']);
});

ok('every chip keeps exactly its songs, in the list\'s order: All, Mine, Favorites, Archived, Needs tags, Versions, Unsorted', () => {
  const sorted = sortSongs(LIB.songs, 'date');
  const want = {
    all: () => true,
    mine: (song) => song.mine === 'mine',
    fire: (song) => LIB.ratings.get(song.id) === 'fire',
    shelved: (song) => LIB.ratings.get(song.id) === 'shelved',
    untagged: (song) => song.mine === 'mine' && !LIB.lines.has(song.id),
    grouped: (song) => LIB.families.has(song.id),
    unsorted: (song) => song.mine !== 'mine' && !song.sorted,
  };
  const counts = {};
  for (const chip of [...CHIPS, 'unsorted']) {
    const got = chipSongs(sorted, chip, LIB.facts);
    assert.deepEqual(ids(got), ids(sorted.filter(want[chip])), chip);
    assert.ok(got.length > 0, `${chip} has songs in the made-up library`);
    counts[chip] = got.length;
  }
  console.log(`     ${Object.entries(counts).map(([chip, count]) => `${chip} ${count}`).join(', ')}`);
  assert.deepEqual([...CHIPS], ['all', 'mine', 'fire', 'shelved', 'untagged', 'grouped'], 'the chips NEXT asked for, in order, then Versions');
  assert.equal(counts.mine, counts.untagged + sorted.filter((song) => song.mine === 'mine' && LIB.lines.has(song.id)).length);
});

ok('a chip with no songs is an empty list with its own plain line, never a blank page or a crash', () => {
  const none = { rating: () => null, grouped: () => false, tagged: () => true, plays: new Map(), versions: () => 1 };
  const sorted = sortSongs(LIB.songs.map((song) => ({ ...song, sorted: true })), 'date');
  for (const chip of ['fire', 'shelved', 'untagged', 'grouped', 'unsorted']) assert.deepEqual(chipSongs(sorted, chip, none), [], chip);
  assert.deepEqual(chipSongs([], 'all', none), []);
  const library = source('./Library.tsx');
  const words = library.slice(library.indexOf('const CHIP_EMPTY'), library.indexOf('const SORT_WORD'));
  for (const chip of [...CHIPS, 'unsorted']) assert.ok(new RegExp(`\\b${chip}: '[^']{8,}'`).test(words), `${chip} has a line to show when empty`);
  assert.ok(library.includes('ListEmptyComponent={<Text style={s.empty}>{CHIP_EMPTY[only]}</Text>}'));
});

// ---------- B: the flick ------------------------------------------------------------------------------------------------
ok('a fast flick through all 1,395 rows: at every scroll spot the rows on screen are known and in order, none dropped, none doubled', () => {
  const list = sortSongs(LIB.songs, 'date');
  const SCREEN = 600; // the list's height on the phone, about
  const end = list.length * ROW_HEIGHT - SCREEN;
  const rnd = seeded(5);
  const seen = new Set();
  let spots = 0;
  let wasLast = -1;
  // top to bottom at a thumb's fastest (thousands of points between frames), then slowly, then at random spots
  const flick = [];
  for (let at = 0; at < end; at += 400 + Math.floor(rnd() * 4000)) flick.push(at);
  flick.push(end);
  const slow = [];
  for (let at = 0; at <= end; at += SCREEN) slow.push(at);
  slow.push(end);
  for (const at of [...flick, ...slow, ...Array.from({ length: 500 }, () => Math.floor(rnd() * end))]) {
    const { first, last } = rowsInView(at, SCREEN, list.length);
    assert.ok(first >= 0 && last < list.length && last - first + 1 >= SCREEN / ROW_HEIGHT, `rows fill the screen at ${at}`);
    for (let i = first; i <= last; i++) {
      const box = rowLayout(i);
      assert.equal(box.length, ROW_HEIGHT);
      assert.equal(box.offset, i * ROW_HEIGHT);
      assert.ok(box.offset < at + SCREEN && box.offset + box.length > at, `row ${i} really is on screen at ${at}`);
      assert.ok(list[i], `row ${i} has a song`);
      seen.add(list[i].id);
    }
    spots++;
    wasLast = last;
  }
  assert.equal(wasLast >= 0, true);
  assert.equal(seen.size, 1395, 'the slow pass met every song once the list was walked');
  assert.deepEqual(rowsInView(end, SCREEN, list.length).last, 1394, 'the last row is reachable');
  assert.deepEqual(rowsInView(0, SCREEN, 0), { first: 0, last: 0 }, 'an empty list is fine');
  console.log(`     ${spots} scroll spots, ${seen.size} songs met, row height ${ROW_HEIGHT}`);
});

ok('the phone runs this: one fixed row height from the tested numbers, the title on one line, the marks never give way', () => {
  const library = code('./Library.tsx');
  assert.ok(library.includes('getItemLayout={(_, index) => rowLayout(index)}'), 'the list places rows by the tested rule, never by measuring');
  assert.ok(library.includes('sortSongs(songs ?? [], sort, plays)') && library.includes('chipSongs(sorted, only,'), 'Library shows what the tested rules give');
  const row = code('./SongRow.tsx');
  assert.ok(/row: \{ height: ROW_HEIGHT,/.test(row), 'a row is exactly the tested height');
  assert.ok(row.includes('style={[s.title, playing && s.playing, off && s.off]} numberOfLines={1}>') && row.includes('<Text style={s.meta} numberOfLines={1}>'), 'title and second line: one line each, cut with …');
  assert.ok(/words: \{ flex: 1, minWidth: 0,/.test(row), 'only the words give way to a long title');
  assert.ok(row.includes('export const SongRow = memo(Row)'), 'a row redraws only when what it shows changes');
  assert.equal(ROW_HEIGHT, S.row);
  // a row's taps are the same two functions on every draw, or every row would redraw on every change
  assert.ok(library.includes('const tapRow = useCallback(') && library.includes('onPress={tapRow}') && library.includes('onLongPress={holdRow}'));
  // a play joining the outbox must not redraw the list (LESSONS 2026-11-09: Library redrawing under the music)
  assert.ok(library.includes("waitingAll.filter((change) => change.kind !== 'play_add')") && library.includes('keepIfSame(linesWas.current,'));
});

ok('line counts: a version\'s lines count for its row, and the same counts give back the same Map (nothing redraws)', () => {
  const rowOf = (id) => (id === 'v2' ? 'main' : id);
  const tags = [{ song_id: 'main' }, { song_id: 'v2' }, { song_id: 'x' }];
  const first = linesByRow(tags, rowOf);
  assert.deepEqual([...first], [['main', 2], ['x', 1]]);
  assert.equal(keepIfSame(first, linesByRow([...tags].reverse(), rowOf)), first, 'same counts: the old Map');
  const more = linesByRow([...tags, { song_id: 'x' }], rowOf);
  assert.equal(keepIfSame(first, more), more, 'a new line: a new Map');
  assert.equal(keepIfSame(null, first), first);
});

// ---------- C: Home's new rows ------------------------------------------------------------------------------------------
// what may show: one row per family, not Archived (playable is the screen's part)
const POOL = LIB.songs.filter((song) => LIB.ratings.get(song.id) !== 'shelved');
const ROWS = homeRows(POOL, LIB.facts);

ok('each new Home row follows its rule, holds at most 12, and has no Archived song', () => {
  assert.deepEqual(HOME_ROWS.map((row) => row.title), ['Recently added', 'Most played', 'Favorites', 'Needs tags', 'Versions to compare']);
  for (const row of HOME_ROWS) {
    const list = ROWS[row.key];
    assert.ok(list.length > 0 && list.length <= HOME_ROW, `${row.title}: ${list.length}`);
    assert.equal(new Set(ids(list)).size, list.length, `${row.title}: no song twice`);
    assert.ok(list.every((song) => LIB.ratings.get(song.id) !== 'shelved'), `${row.title}: nothing Archived`);
  }
  assert.ok(ROWS.added.every((song) => !!song.date), 'Recently added: only songs with a date');
  assert.deepEqual(ids(ROWS.added), ids(sortSongs(POOL, 'date').filter((song) => song.date)).slice(0, 12));
  assert.ok(ROWS.most.every((song) => LIB.plays.get(song.id).n >= MOST_PLAYED_FROM), 'Most played: 2 plays or more');
  for (let i = 1; i < ROWS.most.length; i++) assert.ok(LIB.plays.get(ROWS.most[i - 1].id).n >= LIB.plays.get(ROWS.most[i].id).n);
  assert.ok(ROWS.favorites.every((song) => LIB.ratings.get(song.id) === 'fire'));
  assert.ok(ROWS.untagged.every((song) => song.mine === 'mine' && !LIB.lines.has(song.id)), 'Needs tags: Mine, no line tagged');
  assert.ok(ROWS.versions.every((song) => LIB.families.get(song.id) >= 2), 'Versions to compare: groups of 2 or more');
  for (let i = 1; i < ROWS.versions.length; i++) assert.ok(LIB.families.get(ROWS.versions[i - 1].id) >= LIB.families.get(ROWS.versions[i].id), 'the biggest group first');
});

ok('"See all" lands on the row\'s own list: each row is the top of that chip in that order (Versions aside: biggest group first on Home)', () => {
  for (const row of HOME_ROWS) {
    const all = chipSongs(sortSongs(POOL, row.sort, LIB.plays), row.chip, LIB.facts);
    const list = ROWS[row.key];
    if (row.key === 'versions') assert.deepEqual([...ids(list)].sort(), ids(all).filter((id) => ids(list).includes(id)).sort(), 'the same groups');
    else if (row.key === 'added') assert.deepEqual(ids(list), ids(all.filter((song) => song.date)).slice(0, list.length));
    else if (row.key === 'most') assert.deepEqual(ids(list), ids(all).slice(0, list.length), 'Most played order in Library starts with Home\'s row');
    else assert.deepEqual(ids(list), ids(all).slice(0, list.length), row.title);
    assert.ok(list.every((song) => all.some((one) => one.id === song.id)), `${row.title}: every card is in the list See all opens`);
  }
  const home = code('./Home.tsx');
  assert.ok(home.includes('seeAll={() => openLibrary({ chip: row.chip, sort: row.sort })}'), 'Home asks for the tested chip and order');
  const library = code('./Library.tsx');
  const take = library.slice(library.indexOf('takeLibraryAsk();'), library.indexOf('}, [ask]);'));
  for (const step of ['setSelecting(false)', 'setTicked([])', 'setShowHidden(false)', 'setOnly(ask.chip)', 'setSort(ask.sort)', 'scrollToOffset({ offset: 0'])
    assert.ok(take.includes(step), `a chip asked from Home: ${step}`);
});

ok('a fresh install (no plays, no Favorites, no lines, no groups, no dates): Recently added, Most played, Favorites and Versions hide; nothing to show at all hides every row', () => {
  const bare = { rating: () => null, grouped: () => false, tagged: () => false, plays: new Map(), versions: () => 1 };
  const fresh = homeRows(LIB.songs.map((song) => ({ ...song, date: null })), bare);
  assert.deepEqual([fresh.added.length, fresh.most.length, fresh.favorites.length, fresh.versions.length], [0, 0, 0, 0]);
  assert.equal(fresh.untagged.length, 12, 'Needs tags is the one row a fresh library can fill (Mine songs, none tagged)');
  const empty = homeRows([], bare);
  assert.deepEqual(Object.values(empty).map((list) => list.length), [0, 0, 0, 0, 0]);
  const home = code('./Home.tsx');
  assert.ok(/function Row\([^)]*\) \{\s*if \(!songs\.length\) return null;/.test(home), 'a row with nothing in it draws nothing, heading included');
  assert.ok(home.includes('{HOME_ROWS.map((row) => (') && home.includes('songs={more[row.key]}'), 'Home draws the tested rows');
  assert.ok(home.includes("homeRows(playable.filter((song) => ratings.get(song.id) !== 'shelved')"), 'only songs that can play now, never an Archived one');
  // one play is "recently played", not "most played"
  const once = homeRows(LIB.songs, { ...bare, plays: new Map([[LIB.songs[0].id, { n: 1, last: 5 }]]) });
  assert.equal(once.most.length, 0);
});

console.log(`\n${n} library and Home row checks passed`);
