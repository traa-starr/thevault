// Smoke check for the world mockup: taps through every screen, screenshots each, fails on script errors or any
// visible control under 44 px, then survives 150 random taps.
// Run: node spike/mockups/world/check.mjs   (first time: npm --prefix tools/shots install)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(resolve(here, '../../../tools/shots/package.json'))('playwright-core');
const out = resolve(here, '../../output/mockups/world');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [], small = new Set(), shots = [], missed = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
process.on('exit', () => errors.length && console.log('page errors:', [...new Set(errors)].slice(0, 6)));
await page.goto(pathToFileURL(join(here, 'app.html')).href);

const measure = async () => {
  for (const s of await page.locator('[data-act]:visible, input:visible').evaluateAll((els) => els.map((e) => ({ r: e.getBoundingClientRect(), a: e.dataset.act || e.id })).filter((x) => x.r.width && (x.r.width < 43.5 || x.r.height < 43.5)).map((x) => `${x.a} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`))) small.add(s);
};
const shot = async (name) => { await page.waitForTimeout(350); await measure(); await page.screenshot({ path: join(out, `${name}.png`) }); shots.push(name); };
const tap = async (sel, text) => {
  let el = page.locator(sel); if (text) el = el.filter({ hasText: text });
  el = el.first();
  if (!(await el.count()) || !(await el.isVisible())) { missed.push(sel + (text ? ` "${text}"` : '')); return false; }
  await el.click({ timeout: 2000 }).catch((e) => errors.push(`tap ${sel}: ${e.message.split('\n')[0]}`));
  await page.waitForTimeout(300); return true;
};
const hold = async (sel, text) => {
  let el = page.locator(sel); if (text) el = el.filter({ hasText: text });
  await el.first().scrollIntoViewIfNeeded(); const b = await el.first().boundingBox(); if (!b) { missed.push('hold ' + sel); return; }
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); await page.waitForTimeout(300);
};
const drag = async (x0, y0, x1, y1) => { await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(350); };
const outside = () => page.mouse.click(195, 40).then(() => page.waitForTimeout(300));

await shot('home');
await tap('[data-act=menu][data-m=home]'); await shot('home-menu'); await tap('[data-act=closemenu]');
await hold('[data-act=shuffle]'); await shot('shuffle-pool'); await tap('[data-act=pool][data-p=Mine]'); await shot('home-mini');
await tap('[data-act=rowhead][data-c=Favorites]'); await shot('library-favorites'); await tap('[data-act=chip][data-c=All]');
await hold('[data-act=play]', 'Rooftop'); await shot('library-hold-sheet'); await outside();
await tap('[data-act=menu][data-m=lib]'); await shot('library-menu'); await tap('[data-act=order]'); await shot('library-order'); await outside();
await tap('[data-act=menu][data-m=lib]'); await tap('[data-act=select]'); await tap('[data-act=play]', 'Rooftop'); await tap('[data-act=play]', 'Paper Crown'); await shot('library-select'); await tap('[data-act=selcancel]');

// player on a song with 3 versions
await tap('[data-act=play]', 'Cold Cuts v2'); await shot('library-playing'); await shot('player');
await tap('[data-act=dot]'); await shot('player-dot'); await tap('[data-act=lines]'); await shot('player-lines'); await tap('[data-act=lines]');
await tap('[data-act=tag]'); await shot('player-tag'); await page.locator('#tagin').fill('new made-up line').catch(() => {}); await tap('[data-act=later]'); await tap('[data-act=tagsave]');
await tap('[data-act=compare]'); await tap('[data-act=cmpv]', 'C'); await shot('player-compare'); await tap('[data-act=cmpdone]');
await tap('[data-act=psheet]'); await shot('song-sheet-family'); await tap('[data-act=sver]'); await shot('versions-page');
await hold('[data-act=vplay]', 'Cold Cuts v3'); await shot('versions-hold-menu'); await tap('.vmenu [data-act=vmcancel]'); await tap('[data-act=sback]'); await outside();
await tap('[data-act=closeplayer]');

// player on an unsorted song, add-as-version, undo
await tap('[data-act=play]', 'Burner Phone'); await shot('player-unsorted');
await tap('[data-act=psheet]'); await shot('song-sheet-unsorted'); await tap('[data-act=saddver]');
await page.locator('#aq').fill('cold').catch(() => {}); await shot('add-version-page'); await tap('[data-act=vlink]'); await shot('undo-toast'); await tap('[data-act=undo]');
await drag(195, 300, 195, 130); await shot('queue'); await tap('[data-act=qshuf]'); await tap('[data-act=qshuf]'); await tap('[data-act=qshuf]');
await hold('[data-act=qjump]', 'Cold Cuts'); await shot('queue-lift'); await tap('[data-act=qjump]', 'Paper Crown'); await tap('[data-act=qback]');
await drag(195, 24, 195, 400); await shot('mini');
await tap('[data-act=pp]'); await tap('[data-act=next]');

// sort and cards
await tap('[data-act=tab][data-tab=home]'); await tap('[data-act=menu][data-m=home]'); await tap('[data-act=sort]'); await shot('sort');
await hold('[data-act=setopen]'); await shot('set-sheet'); await outside();
await tap('[data-act=setopen]'); await shot('cards');
await drag(195, 380, 340, 380); await shot('cards-swipe-undo'); await tap('[data-act=cbtn][data-v=n]');
await hold('#scard'); await shot('cards-sheet'); await outside();
for (let i = 0; i < 6 && !(await page.locator('[data-act=back]').count() && await page.getByText('All done').count()); i++) await tap('[data-act=cbtn][data-v=s]');
await shot('cards-done'); await tap('[data-act=back]'); await tap('[data-act=notsure]'); await shot('cards-not-sure'); await tap('[data-act=back]'); await tap('[data-act=back]');

// settings and hidden
await tap('[data-act=menu][data-m=home]'); await tap('[data-act=settings]'); await shot('settings'); await tap('[data-act=laptop]'); await shot('settings-edit'); await tap('[data-act=lsave]');
await tap('[data-act=log]'); await tap('[data-act=hidden]'); await tap('[data-act=hchip]', 'Phone'); await shot('hidden'); await tap('[data-act=restore]'); await shot('hidden-restored');
await tap('[data-act=back]'); await tap('[data-act=back]');

// search
await tap('#searchtab'); await shot('search'); await page.locator('#q').fill('rain').catch(() => {}); await shot('search-results');
await hold('[data-act=play]'); await shot('search-sheet'); await outside(); await tap('[data-act=play]'); await shot('search-player'); await tap('[data-act=closeplayer]'); await tap('[data-act=scancel]'); await shot('after-search');

// the crawl: 150 random taps on whatever is showing
let seed = 11;
for (let i = 0; i < 150; i++) {
  await measure();
  const els = page.locator('[data-act]:visible'), n = await els.count(); if (!n) break;
  seed = (seed * 1664525 + 1013904223) >>> 0;
  await els.nth(seed % n).click({ timeout: 1000, force: true }).catch(() => {});
  await page.waitForTimeout(50);
}
await shot('after-crawl');
const alive = await page.locator('#screen').count();
const bad = errors.length + small.size + (alive ? 0 : 1) + missed.length;
console.log(`${bad ? 'FAIL' : 'ok  '} world: ${errors.length} script errors, ${small.size} controls under 44 px, ${missed.length} missed taps`);
for (const e of [...new Set(errors)].slice(0, 8)) console.log(`     error: ${e}`);
for (const s of [...small].slice(0, 12)) console.log(`     small: ${s}`);
for (const m of missed) console.log(`     missed: ${m}`);
console.log(`shots (${shots.length}) in ${out}: ${shots.join(', ')}`);
await browser.close();
process.exit(bad ? 1 : 0);
