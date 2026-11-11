// Quiet with the screen open (NEXT 2026-11-11 B): node --experimental-strip-types app/openScreen.test.mjs
// The phone's own numbers with the app open, wave 2's code: 157 to 173 wake-ups, 167 to 198 redraws and 9 to 13
// network calls a minute, against the laptop's ceilings of 130 / 135 / 6 (server/vault_server/timings.py CEILINGS).
// This runs an open hour on a pretend clock under the old rules and the new ones, three ways of listening:
//   skipping (a new song every 7.4 s, tagging and rating as I go: what the phone measured, 57 songs in 7 minutes),
//   browsing (45 s a song, a choice now and then), and plain listening (3 minutes a song, hands off).
// The rules are the app's own functions (energy.ts, playlistCore.ts), so changing one changes the result here.
// The model can't stand in for the phone (LESSONS): the phone's `timings` "open" line is the proof.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BACKUP_WITHIN_MS, changedKeys, choicesKey, energyMeter, GAP_MS, HEALTH_GOOD_MS, inSongList, playSendsNow, redrawFor, SPOT_EVERY_MS } from './energy.ts';
import { REPORT_MS } from './playlistCore.ts';
import { PLAY_STEP, songStartWords, tickWordsAfter } from './playOrder.ts';
import { PLAY_COUNTS_AFTER } from './playLog.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const code = (file) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

// The laptop's ceilings per minute of playing, screen open.
const CEILING = { reports: 130, redraws: 135, net: 6, writes: 8 };
ok('this test holds the same open-screen ceilings as the laptop', () => {
  const server = readFileSync(new URL('../server/vault_server/timings.py', import.meta.url), 'utf8');
  assert.ok(server.includes('"open": {"reports": 130, "redraws": 135, "net": 6, "writes": 8}'));
});

// What the phone showed beyond the steady reports, per song started (timings 2026-11-11: 173 wake-ups a minute at
// 8.1 songs a minute, where two reports a second make 120): about 7 more reports as a song loads and starts, and
// (198 redraws against 173 reports) 3 more redraws for the new song, its order and its note.
const EXTRA_REPORTS = 7;
const SONG_UPDATES = 3;
const HOUR = 3600 * 1000;
const TIMINGS_SENT_AT = 10; // timings.ts SEND_AT: one call per 10 taps timed

const OLD = {
  reportMs: 500, // twice a second
  draws: () => true, // every report redrew, changed or not
  backupAfter: 'every outbox change', // a play joining the outbox too; the laptop's version asked before each
  healthGoodMs: 0,
  backupWithinMs: 3000,
  endLineSends: true, // a play's full length was its own send
  listAfter: () => true, // any choice the laptop took: the song list again
};
const NEW = {
  reportMs: REPORT_MS.open,
  // as playerStore's update(): nothing changed, nothing drawn
  draws: (was, changes) => changedKeys(was, changes).length > 0 && redrawFor(true, changedKeys(was, changes)),
  backupAfter: 'choices',
  healthGoodMs: HEALTH_GOOD_MS,
  backupWithinMs: BACKUP_WITHIN_MS,
  endLineSends: playSendsNow({ end: true }, true),
  listAfter: inSongList,
};

/** One hour with the app open and a song always playing. `songMs`: how long each song is heard before the next.
 * `choices`: what I tap and how often ({ kind, everyMs }): each is saved and sent at once. */
function openHour(rules, songMs, choices = []) {
  let now = 0;
  const samples = [];
  const meter = energyMeter((s) => samples.push(s), () => now);
  meter.setOpen(true);
  meter.setPlaying(true);
  let shown = { time: -1, duration: 0 };
  let barMoves = 0; // redraws that moved the clock
  const report = (time) => {
    meter.count('reports');
    const changes = { time, duration: 180 };
    const moved = changes.time !== shown.time;
    if (rules.draws(shown, changes)) {
      meter.count('redraws');
      if (moved) barMoves++;
    }
    shown = { ...shown, ...changes };
  };
  // the outbox, as far as the network sees it
  let outbox = [];
  let id = 0;
  let healthAt = -Infinity;
  let backupDue = Infinity;
  const net = () => meter.count('net');
  const backup = () => {
    if (now - healthAt >= rules.healthGoodMs) {
      net(); // GET /health
      healthAt = now;
    }
    net(); // POST /phone-backup
  };
  const outboxChanged = (was) => {
    const changed = rules.backupAfter === 'choices' ? choicesKey(was) !== choicesKey(outbox) : true;
    if (!changed) return;
    // old: each change pushes the copy 3 s on (the join and the leave of one send make one copy); new: the first
    // change starts a minute, and a copy already on its way covers the rest
    if (rules.backupAfter === 'choices' ? backupDue === Infinity : true) backupDue = now + rules.backupWithinMs;
  };
  const add = (kind, sendNow) => {
    const was = outbox;
    outbox = [...outbox, { id: String(++id), kind }];
    outboxChanged(was);
    if (!sendNow) return; // saved on the phone; it goes with the next send
    net(); // POST /changes: everything waiting, in one call
    const sent = outbox;
    outbox = [];
    outboxChanged(sent);
    if (sent.some((change) => change.kind === 'tag_add')) net(); // GET /tags: the copy is asked for again
    if (sent.some(rules.listAfter)) net(); // GET /songs: Library's list again
  };

  let songStart = 0;
  let counted = false;
  let lastSave = 0;
  let taps = 0;
  let extraLeft = EXTRA_REPORTS;
  let nextReport = rules.reportMs;
  let nextTimer = 5 * 60 * 1000; // phoneBackup.ts EVERY_MS
  const nextChoice = choices.map((choice) => choice.everyMs);
  const STEP = 100;
  for (now = STEP; now <= HOUR; now += STEP) {
    const heard = (now - songStart) / 1000;
    // a new song: Next tapped (one timing), the song before it leaves its full length
    if (now - songStart >= songMs) {
      if (counted && heard - PLAY_COUNTS_AFTER >= 5) add('play_add', rules.endLineSends);
      songStart = now;
      counted = false;
      extraLeft = EXTRA_REPORTS;
      for (let i = 0; i < SONG_UPDATES; i++) meter.count('redraws');
      meter.count('writes');
      lastSave = now;
      if (++taps % TIMINGS_SENT_AT === 0) net(); // POST /timings
      shown = { time: -1, duration: 0 };
    }
    // loading and starting: more reports than the steady rate, all saying the same second
    if (extraLeft && (now - songStart) % 100 === 0 && now - songStart <= 700) {
      extraLeft--;
      report(0);
    }
    if (now >= nextReport) {
      nextReport += rules.reportMs;
      report(Math.floor((now - songStart) / 100) / 10);
      if (now - lastSave >= SPOT_EVERY_MS.open) {
        lastSave = now;
        meter.count('writes');
      }
    }
    if (!counted && (now - songStart) / 1000 >= PLAY_COUNTS_AFTER) {
      counted = true;
      add('play_add', playSendsNow({}, true)); // the play itself: always sent at once, old rules and new
    }
    choices.forEach((choice, i) => {
      if (now < nextChoice[i]) return;
      nextChoice[i] += choice.everyMs;
      add(choice.kind, true);
    });
    if (now >= backupDue) {
      backupDue = Infinity;
      backup();
    }
    if (now >= nextTimer) {
      nextTimer += 5 * 60 * 1000;
      backup();
    }
  }
  meter.flush();
  const minutes = samples.reduce((sum, s) => sum + s.ms, 0) / 60000;
  const per = (key) => samples.reduce((sum, s) => sum + s[key], 0) / minutes;
  return { minutes, where: samples.map((s) => s.where), reports: per('reports'), redraws: per('redraws'), net: per('net'), writes: per('writes'), barMoves: barMoves / minutes };
}

const MIN = 60 * 1000;
const WAYS = {
  // 57 songs in 7 minutes, about 10 lines tagged and a few Favorites in that time (the phone's sample)
  skipping: { songMs: 7400, choices: [{ kind: 'tag_add', everyMs: 0.7 * MIN }, { kind: 'rating_set', everyMs: 3 * MIN }] },
  browsing: { songMs: 45000, choices: [{ kind: 'tag_add', everyMs: 1.5 * MIN }, { kind: 'rating_set', everyMs: 5 * MIN }] },
  listening: { songMs: 180000, choices: [] },
};
const run = (rules) => Object.fromEntries(Object.entries(WAYS).map(([name, way]) => [name, openHour(rules, way.songMs, way.choices)]));
const before = run(OLD);
const after = run(NEW);
const line = (r) => `wake-ups ${r.reports.toFixed(0)}, redraws ${r.redraws.toFixed(0)}, network ${r.net.toFixed(1)}, writes ${r.writes.toFixed(1)}`;
for (const name of Object.keys(WAYS)) {
  console.log(`      open hour, ${name}, per minute, before: ${line(before[name])}`);
  console.log(`      open hour, ${name}, per minute, after:  ${line(after[name])}`);
}

ok('the model sees what the phone saw: under the old rules, skipping breaks all three ceilings by about the phone\'s own numbers', () => {
  const was = before.skipping;
  assert.ok(Math.abs(was.minutes - 60) < 0.5 && was.where.every((where) => where === 'open'), 'the whole hour is measured as open');
  assert.ok(was.reports > 157 && was.reports < 190, `wake-ups ${was.reports.toFixed(0)} (phone: 157 and 173)`);
  assert.ok(was.redraws > 167 && was.redraws < 215, `redraws ${was.redraws.toFixed(0)} (phone: 167 and 198)`);
  assert.ok(was.net > 8 && was.net < 14, `network ${was.net.toFixed(1)} (phone: 8.8 and 13.4)`);
  for (const key of ['reports', 'redraws', 'net']) assert.ok(was[key] > CEILING[key], `${key} was over its ceiling`);
  // even hands off, the steady reports alone sat at the old ceiling's edge
  assert.ok(before.listening.reports >= 120);
});

ok('an open hour stays under every ceiling, however I listen: skipping, browsing, hands off', () => {
  for (const [name, now] of Object.entries(after)) {
    assert.ok(Math.abs(now.minutes - 60) < 0.5 && now.where.every((where) => where === 'open'), `${name}: the whole hour is measured (${now.minutes.toFixed(1)} min)`);
    // file writes aren't part of this fix: the spot is saved at every song change, as built, so skipping 8 songs a
    // minute writes 8 times a minute (the phone read 7.6). Held to "no more than before" there, to the ceiling elsewhere
    for (const key of ['reports', 'redraws', 'net']) assert.ok(now[key] <= CEILING[key], `${name}: ${key} ${now[key].toFixed(1)} over ${CEILING[key]}`);
    assert.ok(now.writes <= before[name].writes, `${name}: no more file writes than before`);
    if (name !== 'skipping') assert.ok(now.writes <= CEILING.writes, `${name}: writes ${now.writes.toFixed(1)} over ${CEILING.writes}`);
  }
  // with room to spare where it's the app's own doing: hands off, half the wake-ups and under one call a minute
  assert.ok(after.listening.reports <= 65 && after.listening.redraws <= 65 && after.listening.net < 1, line(after.listening));
  assert.ok(after.skipping.reports < 125 && after.skipping.redraws < 100 && after.skipping.net < 5.5, line(after.skipping));
});

ok('the seek bar and the clock still move every second (the fix draws less, it doesn\'t freeze the bar)', () => {
  for (const [name, now] of Object.entries(after)) assert.ok(now.barMoves >= 57 && now.barMoves <= 72, `${name}: the clock moved ${now.barMoves.toFixed(1)} times a minute`); // each second, plus once per new song
  // a report that changes nothing draws nothing; one that moves the clock, or anything else, draws
  const held = { time: 12, duration: 180, wanted: true, note: '' };
  assert.deepEqual(changedKeys(held, { time: 12, duration: 180 }), []);
  assert.deepEqual(changedKeys(held, { time: 13, duration: 180 }), ['time']);
  assert.deepEqual(changedKeys(held, { time: 12, duration: 180, wanted: false }), ['wanted']);
  assert.deepEqual(changedKeys(held, { note: 'Played every song in this list' }), ['note']);
  const store = code('./playerStore.ts');
  assert.ok(/const update = \(changes: Partial<State>\) => \{\s*const changed = changedKeys\(state, changes\);\s*if \(changed\.length\) state = \{ \.\.\.state, \.\.\.changes \};/.test(store), 'the player runs the tested rule');
  assert.ok(store.includes('if (!changed.length || !redrawFor(appOpen, changed)) return;'));
  // locked is as it was: the clock alone draws nothing, and now an unchanged report draws nothing either
  assert.equal(redrawFor(false, changedKeys(held, { time: 13, duration: 180 })), false);
  assert.equal(redrawFor(false, changedKeys(held, { time: 13, wanted: false })), true);
});

ok('once a second on screen, and nothing that reads the clock breaks: tag words still show as playback passes them, playing time is still counted', () => {
  assert.equal(REPORT_MS.open, 1000);
  assert.equal(GAP_MS.open, 3 * REPORT_MS.open, 'a report up to 3 s late still counts as playing');
  // LESSONS 2026-11-08 (tag words during plain playback): a tag between two reports a second apart shows, also when a
  // report comes late (1.9 s); a jump of 3 s is a seek and shows nothing
  assert.ok(PLAY_STEP >= (2 * REPORT_MS.open) / 1000 && PLAY_STEP < 3);
  const tags = [{ id: 't1', at_sec: 12.4 }, { id: 't2', at_sec: 40 }];
  let words = tickWordsAfter(songStartWords, tags, 11.9, 1000, true);
  words = tickWordsAfter(words, tags, 12.9, 2000, true);
  assert.equal(words.tagId, 't1');
  let late = tickWordsAfter({ from: 11.0, tagId: null, until: 0 }, tags, 12.9, 2000, true);
  assert.equal(late.tagId, 't1', 'a late report');
  late = tickWordsAfter({ from: 37.5, tagId: null, until: 0 }, tags, 40.6, 2000, true);
  assert.equal(late.tagId, null, 'a 3 s jump is a seek');
  // every second of an hour's playback, each tag passed is shown
  let state = songStartWords;
  const seen = new Set();
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, at_sec: 3 + i * 5.37 }));
  for (let t = 0; t <= 180; t += REPORT_MS.open / 1000) {
    state = tickWordsAfter(state, many, t, t * 1000, true);
    if (state.tagId) seen.add(state.tagId);
  }
  assert.equal(seen.size, 30, 'all 30 tags of a song show as it plays');
});

ok('network: a play is one call (its full length rides along), costs no backup and no song list; a tag costs no song list; a run of choices makes one backup', () => {
  assert.equal(playSendsNow({}, true), true, 'the play itself goes at once');
  assert.equal(playSendsNow({ end: true }, true), false, 'its full length waits for the next send');
  assert.equal(playSendsNow({}, false), false, 'locked: nothing is sent');
  const outbox = [{ id: 'a', kind: 'rating_set' }, { id: 'p', kind: 'play_add' }, { id: 't', kind: 'tag_add' }];
  assert.equal(choicesKey(outbox), 'a,t');
  assert.equal(choicesKey([...outbox, { id: 'q', kind: 'play_add' }]), choicesKey(outbox), 'a play joining changes nothing a backup is for');
  assert.notEqual(choicesKey(outbox.slice(1)), choicesKey(outbox));
  assert.deepEqual(['mine_set', 'rating_set', 'family_set', 'mine_restore'].map((kind) => inSongList({ kind })), [true, true, true, true]);
  assert.deepEqual(['tag_add', 'tag_remove', 'play_add'].map((kind) => inSongList({ kind })), [false, false, false]);
  // the app runs these rules
  assert.ok(code('./outbox.ts').includes('if (playSendsNow(data, !paused)) flush();'));
  const backup = code('./phoneBackup.ts');
  assert.ok(/const choices = choicesKey\(pendingNow\(\)\);\s*if \(choices === choicesWas\) return;\s*choicesWas = choices;\s*phoneBackup\.soon\(\);/.test(backup), 'only a choice asks for a backup');
  assert.ok(backup.includes('if (away || soon !== undefined) return;') && backup.includes('}, BACKUP_WITHIN_MS);'), 'one backup for a run of choices');
  assert.ok(backup.includes('if (Date.now() - healthAt >= HEALTH_GOOD_MS || state.outOfDate) {'), 'the version is not asked before every backup');
  assert.ok(/pause\(\) \{[\s\S]*?clearTimeout\(soon\);\s*soon = undefined;[\s\S]*?send\(\);/.test(backup), 'going to the background still backs up at once');
  assert.ok(code('./Library.tsx').includes('const waiting = pending.some(inSongList);'));
  // plain listening: under one call a minute, where the old rules made more than two
  assert.ok(before.listening.net > 2 && after.listening.net < 1, `${before.listening.net.toFixed(1)} -> ${after.listening.net.toFixed(1)}`);
});

console.log(`\n${n} open-screen checks passed`);
