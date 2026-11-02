// Self-test for the play order: node --experimental-strip-types app/playOrder.test.mjs
import assert from 'node:assert/strict';
import { currentId, jumpTo, nextInOrder, previousInOrder, removeFromOrder, setShuffle, startOrder, upNext, walkAhead, walkBack, withPending, withoutRestored } from './playOrder.ts';

const keep = () => 0.999; // shuffling with this leaves the list as it was
const abcd = ['a', 'b', 'c', 'd'];
const list = (current, removed = []) => startOrder(abcd, current, false, keep, removed);
const mixed = (current, ids = abcd) => startOrder(ids, current, true, keep);
const walk = (order, avoid = []) => {
  const seen = [];
  for (let o = nextInOrder(order, avoid); o; o = nextInOrder(o, avoid)) seen.push(currentId(o));
  return seen;
};
const tests = {
  'list order wraps both ways': () => {
    assert.equal(currentId(nextInOrder(list('d'))), 'a');
    assert.equal(currentId(previousInOrder(list('a'))), 'd');
  },
  'one song in list order plays itself again': () => assert.equal(currentId(nextInOrder(startOrder(['a'], 'a', false))), 'a'),
  'shuffle plays each song once, then stops': () => assert.deepEqual(walk(mixed('b')), ['a', 'c', 'd']),
  'shuffle really mixes, with the tapped song first': () => {
    const order = startOrder(abcd, 'a', true, () => 0);
    assert.equal(order.sequence[0], 'a');
    assert.deepEqual([...order.sequence].sort(), abcd);
    assert.notDeepEqual(order.sequence, abcd);
  },
  'shuffle previous goes back, then stops at the first': () => {
    const two = nextInOrder(mixed('b'));
    const back = previousInOrder(two);
    assert.equal(currentId(back), 'b');
    assert.equal(previousInOrder(back), null);
    assert.equal(currentId(nextInOrder(back)), currentId(two));
  },
  'list order skips a removed song both ways': () => {
    const next = nextInOrder(removeFromOrder(list('b')));
    assert.equal(currentId(next), 'c');
    assert.equal(currentId(previousInOrder(next)), 'a');
  },
  'list order with every song removed ends': () => assert.equal(nextInOrder(removeFromOrder(startOrder(['a'], 'a', false))), null),
  'shuffle: removed song never returns and Previous still works': () => {
    const b = nextInOrder(mixed('a'));
    const c = nextInOrder(removeFromOrder(b));
    assert.equal(currentId(c), 'c');
    assert.equal(currentId(previousInOrder(c)), 'a');
    assert.deepEqual(walk(c), ['d']);
  },
  'shuffle: stopped on a removed last song, Previous still reaches the one before': () => {
    const b = nextInOrder(mixed('a', ['a', 'b']));
    const out = removeFromOrder(b);
    assert.equal(nextInOrder(out), null);
    assert.equal(currentId(previousInOrder(out)), 'a');
    assert.equal(previousInOrder(removeFromOrder(mixed('a', ['a', 'b']))), null);
  },
  'undo is the saved order, unchanged': () => {
    const b = nextInOrder(mixed('a'));
    const saved = JSON.stringify(b);
    removeFromOrder(b);
    assert.equal(JSON.stringify(b), saved);
  },
  'switching shuffle keeps removed songs out and the same song current': () => {
    const out = setShuffle(removeFromOrder(list('a')), true, keep);
    assert.equal(currentId(out), 'a');
    assert.deepEqual(walk(out), ['b', 'c', 'd']);
    const back = setShuffle(nextInOrder(out), false, keep);
    assert.deepEqual(back.removed, ['a']);
    assert.equal(currentId(back), 'b');
    assert.equal(currentId(previousInOrder(back)), 'd');
  },
  'shuffle never lands on an avoided song': () => assert.deepEqual(walk(mixed('a'), ['b', 'd']), ['c']),
  'list order still plays an avoided song': () => assert.equal(currentId(nextInOrder(list('a'), ['b'])), 'b'),
  'a tapped avoided song still plays, and shuffle moves on from it': () => assert.deepEqual(walk(mixed('c'), ['c']), ['a', 'b', 'd']),
  'everything avoided ends shuffle': () => assert.equal(nextInOrder(mixed('a', ['a', 'b']), ['b']), null),
  'a played song stays reachable after it becomes avoided': () => {
    const b = nextInOrder(mixed('a'));
    assert.equal(currentId(nextInOrder(previousInOrder(b), ['b'])), 'b');
  },
  'jump keeps removed songs out and carries on from there': () => {
    const jumped = jumpTo(removeFromOrder(list('b')), 'd');
    assert.equal(currentId(jumped), 'd');
    assert.equal(currentId(nextInOrder(jumped)), 'a');
    assert.equal(currentId(nextInOrder(nextInOrder(jumped))), 'c');
  },
  'window: ahead wraps in list order, behind is nearest last': () => {
    assert.deepEqual(walkAhead(list('c'), 3).map(currentId), ['d', 'a', 'b']);
    assert.deepEqual(walkBack(list('b'), 2).map(currentId), ['d', 'a']);
  },
  'window: a shuffle has nothing behind at the start, and ends': () => {
    assert.deepEqual(walkBack(mixed('a'), 2), []);
    assert.deepEqual(walkAhead(mixed('c'), 9).map(currentId), ['a', 'b', 'd']);
  },
  'Up next shows each song once and drops removed ones': () => {
    assert.deepEqual(upNext(list('c'), 99), ['d', 'a', 'b']);
    const gone = nextInOrder(removeFromOrder(list('c')));
    assert.deepEqual(upNext(gone, 99), ['a', 'b']);
    assert.deepEqual(upNext(startOrder(['a'], 'a', false), 99), []);
  },
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
