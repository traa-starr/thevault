// Self-test for the play order: node --experimental-strip-types app/playOrder.test.mjs
import assert from 'node:assert/strict';
import { currentId, jumpTo, moveInOrder, nextInOrder, previousInOrder, removeFromOrder, setShuffle, startOrder, upNext, walkAhead, walkBack, withPending, withoutRestored, playHere } from './playOrder.ts';
import { applyEdit, applyPicks, groupEdit, groupLead, linkEdit, makeMainEdit, membersOf, removeEdit, reverse, settle } from './family.ts';

const fams = (pairs) => new Map(Object.entries(pairs));

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
  'move: to first and to after a row, list left alone': () => {
    const order = list('a');
    assert.deepEqual(upNext(moveInOrder(order, 'd', null), 99), ['d', 'b', 'c']);
    assert.deepEqual(upNext(moveInOrder(order, 'b', 'd'), 99), ['c', 'd', 'b']);
    assert.deepEqual(order.list, abcd);
    assert.deepEqual(order.sequence, abcd);
  },
  'move: same place gives the same order back': () => {
    const order = list('a');
    assert.equal(moveInOrder(order, 'b', null), order);
    assert.equal(moveInOrder(order, 'c', 'b'), order);
  },
  'move: the playing song and removed songs stay put': () => {
    const order = nextInOrder(removeFromOrder(list('a')));
    assert.equal(moveInOrder(order, 'b', 'c'), order);
    assert.equal(moveInOrder(order, 'a', 'c'), order);
  },
  'move: a wrapped row across the current song keeps the current song': () => {
    const moved = moveInOrder(list('c'), 'b', null);
    assert.equal(currentId(moved), 'c');
    assert.deepEqual(upNext(moved, 99), ['b', 'd', 'a']);
    assert.equal(currentId(previousInOrder(moved)), 'a');
  },
  'move: a shuffle plays the new order, and shuffle off goes back to list order': () => {
    const moved = moveInOrder(mixed('a'), 'd', null);
    assert.deepEqual(walk(moved), ['d', 'b', 'c']);
    assert.deepEqual(upNext(setShuffle(moved, false, keep), 99), ['b', 'c', 'd']);
  },
  'move: an after-song that has already played lands right after the current one': () => {
    const c = nextInOrder(nextInOrder(mixed('a', ['a', 'b', 'c', 'd', 'e'])));
    assert.deepEqual(walk(moveInOrder(c, 'e', 'a')), ['e', 'd']);
  },
  'move: an unplayed song dragged among played ones doesn\'t let an avoided song in': () => {
    const back = previousInOrder(nextInOrder(mixed('a'))); // at a, b already played
    const moved = moveInOrder(back, 'd', null); // a d b c
    assert.equal(moved.furthest, 2);
    assert.deepEqual(walk(moved, ['c']), ['d', 'b']);
  },
  'move: a played song dragged past the played ones keeps the others played': () => {
    const ids = ['a', 'b', 'c', 'd'];
    const atC = nextInOrder(nextInOrder(mixed('a', ids)));
    const back = previousInOrder(previousInOrder(atC)); // at a, b and c played
    const moved = moveInOrder(back, 'b', 'd'); // a c d b
    assert.equal(moved.furthest, 1);
    assert.deepEqual(walk(moved), ['c', 'd', 'b']);
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
  'a version plays now, and what came after stays': () => {
    const o = playHere(list('b'), 'x');
    assert.equal(currentId(o), 'x');
    assert.deepEqual(upNext(o, 9), ['c', 'd', 'a', 'b']);
    assert.equal(currentId(playHere(list('b'), 'd')), 'd');
  },
  'a family pending change leaves the mine view alone': () => {
    const songs = [{ id: 'a', mine: 'unknown', sorted: false }];
    const pending = [
      { id: '1', kind: 'mine_set', data: { song_id: 'a', value: 'mine' } },
      { id: '2', kind: 'family_set', data: { song_id: 'a', songs: { a: 'b' }, before: { a: null } } },
    ];
    assert.equal(withPending(songs, pending)[0].mine, 'mine');
  },
  'link two plain songs: the target is Main': () => {
    const e = linkEdit(new Map(), 'b', 'a');
    assert.deepEqual(e, { songs: { a: 'a', b: 'a' }, before: { a: null, b: null } });
    assert.deepEqual(membersOf(applyEdit(new Map(), e), 'b'), ['a', 'b']);
  },
  'linking to a version links to its Main, never a chain': () => {
    const e = linkEdit(fams({ a: 'a', b: 'a' }), 'c', 'b');
    assert.deepEqual(e.songs, { a: 'a', c: 'a' });
  },
  'a Main brings its versions along': () => {
    const e = linkEdit(fams({ a: 'a', b: 'a', x: 'x', y: 'x' }), 'x', 'a');
    assert.deepEqual(e.songs, { a: 'a', x: 'a', y: 'a' });
  },
  'a version moving away leaves a lone Main plain': () => {
    const e = linkEdit(fams({ a: 'a', b: 'a', x: 'x', y: 'x' }), 'y', 'a');
    assert.deepEqual(e.songs, { a: 'a', y: 'a', x: null });
  },
  'refusals and nothing-to-do': () => {
    assert.equal(typeof linkEdit(new Map(), 'a', 'a'), 'string');
    assert.equal(linkEdit(fams({ a: 'a', b: 'a' }), 'b', 'a'), null);
    assert.equal(makeMainEdit(fams({ a: 'a', b: 'a' }), 'a', new Set(['a'])), null);
    assert.equal(makeMainEdit(new Map(), 'a'), null);
    assert.equal(removeEdit(new Map(), 'a'), null);
  },
  'Make main moves every version': () => {
    assert.deepEqual(makeMainEdit(fams({ a: 'a', b: 'a', c: 'a' }), 'c').songs, { a: 'c', b: 'c', c: 'c' });
  },
  'Remove: a version, the last but one, and the Main': () => {
    assert.deepEqual(removeEdit(fams({ a: 'a', b: 'a', c: 'a' }), 'b').songs, { b: null });
    assert.deepEqual(removeEdit(fams({ a: 'a', b: 'a' }), 'b').songs, { b: null, a: null });
    assert.deepEqual(removeEdit(fams({ a: 'a', b: 'a', c: 'a' }), 'a').songs, { a: null, b: 'b', c: 'b' });
    assert.deepEqual(removeEdit(fams({ a: 'a', b: 'a', c: 'a' }), 'a', 'c').songs, { a: null, b: 'c', c: 'c' });
    assert.deepEqual(removeEdit(fams({ a: 'a', b: 'a' }), 'a').songs, { a: null, b: null });
  },
  'Undo puts the families back exactly': () => {
    const start = fams({ a: 'a', b: 'a', x: 'x', y: 'x' });
    const e = linkEdit(start, 'x', 'a');
    assert.deepEqual([...applyEdit(applyEdit(start, e), reverse(e))].sort(), [...start].sort());
  },
  'group: three plain songs, the first held is Main': () => {
    const e = groupEdit(new Map(), ['c', 'a', 'b']);
    assert.deepEqual(e.songs, { c: 'c', a: 'c', b: 'c' });
    assert.deepEqual(e.before, { c: null, a: null, b: null });
  },
  'group: a plain song held first joins a ticked family, which keeps its Main': () => {
    const start = fams({ a: 'a', b: 'a' });
    assert.equal(groupLead(start, ['z', 'a']), 'a');
    const e = groupEdit(start, ['z', 'a']);
    assert.deepEqual(membersOf(applyEdit(start, e), 'z'), ['a', 'b', 'z']);
  },
  'group: two families merge under the first held one': () => {
    const start = fams({ a: 'a', b: 'a', x: 'x', y: 'x' });
    const e = groupEdit(start, ['x', 'p', 'a']);
    const after = applyEdit(start, e);
    assert.deepEqual(membersOf(after, 'a').sort(), ['a', 'b', 'p', 'x', 'y']);
    assert.equal(membersOf(after, 'a')[0], 'x');
  },
  'group: one song, or already one family, does nothing': () => {
    assert.equal(groupEdit(new Map(), ['a']), null);
    assert.equal(groupEdit(fams({ a: 'a', b: 'a' }), ['a', 'b']), null);
  },
  'a versions change carries its Mine marks into the mine view': () => {
    const songs = [{ id: 'a', mine: 'unknown', sorted: false }, { id: 'b', mine: 'mine', sorted: true }];
    const pending = [{ id: '1', kind: 'family_set', data: { song_id: 'a', songs: { a: 'b', b: 'b' }, before: { a: null, b: null }, mine: ['a'] } }];
    assert.equal(withPending(songs, pending)[0].mine, 'mine');
  },
  'newest is Main: grouping, joining, merging': () => {
    const dates = { old: '2023-01-05', mid: '2024', new: '2024-06-01', z: null };
    const d = (id) => dates[id];
    const none = new Set();
    let e = settle(new Map(), none, groupEdit(new Map(), ['old', 'new']), d);
    assert.deepEqual(e.songs, { old: 'new', new: 'new' });
    const two = applyEdit(new Map(), e);
    e = settle(two, none, linkEdit(two, 'z', 'new'), d);
    assert.equal(e.songs.z, 'new');
    // a full date beats a bare year of the same year, as Newest sorts them
    e = settle(two, none, groupEdit(two, ['mid', 'old']), d);
    assert.deepEqual(new Set(Object.values(e.songs)), new Set(['new']));
  },
  'my pick stays Main when a newer song joins, and Undo takes the pick back': () => {
    const d = (id) => ({ a: '2023-01-01', b: '2024-01-01', c: '2025-01-01' })[id];
    const start = fams({ a: 'b', b: 'b' });
    const pick = settle(start, new Set(), makeMainEdit(start, 'a'), d, 'a');
    assert.deepEqual(pick.songs, { a: 'a', b: 'a' });
    assert.deepEqual(pick.picked, { a: true });
    const fam = applyEdit(start, pick);
    const picks = applyPicks(new Set(), pick);
    const join = settle(fam, picks, linkEdit(fam, 'c', 'a'), d);
    assert.equal(join.songs.c, 'a');
    assert.equal(join.picked, undefined);
    assert.equal(applyPicks(picks, reverse(pick)).has('a'), false);
  },
  'Keep as Main on the newest is a pick with no move': () => {
    const d = (id) => ({ a: '2023', b: '2024' })[id];
    const start = fams({ a: 'b', b: 'b' });
    const e = settle(start, new Set(), makeMainEdit(start, 'b'), d, 'b');
    assert.deepEqual(e.picked, { b: true });
    assert.deepEqual(e.songs, e.before);
  },
  'a picked Main that leaves takes its pick with it; the rest gets the newest': () => {
    const d = (id) => ({ a: '2023', b: '2024', c: '2025' })[id];
    const start = fams({ a: 'a', b: 'a', c: 'a' });
    const e = settle(start, new Set(['a']), removeEdit(start, 'a'), d);
    assert.deepEqual(e.songs, { a: null, b: 'c', c: 'c' });
    assert.deepEqual(e.picked, { a: false });
  },
  'two picked families merged keep one pick': () => {
    const d = () => '2024';
    const start = fams({ a: 'a', b: 'a', x: 'x', y: 'x' });
    const e = settle(start, new Set(['a', 'x']), groupEdit(start, ['x', 'a']), d);
    assert.deepEqual(new Set(Object.values(e.songs)), new Set(['x']));
    assert.deepEqual(e.picked, { a: false });
  },
  'group: Undo puts both families back': () => {
    const start = fams({ a: 'a', b: 'a', x: 'x', y: 'x' });
    const e = groupEdit(start, ['a', 'x', 'q']);
    assert.deepEqual([...applyEdit(applyEdit(start, e), reverse(e))].sort(), [...start].sort());
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
