// Play data (NEXT 2026-11-10 A): node --experimental-strip-types app/playData.test.mjs
// What counts as a play (30 s really heard), that a count can't double or drift, that it survives a wipe and a restore,
// and what Home's two rows show. The code under test is the code the phone runs (playLog.ts).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { A_WHILE_DAYS, dayOf, listWithTaken, notPlayedInAWhile, playsFrom, playsWithPending, playTracker, PLAY_COUNTS_AFTER, recentlyPlayed, rediscoverStart, ROW_SONGS } from './playLog.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

// ---------- a pretend player: a clock, a song position, reports every `step` seconds -------------------------------
function rig() {
  let now = Date.parse('2026-11-10T20:00:00Z');
  let ids = 0;
  const lines = [];
  const t = playTracker({ now: () => now, newId: () => `play-${++ids}`, emit: (line) => lines.push(line) });
  let pos = 0;
  return {
    t, lines,
    start(id, at = 0) {
      t.start(id);
      pos = at;
      t.report(false, pos, 200);
    },
    /** Plays for `seconds`, a report every `step`. */
    play(seconds, step = 0.5, length = 200) {
      t.report(true, pos, length);
      for (let left = seconds; left > 1e-9; left -= step) {
        const d = Math.min(step, left);
        now += d * 1000;
        pos += d;
        t.report(true, pos, length);
      }
    },
    pause(seconds) {
      t.report(false, pos, 200);
      now += seconds * 1000;
      t.report(false, pos, 200);
    },
    seek(to) {
      pos = to;
      now += 100;
      t.report(true, pos, 200);
    },
    wait: (seconds) => (now += seconds * 1000),
  };
}

ok('29 s heard is not a play; 30 s is, once', () => {
  const r = rig();
  r.start('a');
  r.play(29);
  assert.equal(r.lines.length, 0);
  r.play(1);
  assert.equal(r.lines.length, 1);
  assert.deepEqual({ ...r.lines[0], seconds: Math.round(r.lines[0].seconds) }, { play_id: 'play-1', song_id: 'a', started_at: '2026-11-10T20:00:00.000Z', seconds: 30, source: 'phone' });
  r.play(120);
  assert.equal(r.lines.length, 1, 'a long listen is still one play');
});

ok('a skip at 0:10 is not a play, and leaves no line behind', () => {
  const r = rig();
  r.start('a');
  r.play(10);
  r.start('b');
  r.play(5);
  r.t.stop();
  assert.equal(r.lines.length, 0);
});

ok('paused time counts for nothing', () => {
  const r = rig();
  r.start('a');
  r.play(20);
  r.pause(600);
  assert.equal(r.lines.length, 0);
  r.play(9);
  assert.equal(r.lines.length, 0);
  r.play(1);
  assert.equal(r.lines.length, 1);
});

ok('seeking is not listening: three scrubs to 0:30 and beyond count nothing', () => {
  const r = rig();
  r.start('a');
  r.play(5);
  for (const to of [30, 90, 150, 31]) r.seek(to);
  assert.equal(r.lines.length, 0);
  r.play(24);
  assert.equal(r.lines.length, 0, '5 + 24 s heard');
  r.play(1);
  assert.equal(r.lines.length, 1);
});

ok('dragging back to 0:00 over and over is one play, never three', () => {
  const r = rig();
  r.start('a');
  for (let i = 0; i < 3; i++) {
    r.play(35);
    r.seek(0);
  }
  assert.equal(r.lines.filter((line) => !line.end).length, 1);
});

ok('a tagging-session song started at 0:15 counts after 30 s heard, not at 0:30 on the clock', () => {
  const r = rig();
  r.start('a', 15);
  r.play(16); // the bar says 0:31
  assert.equal(r.lines.length, 0);
  r.play(14);
  assert.equal(r.lines.length, 1);
});

ok('locked: a report only every 2 s still adds up to a play', () => {
  const r = rig();
  r.start('a');
  r.play(30, 2);
  assert.equal(r.lines.length, 1);
});

ok('the phone asleep with the sound stopped adds nothing when it wakes', () => {
  const r = rig();
  r.start('a');
  r.play(10);
  r.t.report(false, 10, 200);
  r.wait(3600);
  r.t.report(true, 10, 200);
  r.play(19);
  assert.equal(r.lines.length, 0);
});

ok('a Sort card never counts', () => {
  const r = rig();
  r.start(null);
  r.play(120);
  assert.equal(r.lines.length, 0);
  assert.equal(r.t.now(), null);
});

ok('a 20 s idea counts once most of it was heard', () => {
  const r = rig();
  r.start('a');
  r.play(14, 0.5, 20);
  assert.equal(r.lines.length, 0);
  r.play(1, 0.5, 20);
  assert.equal(r.lines.length, 1);
});

ok('leaving the song later sends its full length under the same play id; leaving at once sends nothing more', () => {
  const r = rig();
  r.start('a');
  r.play(31);
  r.start('b'); // left 1 s after it counted
  assert.equal(r.lines.length, 1);
  r.play(200);
  r.start('c');
  assert.equal(r.lines.length, 3);
  assert.equal(r.lines[2].play_id, r.lines[1].play_id);
  assert.equal(r.lines[2].end, true);
  assert.equal(Math.round(r.lines[2].seconds), 200);
});

ok('the same song played again later is a second play with its own id', () => {
  const r = rig();
  r.start('a');
  r.play(40);
  r.start('a');
  r.play(40);
  const first = r.lines.filter((line) => !line.end);
  assert.equal(first.length, 2);
  assert.notEqual(first[0].play_id, first[1].play_id);
});

ok('a force quit after 0:30 loses nothing: the line was handed over the moment it counted', () => {
  const r = rig();
  r.start('a');
  r.play(PLAY_COUNTS_AFTER);
  assert.equal(r.lines.length, 1); // emit is the outbox's save, which writes its file before returning
  assert.match(source('./outbox.ts'), /export function addPlayChange[\s\S]*?save\(pending\);[\s\S]*?if \(!paused\) flush\(\);/);
});

// ---------- counts: the laptop's log is the truth, the phone lays its unsent plays on top ---------------------------
const change = (song, at, more = {}) => ({ id: `c-${song}-${at}-${more.end ? 'end' : ''}`, kind: 'play_add', data: { play_id: `p-${song}-${at}`, song_id: song, started_at: at, seconds: 30, source: 'phone', ...more } });
/** The laptop, as server/vault_server does it: a change id counts once, a play id is one row. */
function laptop() {
  const seen = new Set();
  const rows = new Map();
  return {
    take(changes) {
      for (const c of changes) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        const was = rows.get(c.data.play_id);
        rows.set(c.data.play_id, { song: c.data.song_id, at: c.data.started_at, seconds: Math.max(was?.seconds ?? 0, c.data.seconds) });
      }
    },
    songs(ids) {
      return ids.map((id) => {
        const mine = [...rows.values()].filter((row) => row.song === id);
        return { id, plays: mine.length, last_heard: mine.length ? mine.map((row) => row.at).sort().at(-1) : null };
      });
    },
  };
}
const NOW = Date.parse('2026-11-10T21:00:00Z');
const flat = (map) => [...map].map(([id, p]) => `${id}:${p.n}@${p.last ? new Date(p.last).toISOString() : '-'}`).sort().join(' ');

ok('a waiting play shows at once; its second line (the length) adds nothing', () => {
  const base = playsFrom([{ id: 'a', plays: 2, last_heard: '2026-11-01T10:00:00.000000Z' }, { id: 'b', plays: 0, last_heard: null }]);
  const pending = [change('a', '2026-11-10T20:00:00.000Z'), change('a', '2026-11-10T20:00:00.000Z', { end: true, seconds: 180 }), change('b', '2026-11-10T20:05:00.000Z')];
  assert.equal(flat(playsWithPending(base, pending, NOW)), 'a:3@2026-11-10T20:00:00.000Z b:1@2026-11-10T20:05:00.000Z');
  assert.equal(flat(base), 'a:2@2026-11-01T10:00:00.000Z', 'the laptop\'s side is never changed in place');
});

ok('a phone clock a year ahead can\'t put last heard in the future', () => {
  const out = playsWithPending(new Map(), [change('a', '2027-11-10T20:00:00.000Z')], NOW);
  assert.equal(out.get('a').last, NOW);
});

ok('tags and ratings in the outbox change no count', () => {
  const out = playsWithPending(new Map(), [{ id: 'x', kind: 'rating_set', data: { song_id: 'a', value: 'fire' } }, { id: 'y', kind: 'tag_add', data: { song_id: 'a' } }], NOW);
  assert.equal(out.size, 0);
});

ok('sent, then listed: the count is the same before, during and after (never doubled, never dipping)', () => {
  const lap = laptop();
  const pending = [change('a', '2026-11-10T20:00:00.000Z'), change('b', '2026-11-10T20:05:00.000Z')];
  const before = flat(playsWithPending(playsFrom(lap.songs(['a', 'b'])), pending, NOW));
  lap.take(pending);
  lap.take(pending); // the answer was lost: the phone sends the same lines again
  const after = flat(playsWithPending(playsFrom(lap.songs(['a', 'b'])), [], NOW));
  assert.equal(after, before);
  assert.equal(after, 'a:1@2026-11-10T20:00:00.000Z b:1@2026-11-10T20:05:00.000Z');
});

ok('a song list asked while a play is on its way: right whether the laptop listed before or after counting it', () => {
  const lap = laptop();
  lap.take([change('a', '2026-11-09T20:00:00.000Z')]);
  const sending = [change('a', '2026-11-10T20:00:00.000Z'), change('b', '2026-11-10T20:05:00.000Z')];
  const listedBefore = playsFrom(lap.songs(['a', 'b'])); // the list left the laptop first
  lap.take(sending);
  const listedAfter = playsFrom(lap.songs(['a', 'b'])); // the laptop counted the plays first (wave 1 review, catch 9)
  const known = playsWithPending(listedBefore, sending, NOW); // what the phone holds once the laptop says "taken"
  const want = 'a:2@2026-11-10T20:00:00.000Z b:1@2026-11-10T20:05:00.000Z';
  assert.equal(flat(known), want);
  assert.equal(flat(listWithTaken(listedBefore, known, sending, NOW)), want);
  assert.equal(flat(listWithTaken(listedAfter, known, sending, NOW)), want);
  // two plays of one song on their way, the list caught only the first: one is added, not two
  const two = [change('c', '2026-11-10T20:10:00.000Z'), change('c', '2026-11-10T20:20:00.000Z')];
  lap.take(two.slice(0, 1));
  const half = playsFrom(lap.songs(['c']));
  assert.equal(flat(listWithTaken(half, playsWithPending(new Map(), two, NOW), two, NOW)), 'c:2@2026-11-10T20:20:00.000Z');
  assert.match(source('./playStore.ts'), /base = listWithTaken\(playsFrom\(songs\), base, /);
});

ok('a wipe and a restore: counts come back from the laptop, unsent plays from the backup, and a second restore changes nothing', () => {
  const lap = laptop();
  const sent = [change('a', '2026-11-08T20:00:00.000Z'), change('a', '2026-11-09T20:00:00.000Z'), change('b', '2026-11-09T21:00:00.000Z')];
  lap.take(sent);
  const unsent = [change('c', '2026-11-10T20:00:00.000Z')]; // played with the laptop off; in the outbox, so in the phone's backup
  const beforeWipe = flat(playsWithPending(playsFrom(lap.songs(['a', 'b', 'c'])), unsent, NOW));
  // the wipe: the phone holds nothing. The song list brings the counts; the backup brings the outbox back
  const restoredOnce = flat(playsWithPending(playsFrom(lap.songs(['a', 'b', 'c'])), unsent, NOW));
  assert.equal(restoredOnce, beforeWipe);
  assert.equal(restoredOnce, 'a:2@2026-11-09T20:00:00.000Z b:1@2026-11-09T21:00:00.000Z c:1@2026-11-10T20:00:00.000Z');
  // the restored outbox sends; some lines had already reached the laptop before the wipe
  lap.take([...sent.slice(1), ...unsent]);
  lap.take(unsent);
  assert.equal(flat(playsWithPending(playsFrom(lap.songs(['a', 'b', 'c'])), [], NOW)), beforeWipe);
  // the outbox is what the backup carries, and a restore only adds lines it doesn't hold
  assert.match(source('./phoneBackup.ts'), /outbox: pendingNow\(\)/);
  assert.match(source('./outbox.ts'), /back = changes\.filter\(\(change\) => change && typeof change\.id === 'string' && !have\.has\(change\.id\)\)/);
});

ok('a wipe with a play that never reached the backup loses that one play and nothing else', () => {
  const lap = laptop();
  lap.take([change('a', '2026-11-08T20:00:00.000Z')]);
  assert.equal(flat(playsWithPending(playsFrom(lap.songs(['a', 'b'])), [], NOW)), 'a:1@2026-11-08T20:00:00.000Z');
});

// ---------- Home's rows --------------------------------------------------------------------------------------------
const DAY = 24 * 3600 * 1000;
const songs = (count) => Array.from({ length: count }, (_, i) => ({ id: `s${i}` }));
const heard = (pairs) => new Map(pairs.map(([id, daysAgo, times = 1]) => [id, { n: times, last: NOW - daysAgo * DAY }]));

ok('a fresh wipe with nothing played: Recently played is empty (the row is not drawn), Not played in a while is full', () => {
  const all = songs(671);
  assert.deepEqual(recentlyPlayed(all, new Map()), []);
  assert.equal(notPlayedInAWhile(all, new Map(), NOW).length, ROW_SONGS);
});

ok('no songs at all: both rows are empty', () => {
  assert.deepEqual(recentlyPlayed([], new Map()), []);
  assert.deepEqual(notPlayedInAWhile([], new Map(), NOW), []);
});

ok('Recently played: newest first, 12 at most, and a song no longer listed (Hidden) drops out', () => {
  const all = songs(40);
  const plays = heard(all.slice(0, 20).map((song, i) => [song.id, i]));
  plays.set('gone', { n: 3, last: NOW });
  const row = recentlyPlayed(all, plays);
  assert.deepEqual(row.map((song) => song.id), all.slice(0, 12).map((song) => song.id));
});

ok('Not played in a while: nothing heard in the last 30 days, the longest-unheard first, then never-played songs', () => {
  const all = songs(100);
  const plays = heard([['s1', 2], ['s2', A_WHILE_DAYS - 1], ['s3', 40], ['s4', 400], ['s5', 90]]);
  const row = notPlayedInAWhile(all, plays, NOW).map((song) => song.id);
  assert.deepEqual(row.slice(0, 3), ['s4', 's5', 's3']);
  assert.equal(row.length, ROW_SONGS);
  assert.ok(!row.includes('s1') && !row.includes('s2'));
  assert.equal(new Set(row).size, row.length);
});

ok('the never-played songs are the same all day and different the next day (never random per redraw, never the same 12 forever)', () => {
  const all = songs(671);
  const ids = (at) => notPlayedInAWhile(all, new Map(), at).map((song) => song.id).join();
  const morning = new Date(2026, 10, 10, 8).getTime();
  assert.equal(ids(morning), ids(morning + 9 * 3600 * 1000));
  assert.equal(dayOf(morning), '2026-11-10');
  const week = new Set(Array.from({ length: 7 }, (_, d) => ids(morning + d * DAY)));
  assert.equal(week.size, 7);
  assert.notEqual(ids(morning), all.slice(0, 12).map((song) => song.id).join(), 'not simply the first 12 of the list');
});

ok('songs heard long ago fill the row when few were never played, and the other way round', () => {
  const all = songs(20);
  const plays = heard(all.slice(0, 18).map((song, i) => [song.id, 31 + i]));
  const row = notPlayedInAWhile(all, plays, NOW).map((song) => song.id);
  assert.equal(row.length, ROW_SONGS);
  assert.deepEqual(row.slice(0, 10), all.slice(8, 18).map((song) => song.id).reverse());
  assert.deepEqual(row.slice(10).sort(), ['s18', 's19']);
});

ok('1,395 songs: both rows worked out in well under 50 ms', () => {
  const all = songs(1395);
  const plays = heard(all.slice(0, 600).map((song, i) => [song.id, i % 200]));
  const began = performance.now();
  for (let i = 0; i < 10; i++) {
    recentlyPlayed(all, plays);
    notPlayedInAWhile(all, plays, NOW);
  }
  const each = (performance.now() - began) / 10;
  assert.ok(each < 50, `${each.toFixed(1)} ms`);
});

ok('a song from Not played in a while starts at 0:30, or a third in when it is short', () => {
  assert.equal(rediscoverStart(214), 30);
  assert.equal(rediscoverStart(null), 30);
  assert.equal(rediscoverStart(45), 15);
});

// ---------- the fresh-eyes review's catches (docs/board/wave1-review.md) ---------------------------------------------
ok('review 1: the last song of a list ends, then Play on it again: the replay is its own play', () => {
  const r = rig();
  r.start('a');
  r.play(200);
  r.start('a'); // what finished() does when nothing comes next: this play is over, the same song stands ready
  assert.equal(r.lines.filter((line) => !line.end).length, 1);
  r.pause(3600);
  r.play(31);
  const first = r.lines.filter((line) => !line.end);
  assert.equal(first.length, 2);
  assert.equal(first[1].started_at, '2026-11-10T21:03:20.000Z', 'it starts when its sound does, not when the last play ended');
  assert.match(source('./playerStore.ts'), /Played every song in this list', wanted: false \}\);\s*\/\/[^\n]*\n\s*plays\.start\(state\.sorting \? null : state\.song\?\.id \?\? null\);/);
});

ok('review 2: two minutes in Compare are not credited to the song when Compare ends', () => {
  const r = rig();
  r.start('a');
  r.play(10);
  r.t.hold(); // Compare takes the sound
  r.wait(120);
  r.t.report(true, 130, 200); // Done: the queue's player reports again, 120 s further on
  assert.equal(r.lines.length, 0);
  assert.ok(r.t.now().heard < 11, `${r.t.now().heard} s heard`);
  r.play(19);
  assert.equal(r.lines.length, 0);
  r.play(1.5);
  assert.equal(r.lines.length, 1);
  const p = source('./playerStore.ts');
  assert.match(p, /if \(state\.comparing\) return plays\.hold\(\);/);
  assert.match(p, /startCompare\([^\n]*\n\s*settleHandOff\(\);\s*plays\.hold\(\);/);
});

ok('review 3: the laptop\'s six-decimal times are read as dates, and are cut to three before the phone\'s reader sees them', () => {
  const got = playsFrom([{ id: 'a', plays: 2, last_heard: '2026-11-02T09:00:00.123456Z' }, { id: 'b', plays: 1, last_heard: 'not a date' }]);
  assert.equal(got.get('a').last, Date.parse('2026-11-02T09:00:00.123Z'));
  assert.equal(got.get('b').last, 0);
  assert.ok(source('./playLog.ts').includes("Date.parse(iso.replace(/([.]\\d{3})\\d+/, '$1'))"));
});

ok('review 4, 6: plays alone never raise the waiting line, and Home\'s rows only change while Home is out of view', () => {
  assert.match(source('./Notices.tsx'), /if \(!changes\) return null;/);
  const home = source('./Home.tsx');
  assert.match(home, /const inView = showing && sheet === 'none';/);
  assert.match(home, /useEffect\(\(\) => \{\s*if \(inView\) setPlays\(playStore\.all\(\)\);\s*\}, \[inView, fresh\]\);/);
  assert.ok(!home.includes('usePlays'), 'not live: a play counted while I look at Home moves nothing');
});

// ---------- the wiring: checked in the source, since the player itself can't run on the laptop ----------------------
ok('the player feeds the tracker after the sound, never before it; Sort cards and Compare are left out', () => {
  const p = source('./playerStore.ts');
  assert.match(p, /if \(state\.comparing\) return plays\.hold\(\);[^\n]*\n[^\n]*\n[^\n]*\n\s*plays\.report\(sound\.playing, sound\.time, phoneLength\)/);
  assert.equal(p.match(/plays\.start\(state\.sorting \? null : /g).length, 3);
  // loadOrder asks for the sound (toSound) before it starts the count
  assert.ok(p.indexOf('if (modeReady) toSound(false);') < p.indexOf('plays.start(state.sorting ? null : id)'));
});

ok('a play in the outbox never makes Library fetch or redraw, and never counts as a change of mine', () => {
  const lib = source('./Library.tsx');
  assert.match(lib, /const pending = useMemo\(\(\) => waitingAll\.filter\(\(change\) => change\.kind !== 'play_add'\), \[choiceKey\]\)/);
  assert.match(source('./sortData.ts'), /change\.kind === 'play_add'\) continue;/);
  assert.match(source('./Notices.tsx'), /count\(played, 'play', 'plays'\)/);
});

ok('locked: a counted play waits on the phone (no send, no backup call) until the app is opened', () => {
  assert.match(source('./phoneBackup.ts'), /soon\(\) \{\s*if \(away\) return;/);
  assert.match(source('./outbox.ts'), /if \(!paused\) flush\(\);/);
});

console.log(`\n${n} checks passed`);
