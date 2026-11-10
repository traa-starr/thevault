// The search screen (NEXT 2026-11-10 A): node --experimental-strip-types app/searchScreen.test.mjs
// Search moved from a box inside Library to its own screen. This proves the move changed nothing a search finds:
//   1. for the same words, the new screen's list is the list Library's search gave (a frozen copy of that code is the
//      yardstick below), row for row, with the same tagged line, the same "+N" and the same bold words;
//   2. it is no slower, and its time is reported to the laptop the same way;
//   3. a tap plays the song on the row tapped, even if the results have moved on; one tap is enough with the keyboard up;
//   4. recent searches: only ones that led to a tap, eight, no doubles, they survive a restart and a wipe starts empty;
//   5. search is one place: opened twice it is still one screen, Cancel goes back where I was.
// Fake songs and fake lines only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addRecent, findSongs, indexFor, queryStems, readRecents, RECENTS_KEPT, searchSongs, stems, typedWord, writeRecents } from './search.ts';
import { sortSongs } from './libraryCore.ts';
import { searchLeft, searchOpened, sortOpened, tabTapped, reachable } from './sheetCore.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const code = (file) => source(file).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// ---------- a made-up library the size of the real one: 1,395 rows, some in version groups, ~400 tagged lines ----------
const NOUNS = ['midnight', 'run', 'cold', 'brew', 'lights', 'out', 'paper', 'planes', 'basement', 'tape', 'gold', 'teeth', 'window', 'seat', 'static', 'late', 'checkout', 'rooftop', 'still', 'here', 'overtime', 'blue', 'hour', 'echo', 'park', 'freestyle', 'demo', 'idea', 'rough', 'final'];
const LINE_WORDS = ['hook', 'comes', 'in', 'double', 'the', 'ad-libs', 'beat', 'switch', 'punch', 'here', 'breath', 'second', 'verse', 'mumble', 'line', 'rewrite', 'snare', 'roll', 'good', 'take', 'outro', "drippin'", 'drip', 'dripped', 'has', 'to', 'go', 'now', 'it', 'on', 'too', 'much', 'mix', 'slower', 'café', 'boyz', 'hustlin', 'ride'];
function library() {
  const rnd = seeded(1395);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const songs = Array.from({ length: 1395 }, (_, i) => ({
    id: `s${i}`,
    title: `${pick(NOUNS)} ${pick(NOUNS)}${rnd() < 0.3 ? ` ${pick(NOUNS)}` : ''}${rnd() < 0.2 ? ` ${Math.floor(rnd() * 9) + 1}` : ''}`,
    date: rnd() < 0.05 ? null : rnd() < 0.1 ? `${2014 + Math.floor(rnd() * 12)}` : `${2014 + Math.floor(rnd() * 12)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
    mine: rnd() < 0.5 ? 'mine' : 'unknown', sorted: true, where: 'laptop', main: null,
  }));
  // 40 version groups of 2 to 4: the versions aren't rows, their lines count for their Main's row
  const families = new Map();
  const versions = [];
  for (let g = 0; g < 40; g++) {
    const main = `s${g * 30}`;
    families.set(main, main);
    for (let v = 1; v < 2 + (g % 3); v++) {
      const id = `${main}-v${v}`;
      families.set(id, main);
      versions.push(id);
    }
  }
  const owners = [...songs.map((song) => song.id), ...versions];
  const tags = Array.from({ length: 400 }, (_, i) => ({
    id: `t${i}`, song_id: pick(owners), at_sec: Math.floor(rnd() * 200),
    text: Array.from({ length: 2 + Math.floor(rnd() * 6) }, () => pick(LINE_WORDS)).join(' '),
  }));
  return { songs, families, tags };
}
const LIB = library();
const BASE = sortSongs(LIB.songs, 'date');
const rowOf = (id) => LIB.families.get(id) ?? id;

/** Library's search as it was before this step (Library.tsx `found`, 2026-11-10), kept here unchanged as the yardstick. */
function today(base, allTags, families, byId, query) {
  const asked = queryStems(query);
  const words = new Set(asked);
  const inBase = new Set(base.map((song) => song.id));
  const index = indexFor(allTags);
  const { rows: hits, total } = searchSongs(index, query, undefined, (id) => inBase.has(id), (id) => families.get(id) ?? id);
  const hitOf = new Map(hits.map((hit) => [hit.songId, hit]));
  const wanted = query.trim().toLowerCase();
  const titleWords = (song) => new Set(stems(song.title));
  const share = base.map((song) => {
    const own = titleWords(song);
    const hit = asked.filter((w) => own.has(w)).length;
    return { song, all: song.title.toLowerCase().includes(wanted) || (asked.length > 0 && words.size > 0 && [...words].every((w) => own.has(w))), some: hit > 0 };
  });
  const byTitle = share.filter((one) => one.all).map((one) => one.song);
  const listed = new Set(byTitle.map((song) => song.id));
  const byTag = hits.filter((hit) => !listed.has(hit.songId)).map((hit) => byId.get(hit.songId)).filter(Boolean);
  byTag.forEach((song) => listed.add(song.id));
  const someTitle = share.filter((one) => one.some && !listed.has(one.song.id)).map((one) => one.song);
  return { list: [...byTitle, ...byTag, ...someTitle], hitOf, more: Math.max(0, total - hits.length), stems: asked, typed: typedWord(query) };
}

// the words I'd type: whole lines, half words, slang endings, titles, nonsense, emoji, a pasted verse
function queries() {
  const rnd = seeded(77);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const out = ['hook', 'dri', 'drip on the beat', "drippin'", 'has to go', 'go has', 'the', 'zzqx', '😀😀', ' ', 'MIDNIGHT run', 'midnight', 'cafe', 'boys', 'hustle', 'beat ', 'be', 'b', 'too much drip in the mix slower', 'x'.repeat(300), `${LINE_WORDS.join(' ')} ${LINE_WORDS.join(' ')}`];
  for (let i = 0; i < 180; i++) {
    const words = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => (rnd() < 0.6 ? pick(LINE_WORDS) : pick(NOUNS)));
    const text = words.join(' ');
    out.push(rnd() < 0.3 ? text.slice(0, Math.max(1, text.length - 1 - Math.floor(rnd() * 3))) : text); // often mid-word, as typed
  }
  return out;
}
const QUERIES = queries();
const byId = new Map(BASE.map((song) => [song.id, song]));
const flat = (found) => ({
  list: found.list.map((song) => song.id),
  hits: [...found.hitOf].map(([id, hit]) => [id, hit.tag.id, hit.tag.at_sec, hit.more, hit.tier, hit.near ?? false]),
  more: found.more, stems: found.stems, typed: found.typed,
});

ok(`for ${QUERIES.length} searches over 1,395 songs and 400 lines, the search screen lists exactly what Library's search listed`, () => {
  let rows = 0;
  let lines = 0;
  for (const q of QUERIES) {
    const now = findSongs(BASE, LIB.tags, rowOf, q);
    const was = today(BASE, LIB.tags, LIB.families, byId, q);
    assert.deepEqual(flat(now), flat(was), `"${q.slice(0, 30)}"`);
    rows += now.list.length;
    lines += now.hitOf.size;
  }
  assert.ok(rows > 5000 && lines > 1000, `the searches found things: ${rows} rows, ${lines} tagged lines`);
});

ok('a version\'s line shows on its family\'s row, and a song Library doesn\'t list never shows', () => {
  const versionTag = LIB.tags.find((tag) => tag.song_id.includes('-v'));
  assert.ok(versionTag, 'the made-up library has a line on a version');
  const found = findSongs(BASE, LIB.tags, rowOf, versionTag.text);
  const main = rowOf(versionTag.song_id);
  assert.ok(found.list.some((song) => song.id === main) && !found.list.some((song) => song.id.includes('-v')));
  const fewer = BASE.filter((song) => song.id !== main);
  assert.ok(!findSongs(fewer, LIB.tags, rowOf, versionTag.text).list.some((song) => song.id === main));
});

ok('no slower than Library\'s search: typical and slow-end times over the same searches, and the phone\'s 15 ms worst is far off', () => {
  const time = (fn) => {
    const all = [];
    for (let round = 0; round < 3; round++) {
      for (const q of QUERIES) {
        const began = performance.now();
        fn(q);
        all.push(performance.now() - began);
      }
    }
    all.sort((a, b) => a - b);
    return { typical: all[Math.floor(all.length / 2)], slow: all[Math.floor(all.length * 0.95)] };
  };
  const was = time((q) => today(BASE, LIB.tags, LIB.families, byId, q));
  const now = time((q) => findSongs(BASE, LIB.tags, rowOf, q));
  console.log(`     Library's search: typical ${was.typical.toFixed(2)} ms, slow end ${was.slow.toFixed(2)} ms; search screen: typical ${now.typical.toFixed(2)} ms, slow end ${now.slow.toFixed(2)} ms`);
  assert.ok(now.typical <= was.typical * 1.5 + 0.5, 'typical');
  assert.ok(now.slow <= was.slow * 1.5 + 1, 'slow end');
});

ok('the time it reports is the search\'s own, with the tag count, as before', () => {
  let t = 100;
  const found = findSongs(BASE, LIB.tags, rowOf, 'hook', () => (t += 7));
  assert.equal(found.ms, 7);
  assert.equal(found.tags, LIB.tags.length);
  const screen = code('./SearchScreen.tsx');
  assert.ok(/if \(found\) timing\.search\(found\.ms, found\.tags\);/.test(screen), 'sent with the other timings, once per search');
  assert.ok(screen.includes('const query = useDeferredValue(text);'), 'typing never waits for a search');
  assert.ok(/findSongs\(base, allTags, \(id\) => families\.get\(id\) \?\? id, query\)/.test(screen), 'the screen runs the tested search');
});

ok('a tap plays the row\'s own song from its line\'s second, whatever the results are by then; one tap is enough', () => {
  const screen = code('./SearchScreen.tsx');
  // the row hands over its song and its line, never a row number that a newer list could point elsewhere
  assert.ok(screen.includes('onPress={() => play(item, hit, query)}') && screen.includes('onPress={(song) => play(song, undefined, query)}'));
  assert.ok(!/\bindex\b/.test(screen.slice(screen.indexOf('renderItem'))), 'no row numbers in a result row');
  assert.ok(screen.includes('hit?.tag.at_sec') && screen.includes("hit!.tag.at_sec, 'search'"), 'it starts at the tagged second');
  assert.ok(screen.includes('keyboardShouldPersistTaps="handled"'), 'the first tap plays; it is not spent closing the keyboard');
  assert.ok(screen.includes('player.showMessage(NOT_HERE)'), 'a song that can\'t play says so');
  assert.ok(screen.includes("<Text style={s.empty}>Loading songs…</Text>") && screen.indexOf('!base ?') < screen.indexOf('!found ?'), 'before the songs are in it says Loading, never "no results"');
  // the results end above the keyboard
  assert.ok(screen.includes('style={{ marginBottom: keyboard }}'), 'the list stops where the keyboard starts');
});

ok('Library has no search box left; the lock-screen link, Home\'s box and the round button all open the one search screen', () => {
  const library = code('./Library.tsx');
  assert.ok(!library.includes('TextInput') && !library.includes('searchSongs') && !library.includes('useSearchAsk'));
  const nav = code('./nav.tsx');
  const open = nav.slice(nav.indexOf('export const openSearch'), nav.indexOf('export const closeSearch'));
  assert.ok(open.includes("player.open('none')") && open.includes('setPlace(searchOpened(place))'), 'the player steps aside, the search screen shows');
  assert.ok(code('./Home.tsx').includes("onPress={() => openSearch('')}") && code('./Frame.tsx').includes("onPress={() => openSearch('')}"));
  const app = code('./App.tsx');
  assert.ok(app.includes('if (ask && addressNow.current) openSearch(ask.q);'), 'the link');
  assert.ok(/\(tab !== 'search' \|\| sort\) && s\.away/.test(app), 'kept drawn, only hidden, like Home and Library');
});

// ---------- one place ------------------------------------------------------------------------------------------------
ok('search is one place: opened twice it\'s the same screen; Cancel goes back to the tab I was on; a tab leaves it', () => {
  const home = { tab: 'home', sort: false };
  const once = searchOpened(home);
  assert.deepEqual(once, { tab: 'search', sort: false });
  assert.deepEqual(searchOpened(once), once);
  assert.deepEqual(searchOpened(sortOpened(home)), once, 'from Sort too: Sort closes');
  assert.deepEqual(searchLeft({ tab: 'library', sort: false }), { tab: 'library', sort: false });
  assert.deepEqual(searchLeft(sortOpened(home)), home, 'opened from Sort: back to Home, not into Sort');
  assert.deepEqual(searchLeft(null), home);
  assert.deepEqual(searchLeft(once), home, 'never back to itself');
  assert.deepEqual(tabTapped(once, 'library'), { tab: 'library', sort: false });
  // the tab bar and mini player answer on the search screen like on any tab; the open player covers them
  assert.deepEqual(reachable({ sheet: 'none', queueFrom: 'none' }, once, true), { sheet: false, tabs: true, mini: true });
  assert.equal(reachable({ sheet: 'player', queueFrom: 'none' }, once, true).tabs, false);
  const nav = code('./nav.tsx');
  assert.ok(nav.includes("if (place.tab !== 'search') cameFrom = place;"), 'a second tap on the button doesn\'t forget where I came from');
  const screen = code('./SearchScreen.tsx');
  assert.ok(/if \(showing\) return;\s*setText\(''\);/.test(screen), 'leaving clears the box; coming back from the player does not (the tab never changed)');
});

// ---------- recent searches ------------------------------------------------------------------------------------------
ok('recent searches: newest first, eight at most, the same words again move up, empty or wordless searches aren\'t kept', () => {
  let list = [];
  for (const words of ['hook', 'beat switch', 'Hook', '  ', '😀', 'drip   on the  beat']) list = addRecent(list, words);
  assert.deepEqual(list, ['drip on the beat', 'Hook', 'beat switch']);
  for (let i = 0; i < 12; i++) list = addRecent(list, `line ${i}`);
  assert.equal(list.length, RECENTS_KEPT);
  assert.equal(list[0], 'line 11');
  assert.ok(addRecent([], 'x'.repeat(500))[0].length <= 60, 'a pasted verse is cut');
});

ok('recent searches survive a restart (the file) and a wipe or a broken file starts empty, never a crash', () => {
  const list = addRecent(addRecent([], 'hook'), 'beat switch');
  assert.deepEqual(readRecents(writeRecents(list)), list);
  for (const broken of [null, undefined, '', '{', '[]', '{"recent":7}', '{"recent":[1,null,"ok",""]}']) assert.ok(Array.isArray(readRecents(broken)));
  assert.deepEqual(readRecents('{"recent":[1,null,"ok",""]}'), ['ok']);
  const store = code('./recentSearches.ts');
  assert.ok(store.includes("new File(Paths.document, 'recent-searches.json')") && store.includes('f.writeSync(writeRecents(next))'), 'written when it changes');
  const screen = code('./SearchScreen.tsx');
  assert.ok(/recents\.add\(words\);/.test(screen) && screen.indexOf('recents.add(words)') > screen.indexOf('showMessage(NOT_HERE)'), 'kept only when a result is tapped and can play');
  assert.ok(!/recents\.add\(/.test(screen.replace('recents.add(words);', '')), 'never while typing');
  assert.ok(screen.includes('onPress={() => setText(words)}'), 'tapping a recent search fills the box; it doesn\'t play anything');
});

console.log(`\n${n} search screen checks passed`);
