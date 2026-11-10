// Plain labels everywhere (owner, 2026-11-10): node --experimental-strip-types app/labels.test.mjs
// Reads the app's code, pulls out every piece of wording it can put on screen (or have VoiceOver speak), and
//   1. fails if any of it uses a word the owner ruled out (Fire, Shelve, slogans), and
//   2. keeps docs/overhaul/LABELS.md in step, so chat can read every label at review without opening the code.
// After changing a label: node --experimental-strip-types app/labels.test.mjs --write
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const ts = createRequire(import.meta.url)('typescript');
const here = new URL('.', import.meta.url);
const LIST = new URL('../docs/overhaul/LABELS.md', import.meta.url);

/** Words that must never show: the old names, and the mockups' slogans. Whole words, as written on screen. */
const RULED_OUT = [/\bFire\b/, /\bShelved?\b/, /\bshelf\b/i, /\bRap a line\b/i, /\bDealt\b/i, /\bDeal me\b/i, /\bRediscover\b/i, /\bUnshelve/i];

/** Calls whose words never reach the screen: errors for the code, the hidden lock-screen log, tap names for timings. */
const NOT_SHOWN = new Set(['Error', 'note', 'require', 'tap', 'mark', 'count', 'fetch', 'File', 'includes', 'startsWith', 'endsWith', 'replace', 'split', 'join', 'test', 'match', 'padStart', 'toLocaleString', 'toLocaleDateString', 'send']);

const wording = (text) => {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!/\p{L}/u.test(t)) return null; // no letters: a number, a symbol
  if (/^(#|rgba?\(|hsla?\(|https?:|\.{0,2}\/|[\w.-]+\.(json|txt|ts|tsx|m4a|mp3)$)/.test(t)) return null; // colours, links, files
  if (/^[A-Z][\w]*-[A-Z][\w-]*$/.test(t) || /^[A-Z_]+$/.test(t)) return null; // Content-Type, POST
  if (/^[a-z][\w-]*$/i.test(t) && !/^[A-Z][a-z]+$/.test(t)) return null; // one word that isn't Capitalised: a stored value or a style ('mine', 'flex-start', 'tabular-nums')
  if (/^[\w-]+(\/[\w{}.-]+)+$/.test(t) || /^[a-z]+:\/\//.test(t)) return null; // paths
  if (/^x{4,}/.test(t)) return null; // the id pattern
  if (/^-?\d+deg$/.test(t) || /^[a-z0-9]+(\.[a-z0-9]+)+$/.test(t) || t === '2-digit') return null; // angles, Apple's icon names, a date format
  if (/\{…\}\/|\/\{…\}/.test(t) || /^\{…\}[a-z]$/.test(t)) return null; // links built from parts
  if (/^(open|close) \{…\}$/.test(t)) return null; // tap names for the hang watch
  return t;
};

function labelsOf(file) {
  const text = readFileSync(new URL(file, here), 'utf8');
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = new Set();
  const hidden = (node) => {
    for (let up = node.parent; up; up = up.parent) {
      if (ts.isImportDeclaration(up) || ts.isExportDeclaration(up) || ts.isLiteralTypeNode(up) || ts.isTypeNode?.(up)) return true;
      if ((ts.isCallExpression(up) || ts.isNewExpression(up)) && up.arguments?.some((arg) => arg.pos <= node.pos && node.end <= arg.end)) {
        const callee = up.expression;
        const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : '';
        if (NOT_SHOWN.has(name)) return true;
      }
      if (ts.isJsxAttribute(up) && /^(style|key|testID|keyboardType|returnKeyType|submitBehavior|autoCapitalize|pointerEvents|accessibilityRole|keyboardAppearance|clearButtonMode|keyboardDismissMode|keyboardShouldPersistTaps|resizeMode|weight|glassEffectStyle|colorScheme)$/.test(up.name.getText())) return true;
      if (ts.isPropertyAssignment(up) && up.name === node) return true;
      if (ts.isElementAccessExpression(up) && up.argumentExpression === node) return true;
      if (ts.isBinaryExpression(up) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(up.operatorToken.kind) && (up.left === node || up.right === node)) return true;
      if (ts.isCaseClause(up) && up.expression === node) return true;
    }
    return false;
  };
  const add = (node, raw) => {
    const t = wording(raw);
    if (t && !hidden(node)) found.add(t);
  };
  const walk = (node) => {
    if (ts.isJsxText(node)) add(node, node.text);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text);
    else if (ts.isTemplateExpression(node)) add(node, node.head.text + node.templateSpans.map((span) => `{…}${span.literal.text}`).join(''));
    ts.forEachChild(node, walk);
  };
  walk(src);
  return [...found].sort((a, b) => a.localeCompare(b));
}

const files = readdirSync(here).filter((name) => /\.tsx?$/.test(name) && !name.endsWith('.d.ts')).sort();
const all = files.map((file) => [file, labelsOf(file)]).filter(([, labels]) => labels.length);
const total = all.reduce((sum, [, labels]) => sum + labels.length, 0);

const page = [
  '# Every word the app can put on screen',
  '',
  'Made by `app/labels.test.mjs` from the code; never edit by hand. `{…}` stands for a value filled in while the app runs',
  '(a title, a count, a time). VoiceOver labels are in here too. Not in here: single lower-case words (those are stored',
  'values like `mine`, never shown as they are), and the hidden lock-screen log.',
  'The owner\'s rule (2026-11-10): plain music-app words, no slogans. The test fails on Fire, Shelve / Shelved and the mockups\' slogans.',
  '',
  ...all.flatMap(([file, labels]) => [`## ${file}`, ...labels.map((label) => `- ${label}`), '']),
].join('\n');

if (process.argv.includes('--write')) {
  writeFileSync(LIST, page);
  console.log(`wrote ${total} labels from ${all.length} files to docs/overhaul/LABELS.md`);
}

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};

ok(`no label uses a ruled-out word (${total} labels in ${all.length} files)`, () => {
  const bad = all.flatMap(([file, labels]) => labels.filter((label) => RULED_OUT.some((word) => word.test(label))).map((label) => `${file}: ${label}`));
  assert.deepEqual(bad, []);
});
ok('the new names are the ones on screen: Favorite, Archive / Archived, Search, Recently played, Not played in a while', () => {
  const flat = all.flatMap(([, labels]) => labels);
  for (const word of ['Favorite', 'Favorites', 'Archive', 'Archived', 'Search', 'Shuffle', 'Recently played', 'Not played in a while', 'Queue', 'Home', 'Library', 'Tag', 'Lines · {…}'])
    assert.ok(flat.includes(word), word);
});
ok('the finder really finds: known labels from five kinds of code are in the list', () => {
  const of = (file) => all.find(([name]) => name === file)?.[1] ?? [];
  assert.ok(of('Home.tsx').includes('The Vault'), 'text between tags');
  assert.ok(of('App.tsx').includes('Laptop address'), 'a placeholder');
  assert.ok(of('Player.tsx').includes('Close player'), 'a VoiceOver label');
  assert.ok(of('ratingStore.ts').includes('Archived:'), 'words handed to the reserved line');
  assert.ok(of('Library.tsx').some((label) => label.startsWith('No Favorites yet')), 'a table of words');
  assert.ok(!all.flatMap(([, labels]) => labels).some((label) => /^(mine|fire|shelved|flex-start)$/.test(label)), 'stored values and styles stay out');
});
ok('docs/overhaul/LABELS.md is up to date (run this test with --write after changing a label)', () => {
  assert.equal(readFileSync(LIST, 'utf8').replace(/\r\n/g, '\n'), page);
});

console.log(`\n${n} label checks passed`);
