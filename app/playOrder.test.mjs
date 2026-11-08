// Self-test for the play order: node --experimental-strip-types app/playOrder.test.mjs
import assert from 'node:assert/strict';
import { currentId, jumpTo, moveInOrder, nextInOrder, previousInOrder, removeFromOrder, setShuffle, startOrder, upNext, walkAhead, walkBack, withPending, withoutRestored, playHere, dialTarget, tagsWithPending, setFlag, listAfterTap, listIsOpen, shuffleAfterTap, shuffleWords, tickWordsAfter, noTickWords, songStartWords, tagTapped, TICK_SHOW_MS, TAP_BOUNCE_MS, seekRelease, tagEdit, tagRemoval, tagUndoLine, rowOrder, sessionPool, sessionLap, sessionCount, draftGoesOnChange, draftLine, libraryShuffleTap, startSpot, moveBy, SESSION_START_SEC, SORT_START_SEC, sessionLine, sessionBack } from './playOrder.ts';
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
// Like the phone's File: delete throws if it isn't there, create throws if it already is (expo-file-system, iOS).
const fakeFile = (exists) => ({
  exists,
  create() { if (this.exists) throw new Error('file already exists'); this.exists = true; },
  delete() { if (!this.exists) throw new Error('path does not exist'); this.exists = false; },
});
const tests = {
  'tick words: playback passing a tick shows it; 4 s or the next tick clears it; a drag shows nothing': () => {
    const tags = [{ id: 'zero', at_sec: 0 }, { id: 'a', at_sec: 10 }, { id: 'b', at_sec: 12 }, { id: 'c', at_sec: 40 }];
    // play: one sample every 0.25 s, the clock in ms alongside
    let s = songStartWords;
    let ms = 0;
    const play = (from, to, settled = true) => {
      for (let t = from; t <= to + 1e-9; t += 0.25) {
        s = tickWordsAfter(s, tags, Math.round(t * 100) / 100, ms, settled);
        ms += 250;
      }
    };
    play(0, 0);
    assert.equal(s.tagId, 'zero'); // a tag at 0:00 shows as the song starts
    play(0.25, 9.75);
    assert.equal(s.tagId, null); // gone after 4 s
    play(10, 10);
    assert.equal(s.tagId, 'a'); // passed, no tap
    play(10.25, 11.75);
    assert.equal(s.tagId, 'a'); // still there under 4 s
    play(12, 12);
    assert.equal(s.tagId, 'b'); // the next tick replaces it at once
    const shownAt = ms;
    play(12.25, 15.75);
    assert.equal(s.tagId, 'b');
    play(16, 16.25);
    assert.ok(ms - shownAt > TICK_SHOW_MS);
    assert.equal(s.tagId, null); // cleared after 4 s
    // dragging the knob across 'c' (40 s): nothing while dragged, nothing on landing past it
    s = tickWordsAfter(s, tags, 30, ms, false);
    s = tickWordsAfter(s, tags, 41, ms + 100, false);
    s = tickWordsAfter(s, tags, 41, ms + 200, true); // played on from the drop
    s = tickWordsAfter(s, tags, 41.25, ms + 450, true);
    assert.equal(s.tagId, null);
    // a seek (a long step while playing) is not play passing a tick either
    s = tickWordsAfter(s, tags, 5, ms + 700, true);
    s = tickWordsAfter(s, tags, 11, ms + 950, true);
    assert.equal(s.tagId, null);
    // dragged back before 'c', then play passes it: it shows
    s = tickWordsAfter({ ...noTickWords }, tags, 39.5, ms + 1200, true);
    s = tickWordsAfter(s, tags, 39.75, ms + 1450, true);
    s = tickWordsAfter(s, tags, 40, ms + 1700, true);
    assert.equal(s.tagId, 'c');
  },
  'shuffle: four taps go Mine, Unsorted, Off, Mine, read from order.shuffle, and Next follows the pool': () => {
    const mine = new Set(['b', 'c']);
    const outside = (pool) => abcd.filter((id) => (pool === 'mine') !== mine.has(id)); // what the player's avoid set holds
    let order = list('a');
    let pool = 'unsorted';
    const seen = [];
    for (let i = 0; i < 4; i++) {
      const pick = shuffleAfterTap({ on: order.shuffle, pool });
      order = setShuffle(order, pick.on, keep);
      pool = pick.pool;
      seen.push(shuffleWords({ on: order.shuffle, pool }));
      if (order.shuffle) for (const id of walk(order, outside(pool))) assert.equal(mine.has(id), pool === 'mine', `${id} in ${pool}`);
    }
    assert.deepEqual(seen, ['Mine', 'Unsorted', 'off', 'Mine']);
    assert.deepEqual(walk(order, outside('mine')), ['b', 'c']);
    order = setShuffle(order, shuffleAfterTap({ on: true, pool: 'mine' }).on, keep);
    assert.deepEqual(walk(setShuffle(order, true, keep), outside('unsorted')), ['d']);
  },
  'tag icon: tap, type, tap again closes the field with nothing saved (as Cancel)': () => {
    let made = 0;
    const fresh = () => ({ text: '', n: ++made });
    let s = tagTapped({ draft: null, lastTap: -10000 }, 0, fresh);
    assert.ok(s.draft);
    s = { ...s, draft: { ...s.draft, text: 'a line' } }; // typed
    const cancelled = { ...s, draft: null }; // what Cancel leaves
    s = tagTapped(s, 3000, fresh);
    assert.equal(s.draft, cancelled.draft); // closed, so no tag and no words-free mark is made (only finish saves)
    assert.equal(made, 1); // and no new field opened
  },
  'tag icon: two taps 300 ms apart open then cancel, a third reopens; only a bounce under 250 ms is dropped, and it never extends': () => {
    const fresh = () => ({ text: '' });
    let s = tagTapped({ draft: null, lastTap: -10000 }, 0, fresh);
    assert.ok(s.draft); // opens
    s = tagTapped(s, 300, fresh);
    assert.equal(s.draft, null); // cancels, as fast as Cancel
    s = tagTapped(s, 600, fresh);
    assert.ok(s.draft); // opens again
    // a finger bounce: dropped, and ignored taps don't push the window on
    const open = s;
    s = tagTapped(s, 650, fresh);
    s = tagTapped(s, 700, fresh);
    assert.equal(s, open);
    s = tagTapped(s, 751, fresh); // 151 ms after the last tap that counted
    assert.equal(s.draft, null);
    s = tagTapped(s, 931, fresh); // a quick double tap: 180 ms apart, both count
    assert.ok(s.draft);
    assert.ok(TAP_BOUNCE_MS <= 150);
  },
  'seek bar: a drag released 1 s past a tick lands where released; a quick still tap on a tick jumps to it': () => {
    const ticks = [{ id: 'a', at_sec: 60 }];
    const bar = { width: 300, max: 200, ticks }; // 1.5 px per second: the tick is at 90 px
    const px = (sec) => (sec / 200) * 300;
    // grabbed at the knob (30 s), dragged to 61 s, held about a second: no snap
    let r = seekRelease({ ...bar, grabX: px(30), dx: px(61) - px(30), heldMs: 1000 });
    assert.equal(r.tick, undefined);
    assert.ok(Math.abs(r.seek - 61) < 1e-9);
    // a tiny slow drag right beside the tick: still a seek, to where the finger is
    r = seekRelease({ ...bar, grabX: px(59), dx: 2, heldMs: 700 }); // held: a fine drag, not a tap
    assert.equal(r.tick, undefined);
    assert.ok(Math.abs(r.seek - (59 + 2 / 1.5)) < 1e-9);
    // a quick still tap within reach of the tick: the tick
    r = seekRelease({ ...bar, grabX: px(60) + 10, dx: 1, heldMs: 120 });
    assert.equal(r.tick?.id, 'a');
    r = seekRelease({ ...bar, grabX: px(60) + 10, dx: 0, heldMs: 450 }); // a careful press on the tick still counts
    assert.equal(r.tick?.id, 'a');
    // a quick tap far from any tick: a seek
    r = seekRelease({ ...bar, grabX: px(150), dx: 0, heldMs: 120 });
    assert.ok(Math.abs(r.seek - 150) < 1e-9);
    // past the ends: clamped
    r = seekRelease({ ...bar, grabX: 280, dx: 100, heldMs: 500 });
    assert.equal(r.seek, 200);
  },
  'tags list: a song with 0 tags counts 0 and still opens; a second tap closes; a song change closes it': () => {
    const tags = tagsWithPending([{ id: 't1', song_id: 'other', text: 'x', at_sec: 3, made_at: '' }], [], 'empty');
    assert.equal(tags.length, 0); // the button reads Tags · 0, from the same list the ticks use
    let open = listAfterTap(null, 'empty');
    assert.equal(listIsOpen(open, 'empty'), true); // opens (to "No tags yet")
    assert.equal(listIsOpen(open, 'next song'), false); // Next: closed, with nothing to reset
    open = listAfterTap(open, 'empty');
    assert.equal(listIsOpen(open, 'empty'), false);
    assert.equal(listIsOpen('empty', undefined), false);
  },
  'eye: unhiding a song the sorted rule hid (no file) does not throw, and 5 taps each way leave it right': () => {
    const file = fakeFile(false); // a Mine song opens hidden by the rule; nothing wrote the file
    setFlag(file, false); // the eye tapped: show the buttons
    assert.equal(file.exists, false);
    const shown = fakeFile(true); // an unsorted song shows them, but an older hide left the file
    setFlag(shown, true);
    assert.equal(shown.exists, true);
    let on = true;
    for (let i = 0; i < 10; i++) setFlag(file, (on = !on));
    assert.equal(file.exists, on);
  },
  'dial: a swipe over a row that cannot play lands on the next one that can, both ways': () => {
    const on = [true, true, false, true, true]; // the middle version is not on the phone
    assert.equal(dialTarget(1, 2, on), 3);
    assert.equal(dialTarget(3, 2, on), 1);
    assert.equal(dialTarget(0, 1, on), 1);
    assert.equal(dialTarget(4, 3, on), 3);
  },
  'dial: a late echo of the same swipe never moves it again': () => {
    const on = [true, false, true, true];
    const first = dialTarget(0, 1, on);
    assert.equal(first, 2);
    assert.equal(dialTarget(first, 2, on), 2);
  },
  'dial: nothing playable that way rests on the marked row, never a dead stop': () => {
    assert.equal(dialTarget(1, 2, [true, true, false]), 2);
    assert.equal(dialTarget(1, 0, [false, true, true]), 0);
  },
  'dial: from a marked row, a swipe finds the nearest that can play': () => {
    assert.equal(dialTarget(2, 3, [true, true, false, false, true]), 4);
    assert.equal(dialTarget(2, 1, [true, true, false, false, true]), 1);
  },
  'wheel: a flick rests where it lands, several rows on, never one step back (6.6)': () => {
    const on = [true, true, true, true, true];
    assert.equal(dialTarget(0, 3, on), 3);
    assert.equal(dialTarget(4, 1, on), 1);
    assert.equal(dialTarget(0, 2, [true, true, false, true]), 3);
    assert.equal(dialTarget(3, 1, [true, false, true, true]), 0);
  },
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
  'tags: the laptop copy shows On laptop, waiting ones Saved on phone, in time order': () => {
    const copy = [{ id: 't1', song_id: 's', text: 'late', at_sec: 90, made_at: '1' }, { id: 't2', song_id: 'x', text: 'other', at_sec: 1, made_at: '1' }];
    const pending = [{ id: 'c1', kind: 'tag_add', data: { tag_id: 't3', song_id: 's', text: 'early', at_sec: 10, made_at: '2' } }];
    const shown = tagsWithPending(copy, pending, 's');
    assert.deepEqual(shown.map((t) => [t.id, t.onPhone]), [['t3', true], ['t1', false]]);
  },
  'tags: an edit waiting replaces the words, keeps made_at; a delete waiting hides it; mine changes are ignored': () => {
    const copy = [{ id: 't1', song_id: 's', text: 'old', at_sec: 5, made_at: 'first' }, { id: 't2', song_id: 's', text: 'gone', at_sec: 6, made_at: '1' }];
    const pending = [
      { id: 'm', kind: 'mine_set', data: { song_id: 's', value: 'mine' } },
      { id: 'c1', kind: 'tag_add', data: { tag_id: 't1', song_id: 's', text: 'new', at_sec: 7, made_at: 'later' } },
      { id: 'c2', kind: 'tag_remove', data: { tag_id: 't2', song_id: 's' } },
    ];
    const shown = tagsWithPending(copy, pending, 's');
    assert.deepEqual(shown.map((t) => [t.id, t.text, t.at_sec, t.made_at, t.onPhone]), [['t1', 'new', 7, 'first', true]]);
  },
  'tags: the same second keeps the order they were made in': () => {
    const copy = [{ id: 'b', song_id: 's', text: '2', at_sec: 3, made_at: '2' }, { id: 'a', song_id: 's', text: '1', at_sec: 3, made_at: '1' }];
    assert.deepEqual(tagsWithPending(copy, []).map((t) => t.id), ['a', 'b']);
  },
  'session pool: Mine songs that can play now, one per family; a lap holds each once, untagged first more often': () => {
    const songs = [
      { id: 'a', mine: 'mine' }, { id: 'b', mine: 'mine' }, { id: 'c', mine: 'unknown' }, { id: 'd', mine: 'mine' },
      { id: 'e', mine: 'not mine' }, { id: 'f', mine: 'mine' }, { id: 'v', mine: 'mine' },
    ];
    const pool = sessionPool(songs, (song) => song.id !== 'd', (id) => id === 'v');
    assert.deepEqual(pool, ['a', 'b', 'f']); // d can't play now, v is a version (its Main stands for it)
    // a lap: every song once; the list wraps only when the pool has run out
    const ids = Array.from({ length: 12 }, (_, i) => `s${i}`);
    const tagged = new Set(ids.slice(0, 6));
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const lap = sessionLap(ids, tagged, random);
    assert.deepEqual([...lap].sort(), [...ids].sort());
    let order = startOrder(lap, lap[0], false);
    const seen = [currentId(order)];
    for (let i = 1; i < lap.length; i++) seen.push(currentId((order = nextInOrder(order))));
    assert.equal(new Set(seen).size, lap.length); // no song twice
    assert.equal(currentId(nextInOrder(order)), lap[0]); // then it starts over
    // untagged 3x as likely: over many laps they come up earlier
    let untaggedAt = 0;
    let taggedAt = 0;
    for (let n = 0; n < 2000; n++) {
      sessionLap(ids, tagged, random).forEach((id, i) => (tagged.has(id) ? (taggedAt += i) : (untaggedAt += i)));
    }
    assert.ok(untaggedAt < taggedAt * 0.75, `untagged ${untaggedAt} vs tagged ${taggedAt}`);
    // the first pick: untagged about 3 in 4 with half the pool untagged
    let firstUntagged = 0;
    for (let n = 0; n < 4000; n++) if (!tagged.has(sessionLap(ids, tagged, random)[0])) firstUntagged++;
    assert.ok(Math.abs(firstUntagged / 4000 - 0.75) < 0.04, String(firstUntagged / 4000));
  },
  'session: Not mine takes the song out (Next never lands on it), the counter drops it; Undo puts both back': () => {
    const pool = ['a', 'b', 'c', 'd'];
    const tagged = new Set(['b', 'x']); // x: tagged, but not in this session
    assert.deepEqual(sessionCount(pool, [], tagged), { tagged: 1, of: 4 });
    tagged.add('a'); // a's first tag
    assert.deepEqual(sessionCount(pool, [], tagged), { tagged: 2, of: 4 });
    tagged.add('a'); // a second tag on a: no change
    assert.deepEqual(sessionCount(pool, [], tagged), { tagged: 2, of: 4 });
    // Not mine on b (tagged): out of M and N; it plays on (still current) but Next and Previous skip it
    let order = startOrder(pool, 'b', false);
    order = removeFromOrder(order);
    assert.equal(currentId(order), 'b');
    assert.deepEqual(sessionCount(pool, ['b'], tagged), { tagged: 1, of: 3 });
    const walked = [];
    for (let o = nextInOrder(order), i = 0; i < 6; o = nextInOrder(o), i++) walked.push(currentId(o));
    assert.ok(!walked.includes('b'));
    // Undo: back in the order and the count
    order = { ...order, removed: order.removed.filter((id) => id !== 'b') };
    assert.deepEqual(sessionCount(pool, [], tagged), { tagged: 2, of: 4 });
    assert.equal(currentId(previousInOrder(nextInOrder(order))), 'b');
  },
  'Next with a tag being typed: the draft is saved to the song it was tapped on, not the next one': () => {
    const draft = { tagId: 'd1', songId: 's1', songTitle: 'One', at: 12.34567, text: '  line  ', madeAt: 'm' };
    assert.equal(draftGoesOnChange(draft, 's1', 's2'), true); // Next: s1 -> s2
    assert.equal(draftGoesOnChange(draft, 's1', 's1'), false); // same song
    assert.equal(draftGoesOnChange(null, 's1', 's2'), false);
    assert.equal(draftGoesOnChange({ ...draft, songId: 's0' }, 's1', 's2'), false); // saved already when s0 ended
    assert.deepEqual(draftLine(draft), { tag_id: 'd1', song_id: 's1', text: 'line', at_sec: 12.346, made_at: 'm' });
  },
  'library shuffle: taps cycle Off > Mine > Unsorted > Off like the player, skipping a pool with nothing to play': () => {
    let pick = { on: false, pool: 'unsorted' };
    const seen = [];
    for (let i = 0; i < 4; i++) seen.push(shuffleWords((pick = libraryShuffleTap(pick, true, true))));
    assert.deepEqual(seen, ['Mine', 'Unsorted', 'off', 'Mine']);
    assert.deepEqual(libraryShuffleTap({ on: false, pool: 'mine' }, false, true), { on: true, pool: 'unsorted' }); // no Mine to play
    assert.equal(libraryShuffleTap({ on: true, pool: 'mine' }, true, false).on, false); // no Unsorted: off
    assert.equal(libraryShuffleTap({ on: false, pool: 'mine' }, false, false).on, false); // nothing to play: stays off
  },
  'restore (2.7): a wiped phone gets every tag back from GET /tags plus the backed-up outbox: same words, same second, deleted stay gone': () => {
    const t = (id, text, at_sec) => ({ id, song_id: 's', version_id: 'v1', text, at_sec, made_at: `m-${id}` });
    const phone = fakePhone([t('keep', 'stays as is', 10.125), t('edit', 'first words', 20.5), t('del', 'to delete', 30.75), t('gone', 'deleted long ago', 40)]);
    phone.add(tagRemoval(phone.view().find((x) => x.id === 'gone')));
    phone.send(); // 'gone' is deleted on the laptop
    // offline now: one new tag, two edits of one tag, a delete of a synced tag, a move; none sent
    phone.add({ kind: 'tag_add', data: draftLine({ tagId: 'new', songId: 's', at: 55.5555, text: 'unsent line 🔥', madeAt: 'm-new' }) });
    phone.add(tagEdit(phone.view().find((x) => x.id === 'edit'), { text: 'second words' }));
    phone.add(tagEdit(phone.view().find((x) => x.id === 'edit'), { text: 'third words' }));
    phone.add(tagRemoval(phone.view().find((x) => x.id === 'del')));
    const backup = phone.pending.map((c) => ({ ...c, data: { ...c.data } })); // the phone backup file carries the outbox
    // the first unsent change reaches the laptop just before the wipe, and the backup will resend it
    phone.send(1);
    const before = phone.view().map(({ onPhone, ...tag }) => tag);
    // wipe: nothing on the phone; restore: the laptop's tags, then the backed-up outbox laid on top
    phone.copy = [...phone.laptop.values()].map((x) => ({ ...x }));
    phone.pending = backup;
    const restored = phone.view().map(({ onPhone, ...tag }) => tag);
    assert.deepEqual(restored, before);
    assert.deepEqual(restored.map((x) => [x.id, x.text, x.at_sec]), [
      ['keep', 'stays as is', 10.125], ['edit', 'third words', 20.5], ['new', 'unsent line 🔥', 55.556],
    ]);
    // back online: everything sends (the resend is skipped), and the laptop holds the same
    phone.send();
    assert.deepEqual(phone.view().map(({ onPhone, ...tag }) => tag), before);
    assert.equal(phone.laptop.has('del'), false);
    assert.equal(phone.laptop.has('gone'), false);
    assert.equal(phone.laptop.get('edit').made_at, 'm-edit');
  },
  'change tags: Change words, Move to now, Delete go through the outbox as whole-tag lines; Undo restores exactly, sent or not': () => {
    const original = { id: 't', song_id: 's', version_id: 'v1', text: 'old words', at_sec: 42.5, made_at: '2026-11-08T10:00:00Z' };
    const phone = fakePhone([original]);
    const before = phone.view()[0];
    assert.deepEqual(before, { ...original, onPhone: false });

    // Change words: same id, made_at, second and version; new words; waiting until sent
    const edit = phone.add(tagEdit(before, { text: 'new words' }));
    assert.deepEqual(edit.kind, 'tag_add');
    assert.deepEqual(edit.data, { tag_id: 't', song_id: 's', version_id: 'v1', text: 'new words', at_sec: 42.5, made_at: original.made_at });
    assert.equal(phone.view()[0].text, 'new words');
    assert.equal(phone.view()[0].onPhone, true);
    phone.undo(edit, before); // not sent yet: taken back
    assert.deepEqual(phone.view(), [before]);
    assert.equal(phone.pending.length, 0);

    // Move to now: only the second changes, kept to 3 decimals
    const moved = phone.add(tagEdit(before, { at: 99.12345 }));
    assert.equal(moved.data.at_sec, 99.123);
    assert.equal(moved.data.text, 'old words');
    phone.send();
    assert.equal(phone.view()[0].at_sec, 99.123);
    phone.undo(moved, before); // already sent: the old whole tag goes back
    phone.send();
    assert.deepEqual(phone.laptop.get('t'), original);
    assert.deepEqual(phone.view(), [before]);

    // Delete: gone at once, stays gone after sync and a fresh copy from the laptop
    const gone = phone.add(tagRemoval(before));
    assert.deepEqual(gone, { id: gone.id, kind: 'tag_remove', data: { tag_id: 't', song_id: 's' } });
    assert.equal(phone.view().length, 0);
    phone.send();
    assert.equal(phone.view().length, 0);
    assert.equal(phone.laptop.has('t'), false);
    phone.undo(gone, before); // Undo after it synced: same id, made_at and version
    phone.send();
    assert.deepEqual(phone.laptop.get('t'), original);
    assert.deepEqual(phone.view(), [before]);
  },
  'change tags: two edits waiting, Undo of the second leaves the first': () => {
    const t = { id: 't', song_id: 's', version_id: 'v1', text: 'one', at_sec: 3, made_at: 'm' };
    const phone = fakePhone([t]);
    const first = phone.add(tagEdit(phone.view()[0], { text: 'two' }));
    const mid = phone.view()[0];
    const second = phone.add(tagEdit(mid, { text: 'three' }));
    assert.equal(phone.view()[0].text, 'three');
    phone.undo(second, mid);
    assert.equal(phone.view()[0].text, 'two');
    assert.equal(phone.pending[0], first);
  },
  'tags: a tag the laptop moved to the surviving song stays there while an edit of it waits': () => {
    const copy = [{ id: 't', song_id: 'keep', text: 'x', at_sec: 3, made_at: 'm' }];
    const pending = [{ id: 'c', kind: 'tag_add', data: { tag_id: 't', song_id: 'gone', text: 'y', at_sec: 3, made_at: 'm' } }];
    assert.equal(tagsWithPending(copy, pending)[0].song_id, 'keep');
    assert.equal(tagsWithPending(copy, pending, 'gone').length, 0);
  },
  'tags list rows: keep their places while open (Move to now, new tags at the bottom); time order on reopen': () => {
    const t = (id, at_sec) => ({ id, at_sec });
    let rows = rowOrder(null, [t('b', 20), t('a', 10), t('c', 30)]);
    assert.deepEqual(rows, ['a', 'b', 'c']);
    rows = rowOrder(rows, [t('b', 20), t('c', 30), t('a', 50)]); // a moved to now
    assert.deepEqual(rows, ['a', 'b', 'c']);
    rows = rowOrder(rows, [t('d', 1), t('b', 20), t('c', 30), t('a', 50)]); // a new tag
    assert.deepEqual(rows, ['a', 'b', 'c', 'd']);
    rows = rowOrder(rows, [t('d', 1), t('c', 30), t('a', 50)]); // b deleted: its place is kept while the list is open
    assert.deepEqual(rows, ['a', 'b', 'c', 'd']);
    rows = rowOrder(rows, [t('d', 1), t('b', 20), t('c', 30), t('a', 50)]); // Undo: b is back where it was
    assert.deepEqual(rows, ['a', 'b', 'c', 'd']);
    assert.deepEqual(rowOrder(null, [t('d', 1), t('c', 30), t('a', 50)]), ['d', 'c', 'a']); // reopened
  },
};

/** The phone's tag copy and outbox, and a laptop that applies lines as tags.py does (made_at and version kept on edits). */
function fakePhone(start) {
  let n = 0;
  const phone = {
    laptop: new Map(start.map((t) => [t.id, { ...t }])),
    copy: start.map((t) => ({ ...t })),
    pending: [],
    view: () => tagsWithPending(phone.copy, phone.pending, 's'),
    add(change) {
      const made = { id: `c${++n}`, ...change };
      phone.pending.push(made);
      return made;
    },
    takeBack(change) {
      const at = phone.pending.indexOf(change);
      if (at < 0) return false;
      phone.pending.splice(at, 1);
      return true;
    },
    undo(change, before) {
      if (!phone.takeBack(change)) phone.add(tagUndoLine(change, before));
    },
    seen: new Set(),
    send(upTo = phone.pending.length) {
      for (const c of phone.pending.slice(0, upTo)) {
        if (phone.seen.has(c.id)) continue; // a resend: the laptop skips an id it has seen
        phone.seen.add(c.id);
        const { tag_id, ...rest } = c.data;
        const was = phone.laptop.get(tag_id);
        if (c.kind === 'tag_remove') phone.laptop.delete(tag_id);
        else phone.laptop.set(tag_id, { id: tag_id, ...rest, version_id: rest.version_id ?? was?.version_id ?? 'current', made_at: was?.made_at ?? rest.made_at });
      }
      phone.pending = phone.pending.slice(upTo);
      phone.copy = [...phone.laptop.values()].map((t) => ({ ...t }));
    },
  };
  return phone;
}

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

// Start points (2026-11-08 review): session 0:15, Sort 0:30, fixed, handed to the player at load
{
  assert.equal(SESSION_START_SEC, 15);
  assert.equal(SORT_START_SEC, 30);
  assert.equal(startSpot(undefined, SESSION_START_SEC), 15, 'a fresh session card starts at 0:15');
  assert.equal(startSpot(undefined, SORT_START_SEC), 30, 'a fresh Sort card starts at 0:30');
  assert.equal(startSpot(undefined, 0), 0, 'Library songs start at 0:00');
  assert.equal(startSpot(72.5, SORT_START_SEC), 72.5, 'an undone card carries on where it was');
  assert.equal(startSpot(0, SORT_START_SEC), 0, 'an explicit 0:00 stays 0:00');
  // with a start point too, Next and Previous take the queued (already loaded) song; it finds its spot silently
  assert.equal(moveBy(SESSION_START_SEC, true), 'queue');
  assert.equal(moveBy(SORT_START_SEC, true), 'queue');
  assert.equal(moveBy(SESSION_START_SEC, false), 'load', 'a song the queue does not hold is a fresh load');
  assert.equal(moveBy(0, true), 'queue', 'Library keeps the gapless move');
  assert.equal(moveBy(0, false), 'load');
}

// The session after an app kill: same lap, same counter, same place
{
  const songs = ['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => ({ id, mine: 'mine' }));
  const pool = sessionPool(songs, () => true, () => false);
  const tagged = new Set(['m2']);
  const lap = sessionLap(pool, tagged, () => 0.5);
  // two cards in: Next twice, Not mine on the third
  let order = startOrder(lap, lap[0], false);
  order = nextInOrder(nextInOrder(order));
  const out = [currentId(order)];
  const countBefore = sessionCount(pool, out, tagged);
  // what the phone keeps: session.json, and the player's last-play.json (order + second)
  const sessionText = JSON.stringify(sessionLine(pool, out, lap));
  const playerText = JSON.stringify({ order, at: 42.5 });
  // ...the app is killed and reopened
  const last = JSON.parse(playerText);
  const back = sessionBack(sessionText, last.order);
  assert.ok(back, 'the session comes back');
  assert.deepEqual(back.pool, pool);
  assert.deepEqual(back.out, out);
  assert.deepEqual(sessionCount(back.pool, back.out, tagged), countBefore, 'same "N of M tagged"');
  assert.deepEqual(last.order.list, lap, 'same lap');
  assert.equal(currentId(last.order), currentId(order), 'same song');
  assert.equal(last.at, 42.5, 'same second');
  assert.deepEqual(walkAhead(last.order, 8).map(currentId), walkAhead(order, 8).map(currentId), 'the same songs to come, same order');
  // a Library song played after the session: the player came back on another list, so no session look
  assert.equal(sessionBack(sessionText, startOrder(['x', 'y'], 'x', false)), null);
  // same songs, other order (a new lap): not this session
  assert.equal(sessionBack(sessionText, { list: [...lap].reverse() }), null);
  // nothing saved, a broken file, an old shape, no player song
  assert.equal(sessionBack(null, order), null);
  assert.equal(sessionBack('{not json', order), null);
  assert.equal(sessionBack(JSON.stringify({ pool, out, lap }), order), null);
  assert.equal(sessionBack(sessionText, null), null);
  // an out song no longer in the pool is dropped, never counted
  assert.deepEqual(sessionBack(JSON.stringify(sessionLine(pool, ['gone', ...out], lap)), order).out, out);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exitCode = failed ? 1 : 0;
