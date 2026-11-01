// Self-test for the play order: node --experimental-strip-types app/playOrder.test.mjs
import assert from 'node:assert/strict';
import { nextInOrder, previousInOrder, removeFromOrder, setShuffle, startOrder, withPending, withoutRestored } from './playOrder.ts';

const first = () => 0; // always the first song left
const walk = (order, count, avoid = []) => {
  const seen = [];
  for (let o = nextInOrder(order, count, first, avoid); o; o = nextInOrder(o, count, first, avoid)) seen.push(o.current);
  return seen;
};
const tests = {
  'list order wraps both ways': () => {
    assert.equal(nextInOrder(startOrder(2, false), 3).current, 0);
    assert.equal(previousInOrder(startOrder(0, false), 3).current, 2);
  },
  'one song in list order plays itself again': () => assert.equal(nextInOrder(startOrder(0, false), 1).current, 0),
  'shuffle plays each song once, then stops': () => assert.deepEqual(walk(startOrder(1, true), 4), [0, 2, 3]),
  'shuffle previous goes back, then stops at the first': () => {
    const two = nextInOrder(startOrder(1, true), 3, first);
    const back = previousInOrder(two, 3);
    assert.equal(back.current, 1);
    assert.equal(previousInOrder(back, 3), null);
    assert.equal(nextInOrder(back, 3, first).current, two.current);
  },
  'list order skips a removed song both ways': () => {
    const out = removeFromOrder(startOrder(1, false));
    const next = nextInOrder(out, 3);
    assert.equal(next.current, 2);
    assert.equal(previousInOrder(next, 3).current, 0);
    assert.equal(nextInOrder(next, 3).current, 0);
    assert.equal(nextInOrder(nextInOrder(next, 3), 3).current, 2);
  },
  'list order with every song removed ends': () => assert.equal(nextInOrder(removeFromOrder(startOrder(0, false)), 1), null),
  'shuffle: removed song never returns and Previous still works': () => {
    const a = startOrder(0, true);
    const b = nextInOrder(a, 4, first); // 1
    const out = removeFromOrder(b);
    const c = nextInOrder(out, 4, first); // 2
    assert.equal(c.current, 2);
    assert.equal(previousInOrder(c, 4).current, 0);
    assert.deepEqual(walk(c, 4), [3]);
  },
  'shuffle: removing mid-history moves on to the next played song': () => {
    const a = startOrder(0, true);
    const b = nextInOrder(a, 4, first);
    const c = nextInOrder(b, 4, first);
    const backAtB = previousInOrder(c, 4);
    const out = removeFromOrder(backAtB);
    const next = nextInOrder(out, 4, first);
    assert.equal(next.current, c.current);
    assert.equal(previousInOrder(next, 4).current, 0);
  },
  'shuffle: removing the very first song': () => {
    const out = removeFromOrder(startOrder(2, true));
    const next = nextInOrder(out, 3, first);
    assert.equal(next.current, 0);
    assert.equal(previousInOrder(next, 3), null);
  },
  'shuffle: stopped on a removed last song, Previous still reaches the one before': () => {
    const b = nextInOrder(startOrder(0, true), 2, first);
    const out = removeFromOrder(b);
    assert.equal(nextInOrder(out, 2, first), null);
    assert.equal(previousInOrder(out, 2).current, 0);
    assert.equal(previousInOrder(removeFromOrder(startOrder(0, true)), 2), null);
  },
  'undo is the saved order, unchanged': () => {
    const b = nextInOrder(startOrder(0, true), 3, first);
    const saved = JSON.stringify(b);
    removeFromOrder(b);
    assert.equal(JSON.stringify(b), saved);
  },
  'switching shuffle keeps removed songs out': () => {
    const out = setShuffle(removeFromOrder(startOrder(0, false)), true);
    assert.deepEqual(walk(out, 3), [1, 2]);
    const back = setShuffle(nextInOrder(out, 3, first), false);
    assert.deepEqual(back.removed, [0]);
    assert.equal(nextInOrder(back, 3).current, 2);
  },
  'shuffle never lands on an avoided song': () => assert.deepEqual(walk(startOrder(0, true), 5, [2, 4]), [1, 3]),
  'list order still plays an avoided song': () => assert.equal(nextInOrder(startOrder(1, false), 3, first, [2]).current, 2),
  'a tapped avoided song still plays, and shuffle moves on from it': () => {
    assert.deepEqual(walk(startOrder(2, true), 3, [2]), [0, 1]);
  },
  'everything avoided ends shuffle': () => assert.equal(nextInOrder(startOrder(0, true), 2, first, [1]), null),
  'pending not mine leaves the list, pending mine marks it': () => {
    const songs = [{ id: 'a', mine: 'unknown', sorted: false }, { id: 'b', mine: 'likely mine', sorted: false }, { id: 'c', mine: 'unknown', sorted: false }];
    const out = withPending(songs, [
      { id: '1', kind: 'mine_set', data: { song_id: 'a', value: 'not mine' } },
      { id: '2', kind: 'mine_set', data: { song_id: 'b', value: 'mine' } },
    ]);
    assert.deepEqual(out, [{ id: 'b', mine: 'mine', sorted: true }, { id: 'c', mine: 'unknown', sorted: false }]);
  },
  'pending undo keeps the song in the list': () => {
    const songs = [{ id: 'a', mine: 'unknown', sorted: false }];
    const out = withPending(songs, [
      { id: '1', kind: 'mine_set', data: { song_id: 'a', value: 'not mine' } },
      { id: '2', kind: 'mine_restore', data: { song_id: 'a' } },
    ]);
    assert.deepEqual(out, songs);
  },
  'a pending restore takes a song out of Hidden at once': () => {
    const hidden = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const out = withoutRestored(hidden, [
      { id: '1', kind: 'mine_restore', data: { song_id: 'a' } },
      { id: '2', kind: 'mine_set', data: { song_id: 'b', value: 'mine' } },
    ]);
    assert.deepEqual(out, [{ id: 'c' }]);
  },
  'a later not mine puts a song back in Hidden': () => {
    const out = withoutRestored([{ id: 'a' }], [
      { id: '1', kind: 'mine_restore', data: { song_id: 'a' } },
      { id: '2', kind: 'mine_set', data: { song_id: 'a', value: 'not mine' } },
    ]);
    assert.deepEqual(out, [{ id: 'a' }]);
  },
};

let failed = 0;
for (const [name, test] of Object.entries(tests)) {
  try {
    test();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}  ${e.message}`);
  }
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exitCode = failed ? 1 : 0;
