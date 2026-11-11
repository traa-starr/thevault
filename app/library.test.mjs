// Library in Wall's style and Home's new rows (NEXT 2026-11-10 B, C): node --experimental-strip-types app/library.test.mjs
// B: the full 1,395-song list. Every chip keeps exactly its songs, every order holds every song once, and a fast
//    flick from top to bottom finds a row at every spot: rows are one fixed height, so the list always knows which
//    rows belong on screen without measuring any (the 70-character title can't push the next row down).
// C: each new Home row follows its rule, is the top of what its "See all" opens, and hides when it has nothing
//    (a fresh install: all five gone).
// The model can't stand in for the phone (LESSONS): the phone's hang watch and my thumb judge the flick itself.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHIPS, chipSongs, dailyShuffle, HOME_FRONT, HOME_PAGE, HOME_ROW, HOME_ROWS, homePage, homeRows, keepIfSame, linesByRow, MOST_PLAYED_FROM, nextSort, ROW_HEIGHT, rowLayout, rowsInView, SORTS, sortSongs, taggedOnceKnown } from './libraryCore.ts';
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
  assert.ok(library.includes("ListEmptyComponent={<Text style={s.empty}>{only === 'untagged' && !tagsKnown ? 'Lines are still loading' : CHIP_EMPTY[only]}</Text>}"));
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
  assert.ok(row.includes('style={[s.title, marked && s.searched, playing && s.playing, off && s.off]} numberOfLines={1}>') && row.includes('<Text testID="song-meta" style={s.meta} numberOfLines={1}>'), 'title and second line: one line each, cut with …');
  // the phone mark (owner 2026-11-11: it replaced the words "On this phone"): after the second line, never squeezed
  assert.ok(row.includes('{onPhone ? <PhoneMark /> : null}') && /phone: \{[^}]*flexShrink: 0/.test(row) && /meta: \{[^}]*flexShrink: 1/.test(row), 'the words give way, the mark does not');
  assert.ok(row.includes('accessibilityLabel="On this phone"'), 'VoiceOver still says it');
  assert.ok(library.includes("offline.has(song.id) ? '' : WHERE[song.where]") && library.includes('onPhone={offline.has(item.id)}'), 'no words for a song on this phone, the mark instead');
  assert.ok(!/['"`]On this phone['"`]/.test(library + code('./SearchScreen.tsx')), 'the words are gone from every row');
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
const LISTS = homeRows(POOL, LIB.facts);
const DAY = '2026-11-11';
// the two rows above them, as Home hands them over: 12 heard lately, 12 never heard
const RECENT = POOL.filter((song) => LIB.plays.has(song.id)).sort((a, b) => LIB.plays.get(b.id).last - LIB.plays.get(a.id).last).slice(0, 12);
const FORGOTTEN = POOL.filter((song) => song.mine === 'mine' && !LIB.plays.has(song.id)).slice(0, 12);
const ALL_LISTS = { recent: RECENT, forgotten: FORGOTTEN, ...LISTS };
const page = (day = DAY, lists = ALL_LISTS) => homePage(lists, day);
const ROWS = page();

ok('each new Home row follows its rule, holds at most 12, and has no Archived song', () => {
  assert.deepEqual(HOME_ROWS.map((row) => row.title), ['Recently added', 'Most played', 'Favorites', 'Needs tags', 'Versions to compare']);
  for (const row of HOME_ROWS) {
    const list = ROWS[row.key];
    assert.ok(list.length > 0 && list.length <= HOME_ROW, `${row.title}: ${list.length}`);
    assert.equal(new Set(ids(list)).size, list.length, `${row.title}: no song twice`);
    assert.ok(list.every((song) => LIB.ratings.get(song.id) !== 'shelved'), `${row.title}: nothing Archived`);
  }
  assert.ok(ROWS.added.every((song) => !!song.date), 'Recently added: only songs with a date');
  assert.ok(ROWS.most.every((song) => LIB.plays.get(song.id).n >= MOST_PLAYED_FROM), 'Most played: 2 plays or more');
  assert.ok(ROWS.favorites.every((song) => LIB.ratings.get(song.id) === 'fire'));
  assert.ok(ROWS.untagged.every((song) => song.mine === 'mine' && !LIB.lines.has(song.id)), 'Needs tags: Mine, no line tagged');
  assert.ok(ROWS.versions.every((song) => LIB.families.get(song.id) >= 2), 'Versions to compare: groups of 2 or more');
});

// LESSONS 2026-11-11: three rows opened with the same songs and read as one list
const front = (rows, key) => ids(rows[key]).slice(0, HOME_FRONT);
/** Every "row:song" that sits among the first 5 cards of a row and of a row above it. */
const repeatsUpFront = (rows) => {
  const seen = new Set();
  const twice = [];
  for (const { key } of HOME_PAGE) {
    const cards = front(rows, key);
    twice.push(...cards.filter((id) => seen.has(id)).map((id) => `${key}:${id}`));
    cards.forEach((id) => seen.add(id));
  }
  return twice;
};

ok('no song sits in the first 5 cards of two Home rows: the full library over a week of days, and every row offered the same songs', () => {
  for (let d = 9; d < 16; d++) assert.deepEqual(repeatsUpFront(page(`2026-11-${String(d).padStart(2, '0')}`)), []);
  // the worst overlap there is: every row offered the very same 40 songs
  const same = POOL.slice(0, 40);
  const rows = page(DAY, Object.fromEntries(HOME_PAGE.map(({ key }) => [key, same])));
  assert.deepEqual(repeatsUpFront(rows), []);
  for (const { key } of HOME_PAGE) assert.ok(rows[key].length >= HOME_FRONT, `${key} still has its cards`);
  // the check itself can fail: the lists laid out with no rule do repeat
  const naive = Object.fromEntries(HOME_PAGE.map(({ key }) => [key, same.slice(0, 12)]));
  assert.ok(repeatsUpFront(naive).length > 0);
});

ok('the top row wins, and the rows whose order means something keep it: Recently added and Most played only leave out songs already up front', () => {
  assert.deepEqual(ids(ROWS.recent), ids(RECENT), 'Recently played is the top row: untouched');
  const upFront = new Set([...front(ROWS, 'recent'), ...front(ROWS, 'forgotten')]);
  assert.deepEqual(ids(ROWS.added), ids(LISTS.added.filter((song) => !upFront.has(song.id)).slice(0, 12)), 'Recently added: newest first, minus the songs up front above it');
  front(ROWS, 'added').forEach((id) => upFront.add(id));
  assert.deepEqual(ids(ROWS.most), ids(LISTS.most.filter((song) => !upFront.has(song.id)).slice(0, 12)), 'Most played: most plays first, minus the songs up front above it');
  for (let i = 1; i < ROWS.most.length; i++) assert.ok(LIB.plays.get(ROWS.most[i - 1].id).n >= LIB.plays.get(ROWS.most[i].id).n);
  // a song heard lately that is also my most played and my newest shows once, in Recently played
  const top = { id: 'top', title: 'top', date: '2026-11-01', mine: 'mine' };
  const rows = homePage({ recent: [top], most: [top, ...LISTS.most], added: [top, ...LISTS.added] }, DAY);
  assert.deepEqual(ids(rows.recent), ['top']);
  assert.ok(!ids(rows.most).includes('top') && !ids(rows.added).includes('top'));
});

ok('the rows with no order of their own (Not played in a while, Favorites, Needs tags, Versions) are the same all day and change the next day', () => {
  const tomorrow = page('2026-11-12');
  for (const key of ['forgotten', 'favorites', 'untagged', 'versions']) {
    assert.deepEqual(ids(page()[key]), ids(ROWS[key]), `${key}: the same all day`);
    assert.notDeepEqual(ids(tomorrow[key]), ids(ROWS[key]), `${key}: different tomorrow`);
    assert.notDeepEqual(ids(ROWS[key]), ids(ALL_LISTS[key]).slice(0, 12), `${key}: not simply the first 12 of its list`);
  }
  assert.deepEqual([...ids(ROWS.forgotten)].sort(), [...ids(FORGOTTEN)].sort(), 'Not played in a while: the songs its own rule picked, in the day\'s order');
  // two rows shuffled on the same day don't come out in the same order
  assert.notDeepEqual(ids(dailyShuffle(POOL.slice(0, 30), DAY, 'favorites')), ids(dailyShuffle(POOL.slice(0, 30), DAY, 'untagged')));
  // a week shows far more Favorites than one fixed dozen would
  const week = new Set(Array.from({ length: 7 }, (_, d) => ids(page(`2026-11-${10 + d}`).favorites)).flat());
  assert.ok(week.size > 24, `${week.size} different Favorites in a week`);
});

ok('few songs: a row never goes blank or loses its heading because its songs are up front elsewhere (3, 6 and 12 songs)', () => {
  for (const count of [3, 6, 12]) {
    const few = POOL.slice(0, count);
    const rows = homePage(Object.fromEntries(HOME_PAGE.map(({ key }) => [key, few])), DAY);
    const upFront = new Set();
    for (const { key, ordered } of HOME_PAGE) {
      assert.ok(rows[key].length > 0, `${count} songs, ${key}: still drawn`);
      assert.equal(new Set(ids(rows[key])).size, rows[key].length, 'no song twice in one row');
      // a repeat only shows up front once a row has run out of other songs
      const others = few.filter((song) => !upFront.has(song.id)).length;
      const repeats = front(rows, key).filter((id) => upFront.has(id)).length;
      if (ordered) assert.equal(repeats > 0, others === 0, `${count} songs, ${key}`);
      else assert.equal(repeats, Math.max(0, Math.min(HOME_FRONT, rows[key].length) - others), `${count} songs, ${key}: its other songs come first`);
      front(rows, key).forEach((id) => upFront.add(id));
    }
  }
});

ok('1,395 songs: the whole page laid out in well under 50 ms, and Home lays it out only when a list or the day changes', () => {
  const began = performance.now();
  for (let i = 0; i < 10; i++) homePage({ recent: RECENT, forgotten: FORGOTTEN, ...homeRows(POOL, LIB.facts) }, `2026-11-${10 + i}`);
  const each = (performance.now() - began) / 10;
  assert.ok(each < 50, `${each.toFixed(1)} ms`);
  const home = code('./Home.tsx');
  assert.ok(home.includes('useMemo(() => homePage({ recent, forgotten, ...more }, day), [recent, forgotten, more, day])'), 'not per redraw');
  // the day turns over only when Home comes back into view, never under my thumb at midnight
  assert.ok(/if \(!inView\) return;\s*setPlays\(playStore\.all\(\)\);\s*setDay\(dayOf\(Date\.now\(\)\)\);/.test(home));
  assert.equal(home.match(/dayOf\(Date\.now\(\)\)/g).length, 2, 'the day is read at first draw and on coming back, nowhere else');
});

ok('"See all" lands on the row\'s own list: every card is in the chip and order it opens', () => {
  for (const row of HOME_ROWS) {
    const all = new Set(ids(chipSongs(sortSongs(POOL, row.sort, LIB.plays), row.chip, LIB.facts)));
    assert.ok(ROWS[row.key].every((song) => all.has(song.id)), `${row.title}: every card is in the list See all opens`);
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
  const fresh = homePage(homeRows(LIB.songs.map((song) => ({ ...song, date: null })), bare), DAY);
  assert.deepEqual([fresh.added.length, fresh.most.length, fresh.favorites.length, fresh.versions.length], [0, 0, 0, 0]);
  assert.equal(fresh.untagged.length, 12, 'Needs tags is the one row a fresh library can fill (Mine songs, none tagged)');
  const empty = homePage(homeRows([], bare), DAY);
  assert.deepEqual(Object.values(empty).map((list) => list.length), [0, 0, 0, 0, 0, 0, 0]);
  const home = code('./Home.tsx');
  assert.ok(/function Row\([^)]*\) \{\s*if \(!songs\.length\) return null;/.test(home), 'a row with nothing in it draws nothing, heading included');
  assert.ok(home.includes('{HOME_ROWS.map((row) => (') && home.includes('songs={rows[row.key]}'), 'Home draws the tested rows');
  assert.ok(home.includes("homeRows(playable.filter((song) => ratings.get(song.id) !== 'shelved')"), 'only songs that can play now, never an Archived one');
  // one play is "recently played", not "most played"
  const once = homeRows(LIB.songs, { ...bare, plays: new Map([[LIB.songs[0].id, { n: 1, last: 5 }]]) });
  assert.equal(once.most.length, 0);
});

ok('review catch 3: before the phone has ever had the laptop\'s tags, nothing is listed as needing tags (Home row and Library chip)', () => {
  const mine = POOL.filter((song) => song.mine === 'mine');
  const lines = new Map([[mine[0].id, 2]]);
  const unknown = { ...LIB.facts, tagged: taggedOnceKnown(false, lines) };
  assert.equal(homeRows(POOL, unknown).untagged.length, 0);
  assert.equal(chipSongs(POOL, 'untagged', unknown).length, 0);
  const known = { ...LIB.facts, tagged: taggedOnceKnown(true, lines) };
  assert.equal(chipSongs(POOL, 'untagged', known).length, mine.length - 1, 'once known: every Mine song but the tagged one');
  for (const file of ['./Home.tsx', './Library.tsx']) assert.ok(code(file).includes('tagged: taggedOnceKnown(tagsKnown, lines)'), `${file} asks whether the tags are known`);
});

console.log(`\n${n} library and Home row checks passed`);
