// Self-test for the ranking ladder: node spike/search/rank.test.mjs
import assert from 'node:assert/strict';
import { buildIndex, inOrder, hasPhrase, search, stem, stems, TIER, weight, words } from './rank.mjs';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`PASS  ${name}`);
};
const tag = (id, text, at_sec = 0) => ({ id, song_id: `song-${id}`, text, at_sec });
const ids = (results) => results.map((r) => r.tag.id);

ok('words: lowercase, apostrophes dropped, punctuation splits, accents folded', () => {
  assert.deepEqual(words("Drippin' on 'em — CAFÉ, 2x!"), ['drippin', 'on', 'em', 'cafe', '2x']);
  assert.deepEqual(words('i’m   here'), ['im', 'here']);
  assert.deepEqual(words('🔥🔥'), []);
});

ok('slang endings meet: drip / drips / dripped / drippin / drippin\' / dripping (3.3)', () => {
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
  // a rare word beats a common one among partial matches
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

console.log(`\nALL PASSED (${n})`);
