// Self-test for search on the phone: node --experimental-strip-types app/search.test.mjs
// The spike's ladder tests (spike/search/rank.test.mjs), ported to the app's file, plus one row per song, the edge
// inputs (empty, one letter, emoji, 200 characters, regex characters) and a library my size with the network gone.
import assert from 'node:assert/strict';
import { buildIndex, hasPhrase, indexFor, inOrder, MAX_QUERY_WORDS, pieces, queryStems, search, searchSongs, stem, stems, TIER, weight, words } from './search.ts';
import { fakeLibrary, fakeSearches } from '../tools/search/fake.mjs';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`PASS  ${name}`);
};
const tag = (id, text, at_sec = 0, song = `song-${id}`) => ({ id, song_id: song, text, at_sec });
const ids = (results) => results.map((r) => r.tag.id);

ok('words: lowercase, apostrophes dropped, punctuation splits, accents folded', () => {
  assert.deepEqual(words("Drippin' on 'em — CAFÉ, 2x!"), ['drippin', 'on', 'em', 'cafe', '2x']);
  assert.deepEqual(words('i’m   here'), ['im', 'here']);
  assert.deepEqual(words('🔥🔥'), []);
});

ok("slang endings meet: drip / drips / dripped / drippin / drippin' / dripping (3.3)", () => {
  const forms = ['drip', 'drips', 'dripped', 'drippin', "drippin'", 'dripping'].map((w) => stems(w)[0]);
  assert.equal(new Set(forms).size, 1, forms.join(' '));
  for (const [a, b] of [['flexin', 'flex'], ['ballin', 'ball'], ['stuntin', 'stunt'], ['boyz', 'boys'], ['runnin', 'run'], ['hustlin', 'hustle'], ['ridin', 'ride'], ['smokin', 'smoke']])
    assert.equal(stem(a), stem(b), `${a} ~ ${b}`);
});

ok('short words and numbers are left alone', () => {
  for (const w of ['in', 'is', 'has', 'to', 'go', '808', '2024']) assert.equal(stem(w), w);
  assert.notEqual(stem('rain'), stem('ran'));
});

ok('phrase and in-order helpers', () => {
  assert.equal(hasPhrase(['a', 'b', 'c', 'd'], ['b', 'c']), true);
  assert.equal(hasPhrase(['a', 'b', 'x', 'c'], ['b', 'c']), false);
  assert.equal(inOrder(['a', 'b', 'x', 'c'], ['b', 'c']), true);
  assert.equal(inOrder(['c', 'b'], ['b', 'c']), false);
});

const tags = [
  tag('phrase', 'it has to go now'),
  tag('order', 'it has got to really go'),
  tag('all', 'go to it, it has been said'),
  tag('some-rare', 'the bassline has a wobble'),
  tag('some-common', 'it is what it is'),
  tag('none', 'snare roll into the hook'),
  tag('drip1', "drippin' on the beat"),
  tag('drip2', 'too much drip in the mix'),
];
const index = buildIndex(tags);

ok('the ladder: exact phrase > in order with gaps > all words > some words (3.1)', () => {
  const got = search(index, 'has to go');
  assert.deepEqual(got.slice(0, 3).map((r) => [r.tag.id, r.tier]), [['phrase', TIER.phrase], ['order', TIER.inOrder], ['all', TIER.all]]);
  assert.ok(got.slice(3).every((r) => r.tier === TIER.some));
});

ok('never excludes: one shared word is enough to be a result', () => {
  assert.ok(ids(search(index, 'wobble nothing-else-matches')).includes('some-rare'));
  assert.deepEqual(ids(search(index, 'zzzz')), []);
  assert.deepEqual(search(index, '  !! '), []);
});

ok('common words down-weighted, not banned: "has to" works (3.2)', () => {
  assert.equal(search(index, 'has to')[0].tag.id, 'phrase');
  assert.ok(weight(index, 'it') < weight(index, 'wobble'), 'a word in many tags weighs less');
  assert.ok(weight(index, 'it') > 0, 'but never nothing');
  const some = search(index, 'it wobble').filter((r) => r.tier === TIER.some);
  assert.equal(some[0].tag.id, 'some-rare');
});

ok('slang search finds every form', () => {
  assert.deepEqual(new Set(ids(search(index, 'dripping'))), new Set(['drip1', 'drip2']));
  assert.deepEqual(new Set(ids(search(index, 'drip'))), new Set(['drip1', 'drip2']));
});

ok('ties: the shorter tag first, then the earlier second', () => {
  const t = buildIndex([tag('long', 'hook comes in after the long build up', 9), tag('short', 'hook here', 50), tag('short-early', 'hook here', 5)]);
  assert.deepEqual(ids(search(t, 'hook')), ['short-early', 'short', 'long']);
});

ok('limit caps the list', () => {
  const many = buildIndex(Array.from({ length: 50 }, (_, i) => tag(`t${i}`, `hook number ${i}`, i)));
  assert.equal(search(many, 'hook').length, 20);
  assert.equal(search(many, 'hook', 5).length, 5);
});

// ---- the app's own: one row per song, edge inputs, highlight ----

ok('one row per song: its best tag ranks it, the others count as "more"', () => {
  const t = buildIndex([
    tag('a1', 'cold in the booth', 10, 'A'),
    tag('a2', 'it has to go now', 40, 'A'),
    tag('a3', 'go again', 70, 'A'),
    tag('b1', 'has to go', 5, 'B'),
    tag('c1', 'nothing here', 1, 'C'),
  ]);
  const { rows, total } = searchSongs(t, 'has to go');
  assert.deepEqual(rows.map((r) => [r.songId, r.tag.id, r.more]), [['B', 'b1', 0], ['A', 'a2', 1]]);
  assert.equal(total, 2);
});

ok('songs Library hides are dropped before the cap, never leaving the list short', () => {
  const t = buildIndex(Array.from({ length: 80 }, (_, i) => tag(`t${i}`, `hook ${i}`, i, `S${i}`)));
  const { rows, total } = searchSongs(t, 'hook', 50, (id) => Number(id.slice(1)) % 2 === 0);
  assert.equal(rows.length, 40);
  assert.equal(total, 40);
  assert.ok(rows.every((r) => Number(r.songId.slice(1)) % 2 === 0));
  assert.equal(searchSongs(t, 'hook').rows.length, 50, 'capped at 50 rows');
  assert.equal(searchSongs(t, 'hook').total, 80, 'but every match counted');
});

ok('edge inputs: empty, spaces, emoji only, one letter, regex characters, 200+ characters', () => {
  const t = buildIndex([tag('x', 'a (b) [c] *d* hook', 3), tag('y', 'i like it', 4)]);
  for (const q of ['', '   ', '🔥😀', '((((', '[', '.*', '\\']) assert.deepEqual(searchSongs(t, q).rows, [], JSON.stringify(q));
  assert.ok(searchSongs(t, 'i').rows.length >= 1, 'one letter is searched');
  assert.equal(searchSongs(t, '(b)').rows[0].tag.id, 'x');
  const long = 'hook '.repeat(100) + 'like';
  assert.ok(queryStems(long).length <= 200);
  assert.ok(new Set(queryStems(Array.from({ length: 40 }, (_, i) => `w${i}`).join(' '))).size <= MAX_QUERY_WORDS);
  assert.equal(searchSongs(t, long).rows[0].tag.id, 'x', 'cut to 200 characters, still finds it');
});

ok('matched words are marked for bold, everything else kept as written', () => {
  const got = pieces("Drippin' on the beat, 2x!", queryStems('drip beat'));
  assert.equal(got.map((p) => p.text).join(''), "Drippin' on the beat, 2x!");
  assert.deepEqual(got.filter((p) => p.hit).map((p) => p.text), ["Drippin'", 'beat']);
  assert.deepEqual(pieces('🔥 fire', queryStems('fire')).map((p) => [p.text, p.hit]), [['🔥 ', false], ['fire', true]]);
});

ok('the index is built once per tag list, again when the list changes', () => {
  const list = [tag('a', 'hook')];
  assert.equal(indexFor(list), indexFor(list));
  assert.notEqual(indexFor(list), indexFor([...list]));
});

// ---- a library my size, offline: the network is gone and nothing asks for it ----
{
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('search must never touch the network');
  };
  const lib = fakeLibrary();
  const songs = new Set(lib.map((t) => t.song_id)).size;
  const t0 = performance.now();
  const big = indexFor(lib);
  const built = performance.now() - t0;
  const queries = fakeSearches(lib, 300);
  const times = [];
  let empty = 0;
  for (const q of queries) {
    const s = performance.now();
    const { rows, total } = searchSongs(big, q);
    times.push(performance.now() - s);
    if (!rows.length) empty++;
    assert.ok(rows.every((r, i) => i === 0 || r.tier <= rows[i - 1].tier), 'best tier first');
    // never hides a song that shares a word: the count is every song holding any of the search's words
    if (times.length <= 30) {
      const want = new Set(queryStems(q));
      const sharing = new Set(lib.filter((t) => stems(t.text).some((w) => want.has(w))).map((t) => t.song_id));
      assert.equal(total, sharing.size, q);
    }
  }
  globalThis.fetch = realFetch;
  times.sort((a, b) => a - b);
  const typical = times[Math.floor(times.length / 2)];
  const slow = times[Math.floor(times.length * 0.95)];
  ok(`1,395-song library offline: ${songs} songs, ${lib.length} tags, index ${built.toFixed(0)} ms, search typical ${typical.toFixed(1)} ms, slow end ${slow.toFixed(1)} ms`, () => {
    assert.ok(songs > 1300 && lib.length > 20000);
    assert.ok(empty < queries.length * 0.2, 'most searches find something');
    assert.equal(searchSongs(big, 'zzq nothing like this').rows.length > 0, true, 'common words alone still find songs');
    assert.deepEqual(searchSongs(big, 'zzqq').rows, [], 'a word nowhere: no rows');
    assert.ok(slow < 100, 'slow end under 100 ms on the laptop');
  });
}

console.log(`\nALL PASSED (${n})`);
