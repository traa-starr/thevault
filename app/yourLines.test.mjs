// One world (ROADMAP O.6), Fable kit goal 2: node --experimental-strip-types app/yourLines.test.mjs
// Written by Opus 2026-11-12 BEFORE the code, failing on purpose: Fable makes it pass (docs/overhaul/FABLE-KIT.md).
// The board's one idea: your lines are the song's face. Pure functions in app/yourLines.ts:
//   lineFor(songId, tags, matchedTagId?)  the line a song shows as its second line (null: it has none with words)
//   homeLine(tags, seed)                  the line Home opens on: { song_id, text, at_sec } or null
//   secondLine(line, familySize)          a row's second line: the line, else "3 versions", else null (meta as today)
// And Home's lower rows drop Most played and Versions to compare (WORLD-MAP, Home).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOME_ROWS } from './libraryCore.ts';
import { homeLine, lineFor, secondLine } from './yourLines.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const code = (file) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

// made-up lines, never real ones (the repo is public)
const tag = (id, song_id, at_sec, text) => ({ id, song_id, at_sec, text, made_at: '2026-11-01T00:00:00Z' });
const TAGS = [
  tag('t3', 'a', 95.5, 'second verse, the lights went out'),
  tag('t1', 'a', 12.0, 'cold open, nobody waiting'),
  tag('t2', 'a', 40.0, ''), // a words-free mark: never shown as a line
  tag('t4', 'b', 0, '   '),
  tag('t5', 'c', 61.25, 'hook: keep the vault shut'),
];

ok('a song shows its earliest line with words', () => {
  assert.equal(lineFor('a', TAGS), 'cold open, nobody waiting');
  assert.equal(lineFor('c', TAGS), 'hook: keep the vault shut');
});

ok('marks with no words never count; a song with none shows nothing', () => {
  assert.equal(lineFor('b', TAGS), null);
  assert.equal(lineFor('zzz', TAGS), null);
});

ok('a search match shows the matched line instead', () => {
  assert.equal(lineFor('a', TAGS, 't3'), 'second verse, the lights went out');
  assert.equal(lineFor('a', TAGS, 'nope'), 'cold open, nobody waiting', 'an unknown match falls back to the earliest');
});

ok('Home opens on one line with words, and plays from its second', () => {
  const picked = homeLine(TAGS, 0);
  assert.ok(picked && picked.text.trim().length > 0);
  assert.ok(TAGS.some((t) => t.song_id === picked.song_id && t.at_sec === picked.at_sec && t.text === picked.text));
});

ok('Home: the same seed gives the same line (no jump on a redraw); seeds spread over every line', () => {
  assert.deepEqual(homeLine(TAGS, 7), homeLine(TAGS, 7));
  const seen = new Set(Array.from({ length: 30 }, (_, seed) => homeLine(TAGS, seed).text));
  assert.equal(seen.size, 3, 'all three lines with words come up');
});

ok('Home with no lines yet: null (the card says "Tag your first line")', () => {
  assert.equal(homeLine([], 3), null);
  assert.equal(homeLine([tag('x', 'a', 1, '')], 3), null);
});

ok('a row second line: the line, else the versions count, else nothing', () => {
  assert.equal(secondLine('cold open, nobody waiting', 3), 'cold open, nobody waiting');
  assert.equal(secondLine(null, 3), '3 versions');
  assert.equal(secondLine(null, 1), null);
});

ok('Home keeps three lower rows: Most played and Versions to compare move to Library only', () => {
  assert.deepEqual(HOME_ROWS.map((row) => row.title), ['Recently added', 'Favorites', 'Needs tags']);
});

ok('the screens use it: Home has the line card, rows and the mini player show lines', () => {
  assert.ok(/homeLine\(/.test(code('./Home.tsx')), 'Home.tsx opens on homeLine');
  assert.ok(/Tag your first line/.test(code('./Home.tsx')), 'Home says what to do with no lines');
  assert.ok(/secondLine\(/.test(code('./SongRow.tsx')), 'Library rows use secondLine');
  assert.ok(/lineFor\(/.test(code('./Player.tsx')), 'the mini player shows a line');
});

console.log(`\n${n} your-lines checks passed`);
