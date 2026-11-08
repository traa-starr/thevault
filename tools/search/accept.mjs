// Search acceptance test (ROADMAP 3.7): runs a file of searches through the phone's own ladder (app/search.ts, the same
// file the phone runs) and prints PASS / FAIL per line. Rerun after every search change.
//
//   node --experimental-strip-types tools/search/accept.mjs <searches file> <library folder>      my real tags (read-only)
//   node --experimental-strip-types tools/search/accept.mjs tools/search/example-searches.txt tools/search/example-tags.json
//
// Searches file: one per line, `what I'd type => Song title`. Pass: that song is in the top 3 songs. Blank and # lines skip.
// With a library folder, the tags come from `vault_cli.py search-data` (the laptop's database, nothing written).
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, searchSongs } from '../../app/search.ts';

const TOP = 3;
const [searchesPath, source] = process.argv.slice(2);
if (!searchesPath || !source) {
  console.log('Usage: node --experimental-strip-types tools/search/accept.mjs <searches file> <library folder | tags.json>');
  process.exit(2);
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const data = statSync(source).isDirectory()
  ? JSON.parse(execFileSync('python', [resolve(repo, 'server/vault_cli.py'), 'search-data', source], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }))
  : JSON.parse(readFileSync(source, 'utf-8'));
const tags = data.tags;
const titleOf = new Map(tags.map((t) => [t.song_id, t.title]));
const index = buildIndex(tags);
const norm = (text) => text.trim().toLowerCase();

let passed = 0;
let failed = 0;
const lines = readFileSync(searchesPath, 'utf-8').split(/\r?\n/);
lines.forEach((raw, i) => {
  const line = raw.trim();
  if (!line || line.startsWith('#')) return;
  const cut = line.lastIndexOf('=>');
  if (cut < 0) {
    failed++;
    console.log(`FAIL  line ${i + 1}: no "=>" (write: search words => Song title)`);
    return;
  }
  const query = line.slice(0, cut).trim();
  const want = norm(line.slice(cut + 2));
  const { rows } = searchSongs(index, query, 20);
  const titles = rows.map((row) => titleOf.get(row.songId) ?? row.songId);
  const rank = titles.findIndex((title) => norm(title) === want) + 1;
  const known = [...titleOf.values()].some((title) => norm(title) === want);
  const ok = rank > 0 && rank <= TOP;
  if (ok) passed++;
  else failed++;
  const where = rank ? `#${rank}` : known ? 'not in the top 20' : 'no song with that title has tags';
  const top = rows[0] ? `top: ${titles[0]} (${rows[0].tag.text.slice(0, 50)})` : 'no results';
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${query}" => ${line.slice(cut + 2).trim()}: ${where}${ok ? '' : `; ${top}`}`);
});
console.log(`\n${passed} of ${passed + failed} passed (${tags.length.toLocaleString('en-US')} tags, pass = in the top ${TOP})`);
process.exit(failed ? 1 : 0);
