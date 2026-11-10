// Smoke check for the overhaul mockups: opens each direction in a phone-sized browser, taps every control it can find
// for a while, and fails on any script error or any control under 44 pt. Screenshots go to spike/output/mockups/.
// Run: node spike/mockups/check.mjs   (uses the browser kit in tools/shots; first time: npm --prefix tools/shots install)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, '../../tools/shots/package.json'));
const { chromium } = require('playwright-core');
const out = resolve(here, '../output/mockups');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
let bad = 0;
for (const dir of ['wall', 'line', 'deal']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(pathToFileURL(join(here, `${dir}.html`)).href);
  const shot = (name) => page.screenshot({ path: join(out, `${dir}-${name}.png`) });
  const tap = async (sel) => {
    const el = page.locator(sel).first();
    if (!(await el.count()) || !(await el.isVisible())) return false;
    await el.click({ timeout: 2000 }).catch((e) => errors.push(`tap ${sel}: ${e.message.split('\n')[0]}`));
    await page.waitForTimeout(350);
    return true;
  };
  await shot('0-first');
  await tap('[data-act=first]');
  await shot('1-home');
  await tap('[data-act=tab][data-tab=library]');
  await shot('2-library');
  await tap('#screen [data-act=play]'); // a row: the song starts and the player opens
  await shot('3-player');
  for (const over of await page.locator('#sheet [data-act=over]').evaluateAll((els) => els.map((e) => e.dataset.over))) {
    await tap(`#sheet [data-act=over][data-over=${over}]`);
    await shot(`4-over-${over}`);
    await page.evaluate(() => act('closeover'));
    await page.waitForTimeout(350);
  }
  await page.evaluate(() => act('close')); // on the phone: a pull down on the handle
  await page.waitForTimeout(400);
  await shot('5-mini');
  await tap('#searchtab');
  await page.locator('#q').fill('hook').catch(() => {});
  await page.waitForTimeout(300);
  await shot('6-search');
  await tap('[data-act=tab][data-tab=home]');

  // tap sizes: every control on Home, Library, Search and the player
  const small = new Set();
  const measure = async () => {
    for (const s of await page.locator('[data-act]:visible').evaluateAll((els) =>
      els.map((e) => ({ r: e.getBoundingClientRect(), a: e.dataset.act, t: e.tagName })).filter((x) => x.t !== 'INPUT' && x.r.width && (x.r.width < 43.5 || x.r.height < 43.5)).map((x) => `${x.a} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`))) small.add(s);
  };
  // the crawl: 150 taps on whatever is showing, in a fixed order
  let seed = 11;
  for (let i = 0; i < 150; i++) {
    await measure();
    const els = page.locator('[data-act]:visible');
    const count = await els.count();
    if (!count) break;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    await els.nth(seed % count).click({ timeout: 1000, force: true }).catch(() => {});
    await page.waitForTimeout(60);
  }
  await shot('9-after-crawl');
  const alive = await page.locator('#screen').count();
  console.log(`${errors.length || small.size || !alive ? 'FAIL' : 'ok  '} ${dir}: ${errors.length} script errors, ${small.size} controls under 44 pt`);
  for (const e of [...new Set(errors)].slice(0, 8)) console.log(`     error: ${e}`);
  for (const s of [...small].slice(0, 12)) console.log(`     small: ${s}`);
  bad += errors.length + small.size + (alive ? 0 : 1);
  await page.close();
}
await browser.close();
console.log(bad ? '\nMockups: FAIL' : `\nMockups: all three directions open and survive 150 taps each. Screenshots in ${out}`);
process.exit(bad ? 1 : 0);
