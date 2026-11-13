// The laptop desk's shots (calm part 1): opens a desk page at the URL given and saves PNGs to spike/output/shots/.
// Run by server/desk_shots.py, which serves a made-up library (never the real one). Laptop only.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'spike/output/shots');
mkdirSync(out, { recursive: true });
const url = process.argv[2];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
await page.goto(url);
await page.waitForSelector('.row');
await page.screenshot({ path: join(out, 'desk.png') });
await page.fill('#search', 'harbor');
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, 'desk-searched.png') });
await page.selectOption('#folder', 'Other Artist B'); // a folder that has harbor songs in the made-up library
await page.waitForTimeout(200);
await page.screenshot({ path: join(out, 'desk-filtered.png') });
await page.fill('#search', '');
await page.selectOption('#folder', '');
await page.click('.row button:has-text("Restore")');
await page.waitForSelector('text=In Library');
await page.screenshot({ path: join(out, 'desk-restored.png') });
await browser.close();
console.log(problems.length ? `page errors: ${problems.join(' | ')}` : 'desk shots: 4 drawn, no page errors');
process.exit(problems.length ? 1 : 0);
