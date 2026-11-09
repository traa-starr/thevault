// Search as I type (NEXT 2026-11-09 E): node --experimental-strip-types app/searchTyping.test.mjs
// The word still being typed also matches tag words that start with it (titt finds a tag with "titties"). Finished
// words (a space after them) keep the old ladder exactly: search.test.mjs proves that side and still passes.
import assert from 'node:assert/strict';
import { buildIndex, pieces, searchSongs, typedStems, typedWord } from './search.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};

const tags = [
  { id: 't1', song_id: 'A', text: 'big ole titties on her', at_sec: 12 },
  { id: 't2', song_id: 'B', text: 'titt for tat', at_sec: 5 },
  { id: 't3', song_id: 'C', text: 'dripping in gold', at_sec: 40 },
  { id: 't4', song_id: 'D', text: 'gold on my neck', at_sec: 9 },
  { id: 't5', song_id: 'E', text: 'has to go now', at_sec: 1 },
  { id: 't6', song_id: 'F', text: 'she has gone', at_sec: 2 },
];
const index = buildIndex(tags);
const songsFor = (text) => searchSongs(index, text).rows.map((r) => r.songId);

ok('titt finds the tag with titties, before the word is finished', () => {
  assert.ok(songsFor('titt').includes('A'));
  assert.ok(songsFor('tit').includes('A'));
  assert.ok(songsFor('big ti').includes('A'));
});
ok('the tag holding the word itself comes before one that only starts with it', () => {
  assert.deepEqual(songsFor('titt'), ['B', 'A']);
});
ok('a finished word (a space after it) keeps the old ladder: no reaching forward', () => {
  assert.deepEqual(songsFor('titt '), ['B']);
  assert.equal(typedWord('titt '), '');
  assert.equal(typedWord('has to go'), 'go');
  assert.equal(typedWord('has to go,'), '');
});
ok('only the last word reaches forward, never an earlier one', () => {
  assert.ok(!songsFor('titt gold ').includes('A'));
  assert.deepEqual(songsFor('drippi'), ['C']);
});
ok('one letter is not a word being typed', () => {
  assert.equal(typedWord('t'), '');
  assert.deepEqual(songsFor('t'), []);
});
ok('the ladder still ranks: a phrase made with the half-typed word beats the words merely in order', () => {
  // F "she has gone" holds "has go(ne)" as a phrase; E "has to go now" has both words with a gap
  assert.deepEqual(songsFor('has go').slice(0, 2), ['F', 'E']);
  assert.deepEqual(songsFor('has go ').slice(0, 1), ['E']); // finished: only the word itself
});
ok('the half-typed word is bold in the row', () => {
  const bold = pieces('big ole titties on her', ['tit'], 'titt').filter((p) => p.hit).map((p) => p.text);
  assert.deepEqual(bold, ['titties']);
});
ok('the stand-ins are capped, and never the word itself', () => {
  const many = buildIndex(Array.from({ length: 200 }, (_, i) => ({ id: `m${i}`, song_id: `S${i}`, text: `st${String.fromCharCode(97 + (i % 26))}${i}x`, at_sec: i })));
  assert.ok(typedStems(many, 'st').length <= 40);
  assert.ok(!typedStems(index, 'gold').includes('gold'));
});

// speed: a big fake library, every search typed a letter at a time (each keystroke is a search)
{
  const WORDS = 'money drip gold chain titties whip ride night city love hate pain rain fire ice cold heat street block gang fam real fake dream sleep wake'.split(' ');
  const big = buildIndex(Array.from({ length: 27000 }, (_, i) => ({
    id: `b${i}`, song_id: `S${i % 1395}`, at_sec: i % 200,
    text: [0, 1, 2, 3, 4].map((k) => WORDS[(i * 7 + k * 13 + (i >> 3)) % WORDS.length] + (i % 5 === k ? 's' : '')).join(' '),
  })));
  const times = [];
  for (const q of ['titties on her', 'gold chain', 'dripping', 'night city rain', 'money']) {
    for (let len = 2; len <= q.length; len++) {
      const began = performance.now();
      searchSongs(big, q.slice(0, len));
      times.push(performance.now() - began);
    }
  }
  times.sort((a, b) => a - b);
  const typical = times[Math.floor(times.length / 2)];
  const slow = times[Math.floor(times.length * 0.95)];
  ok(`27,000 tags, a search per keystroke: typical ${typical.toFixed(1)} ms, slow end ${slow.toFixed(1)} ms (${times.length} searches)`, () => {
    assert.ok(slow < 100, 'slow end under 100 ms on the laptop');
  });
}

console.log(`\nALL PASSED (${n})`);
