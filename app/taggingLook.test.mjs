// The tagging session and tag editing in the new style (NEXT 2026-11-11 D): node --experimental-strip-types app/taggingLook.test.mjs
// Look only: what saves, the timers and the reserved line stay as built. This holds the few rules the board set
// (board/wave3.md D) and the ones that must not have slipped: the hold stays 400 ms, the reserved line keeps its
// height so nothing jumps, every hold-menu row is a 44 pt touch or more with Delete last, and the session's bar maths.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { S } from './theme.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const code = (file) => source(file).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
const tagging = code('./Tagging.tsx');
const playerSrc = code('./Player.tsx');
const num = (re, text) => Number(re.exec(text)?.[1]);

ok('timers and the reserved line stay as built: 400 ms hold, reserved line 52 high', () => {
  assert.equal(num(/HOLD_MS = (\d+)/, tagging), 400);
  assert.equal(num(/LINE_HEIGHT = (\d+)/, tagging), 52);
  assert.ok(/delayLongPress=\{HOLD_MS\}/.test(tagging), 'the row uses the one hold time');
});

ok('hold menu: a half sheet with rows of 44 pt or more, Change words first, Delete in plain white, then a gap, then Cancel on its own (wave 4, catch 18)', () => {
  const row = num(/ROW_HEIGHT = (\d+)/, tagging);
  assert.ok(row >= S.tap, `rows ${row} high`);
  const menu = tagging.slice(tagging.indexOf('function HoldMenu('), tagging.indexOf('const s = StyleSheet'));
  const items = [...menu.matchAll(/item\((['`])([^'`]+)\1/g)].map((m) => m[2]);
  assert.deepEqual(items, ['Change words', 'Move to ${clock(time)}', 'Delete', 'Cancel']);
  assert.ok(!/item\('Delete'[^)]*s\.menu\w+\)/.test(menu), 'Delete has no colour of its own');
  assert.ok(/item\('Delete'[^\n]*\n\s*<View style=\{s\.menuGap\} \/>\n\s*\{item\('Cancel'/.test(menu), 'a gap sets Cancel apart from Delete: a slip off Cancel lands on the gap');
  assert.ok(/tagLine\.delete\(tag\)/.test(menu), 'Delete still goes through tagStore, which gives its Undo');
  assert.ok(/menuSheet: \{[^}]*borderTopLeftRadius: R\.sheet/.test(tagging) && /backgroundColor: C\.raised/.test(tagging), 'raised, sheet corner');
  assert.ok(/menuScrim/.test(menu) && /onPress=\{tagLine\.closeMenu\}/.test(menu), 'a tap outside closes it');
  assert.ok(/<HoldMenu /.test(playerSrc), 'the player draws it at page level');
  assert.ok(!/RowMenu/.test(tagging), 'the old in-place row menu is gone');
});

ok('Lines rows: list style (time in fixed digits, words 17), no colour typed by hand', () => {
  assert.ok(/rowAt: \{ \.\.\.T\.meta, width: 48, fontVariant: \['tabular-nums'\] \}/.test(tagging));
  assert.ok(/rowWords: \{ flex: 1, \.\.\.T\.row \}/.test(tagging));
  const styles = tagging.slice(tagging.indexOf('const s = StyleSheet'));
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(styles), 'Tagging.tsx styles take every colour from theme.ts');
});

ok('session: the count is a line with a thin amber bar; Not mine is the quiet pill; Next song is lit', () => {
  // Player.tsx needs the phone, so the bar's maths is lifted from its text and run here
  const fn = new Function('tagged', 'of', `return ${/sessionShare = \(tagged: number, of: number\) => (\(.*\));/.exec(playerSrc)[1]}`);
  assert.equal(fn(3, 10), 0.3);
  assert.equal(fn(0, 0), 0, 'no songs: no bar, no division by zero');
  assert.equal(fn(12, 10), 1, 'never past the end');
  assert.ok(/sessionTrack: \{ position: 'absolute'/.test(playerSrc) && /sessionBar: \{ height: 2, backgroundColor: C\.accent \}/.test(playerSrc), 'the bar is drawn inside the row: nothing below moves');
  assert.ok(/<Tap style=\{\[s\.sessionPill, out && s\.sessionPillOff\]\} radius=\{18\} onPress=\{session\.notMine\}/.test(playerSrc), 'Not mine is a pill, same job');
  assert.ok(/<Action icon="next" word="Next song" on onPress/.test(playerSrc), 'Next song lit');
});

console.log(`taggingLook: ${n} checks passed`);
