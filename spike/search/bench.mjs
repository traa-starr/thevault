// Speed and size of the ladder in JavaScript on the fake library. Writes the library, the searches and the JS answers to
// spike/output/search/ so bench.py can time the laptop options on the same data and check it ranks the same.
//   node spike/search/bench.mjs              (V8 with its JIT: an upper bound on speed)
//   node --jitless spike/search/bench.mjs    (no JIT, like Hermes on the phone: the honest phone estimate)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fakeLibrary, fakeSearches } from './fake.mjs';
import { buildIndex, search } from './rank.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../output/search');
mkdirSync(out, { recursive: true });
const jitless = process.execArgv.includes('--jitless');

const tags = fakeLibrary();
const searches = fakeSearches(tags);
const json = JSON.stringify(tags);
const ms = (t) => Number(process.hrtime.bigint() - t) / 1e6;
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

globalThis.gc?.();
const heapBefore = process.memoryUsage().heapUsed;
let t = process.hrtime.bigint();
const parsed = JSON.parse(json);
const parseMs = ms(t);
t = process.hrtime.bigint();
const index = buildIndex(parsed);
const buildMs = ms(t);
globalThis.gc?.();
const heapMb = (process.memoryUsage().heapUsed - heapBefore) / 1e6;

for (const q of searches.slice(0, 20)) search(index, q); // warm up, as a phone would after the first search
const times = [];
const answers = {};
for (const q of searches) {
  t = process.hrtime.bigint();
  const got = search(index, q);
  times.push(ms(t));
  answers[q] = got.map((r) => r.tag.id);
}
times.sort((a, b) => a - b);

const result = {
  engine: jitless ? 'node --jitless (no JIT, Hermes-like)' : 'node (V8 JIT)',
  tags: tags.length,
  songs: new Set(tags.map((x) => x.song_id)).size,
  searches: searches.length,
  file_mb: +(Buffer.byteLength(json) / 1e6).toFixed(2),
  parse_ms: +parseMs.toFixed(1),
  build_ms: +buildMs.toFixed(1),
  memory_mb: +heapMb.toFixed(1),
  search_median_ms: +pct(times, 50).toFixed(2),
  search_p95_ms: +pct(times, 95).toFixed(2),
  search_max_ms: +times[times.length - 1].toFixed(2),
};
console.log(JSON.stringify(result, null, 2));
writeFileSync(join(out, 'fake-tags.json'), json);
writeFileSync(join(out, 'searches.json'), JSON.stringify(searches));
writeFileSync(join(out, 'answers-js.json'), JSON.stringify(answers));
writeFileSync(join(out, jitless ? 'bench-js-jitless.json' : 'bench-js.json'), JSON.stringify(result, null, 2));
