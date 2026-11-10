// The app's new screens next to the mockups they were built from (NEXT 2026-11-10 "Done when" C, D): one PNG per pair,
// mockup on the left, the real app code on the right. Laptop only, fake songs only.
// Run after the shots:  npm --prefix tools/shots run shots && npm --prefix tools/shots run side
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = join(repo, 'spike/output/shots');
const mock = (name) => pathToFileURL(join(repo, 'spike/mockups', name)).href;

// each pair: the mockup page, the taps that bring it to the same state, and the app's shot of that state
const PAIRS = [
  { name: 'side-home', page: 'wall.html', steps: ["act('play', { id: 0 })", "act('close')"], app: 'home-mini-player' },
  { name: 'side-library', page: 'wall.html', steps: ["act('play', { id: 0 })", "act('close')", "act('tab', { tab: 'library' })"], app: 'library-all-mini-player' },
  { name: 'side-library-chip', page: 'wall.html', steps: ["act('tab', { tab: 'library' })", "act('filter', { f: 'fire' })"], app: 'library-chip-favorites' },
  { name: 'side-search-empty', page: 'wall.html', steps: ["act('tab', { tab: 'search' })"], app: 'search-empty-recents' },
  { name: 'side-search-results', page: 'wall.html', steps: ["act('tab', { tab: 'search' })", "act('q', { q: 'beat' })"], app: 'search-results-mini-player' },
  { name: 'side-player', page: 'deal.html', steps: ["act('play', { id: 0 })"], app: 'player-art-dark' },
  { name: 'side-player-lines', page: 'deal.html', steps: ["act('play', { id: 0 })", "act('tags')"], app: 'player-30-tags' },
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
let bad = 0;
for (const pair of PAIRS) {
  const appShot = join(out, `${pair.app}.png`);
  if (!existsSync(appShot)) {
    console.log(`ERR  ${pair.name}: no ${pair.app}.png yet (run the shots first)`);
    bad++;
    continue;
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('vault-mock-seen', '1'); // past the mockup's first-run note
    } catch {}
  });
  await page.goto(mock(pair.page));
  for (const step of pair.steps) {
    await page.evaluate(step);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(450);
  const mockShot = (await page.screenshot()).toString('base64');
  await page.close();
  const both = await browser.newPage({ viewport: { width: 820, height: 890 }, deviceScaleFactor: 1 });
  await both.setContent(`<body style="margin:0;background:#222;color:#ddd;font:14px system-ui;display:flex;gap:20px;padding:10px">
    <div><div style="height:26px">Mockup (${pair.page})</div><img width="390" src="data:image/png;base64,${mockShot}"></div>
    <div><div style="height:26px">The app (${pair.app})</div><img width="390" src="data:image/png;base64,${readFileSync(appShot).toString('base64')}"></div></body>`);
  await both.screenshot({ path: join(out, `${pair.name}.png`) });
  await both.close();
  console.log(`ok   ${pair.name}`);
}
await browser.close();
process.exit(bad ? 1 : 0);
