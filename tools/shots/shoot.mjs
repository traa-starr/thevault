// Code's eyes: draws the app's screens at iPhone size with fake data and saves a PNG of each to spike/output/shots/.
// Laptop only, its own packages: nothing here ships to the phone.
// Run: npm --prefix tools/shots run shots            (every screen)
//      npm --prefix tools/shots run shots -- player  (only screens whose name has "player")
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fixtures } from './fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = join(repo, 'spike/output/shots');
const fake = (name) => join(here, 'fakes', name);
const PACKAGES = {
  'expo-file-system': fake('expo-file-system.ts'),
  'react-native-gesture-handler': fake('gesture.tsx'),
  'react-native-reorderable-list': fake('gesture.tsx'),
};
for (const name of ['expo-audio', 'expo-haptics', 'expo-secure-store', 'expo-updates', 'expo-status-bar', 'react-native-reanimated', 'react-native-worklets'])
  PACKAGES[name] = fake('misc.ts');
// the app's own modules that touch sound, files or the network
const LOCAL = {
  playerStore: fake('playerStore.ts'),
  outbox: fake('outbox.ts'),
  ...Object.fromEntries(['compareStore', 'Compare', 'Versions', 'Hidden', 'versionStore', 'offline', 'phoneBackup'].map((n) => [n, fake('others.tsx')])),
};

const swap = {
  name: 'swap',
  setup(b) {
    b.onResolve({ filter: /^react-native$/ }, () => ({ path: join(here, 'node_modules/react-native-web/dist/index.js') }));
    // one React for everyone: the app's
    b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => b.resolve('./' + a.path.replace(/^react/, 'react'), { resolveDir: join(repo, 'app/node_modules'), kind: a.kind }));
    b.onResolve({ filter: /.*/ }, (a) => {
      if (PACKAGES[a.path]) return { path: PACKAGES[a.path] };
      const m = /^\.\/(\w+)$/.exec(a.path);
      if (m && LOCAL[m[1]] && a.resolveDir === join(repo, 'app')) return { path: LOCAL[m[1]] };
      return undefined;
    });
  },
};

mkdirSync(out, { recursive: true });
await build({
  entryPoints: [join(here, 'entry.tsx')],
  bundle: true,
  outfile: join(out, 'bundle.js'),
  jsx: 'automatic',
  format: 'iife',
  define: { __DEV__: 'true', 'process.env.NODE_ENV': '"development"', global: 'window' },
  loader: { '.png': 'empty', '.ttf': 'empty' },
  logLevel: 'warning',
  plugins: [swap],
});
writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body,#root{margin:0;height:100%;background:#111;
  font-family:-apple-system,"SF Pro Text","Segoe UI",system-ui,sans-serif}</style></head>
  <body><div id="root"></div><script src="bundle.js"></script></body></html>`,
);

const only = process.argv[2];
const chosen = fixtures.filter((f) => !only || f.name.includes(only));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let bad = 0;
const boxes = {};
for (const f of chosen) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript((fix) => (window.FIX = fix), { name: f.name, ...f.fix });
  await page.goto(pathToFileURL(join(out, 'index.html')).href);
  await page.waitForFunction(() => window.READY);
  await page.waitForTimeout(150);
  for (const step of f.steps ?? []) {
    await page.evaluate(step);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(f.steps?.length > 2 ? 450 : 250); // a sheet that slid up has landed
  // `drag: [x, fromY, toY]`: a finger pulls from one spot to another and holds there, so the shot is mid-gesture
  if (f.drag) {
    const [x, from, to] = f.drag;
    await page.mouse.move(x, from);
    await page.mouse.down();
    await page.mouse.move(x, to, { steps: 8 });
    await page.waitForTimeout(80);
  }
  const file = join(out, `${f.name}.png`);
  await page.screenshot({ path: file });
  // where every button sits, so a pair of shots (`same`) can prove nothing moved when info arrived
  boxes[f.name] = await page.evaluate(() =>
    [...document.querySelectorAll('[tabindex]')].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }));
  if (f.same) {
    const was = boxes[f.same];
    const moved = !was ? ['the shot to compare with was not drawn'] : boxes[f.name].length !== was.length ? [`${was.length} buttons became ${boxes[f.name].length}`]
      : boxes[f.name].flatMap((box, i) => (box === was[i] ? [] : [`button ${i + 1}: ${was[i]} became ${box}`]));
    if (moved.length) errors.push(`moved since ${f.same}: ${moved.slice(0, 3).join('; ')}`);
    else console.log(`     same boxes as ${f.same} (${was.length} buttons)`);
  }
  const real = errors.filter((e) => !/Warning:|is deprecated|findDOMNode|pointerEvents|shadow\*/.test(e));
  if (real.length) bad++;
  console.log(`${real.length ? 'ERR ' : 'ok  '} ${f.name}${real.length ? `\n     ${real.slice(0, 3).join('\n     ')}` : ''}`);
  await page.close();
}
await browser.close();
rmSync(join(out, 'bundle.js.map'), { force: true });
console.log(`${chosen.length - bad} of ${chosen.length} screens drawn without errors. PNGs in spike/output/shots/`);
process.exit(bad ? 1 : 0);
