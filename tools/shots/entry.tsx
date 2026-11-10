// What the headless browser loads: one app screen, drawn by the real components with fake stores (see fakes/).
// The fixture (window.FIX) is set before this runs. Steps in the fixture call window.app after the first draw.
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import App from '../../app/App';
import { PlayerSheet } from '../../app/Player';
import * as nav from '../../app/nav';
import * as versions from './fakes/others';
import Library from '../../app/Library';
import Sort from '../../app/Sort';
import * as tagStore from '../../app/tagStore';
import * as Tagging from '../../app/Tagging';
import { player } from './fakes/playerStore';
import { session } from '../../app/sessionStore';
import { ratingStore } from '../../app/ratingStore';
import { setKeyboard } from './fakes/keyboard';

const FIX = (globalThis as any).FIX;

// the laptop, answered from the fixture (its tags are the ones in the phone's tag file unless the fixture says otherwise)
(globalThis as any).fetch = async (url: string) => {
  const path = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const body = path === '/songs' ? { songs: FIX.songs ?? [] } : path === '/tags' ? { tags: FIX.tags ?? JSON.parse(FIX.files?.['tags.json'] ?? '[]') } : (FIX.routes?.[path] ?? {});
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
};

function Screen() {
  // the whole app: Home, with Library, Sort, the bar and the player sheet as the phone layers them
  if (FIX.screen === 'app') return <App />;
  if (FIX.screen === 'library') return <Library url="http://laptop" />;
  if (FIX.screen === 'sort') return <Sort url="http://laptop" onBack={() => {}} />;
  // the player on its own: the real sheet, open, over an empty screen
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <PlayerSheet />
    </View>
  );
}

(globalThis as any).app = { ...tagStore, ...Tagging, ...nav, player, session, ratingStore, versions };
// taps the first thing on screen with exactly this text (a chip, a word button)
(globalThis as any).app.tapText = (text: string) => {
  // only what's showing: Home and Library are both in the page, one of them hidden
  const el = [...document.querySelectorAll('[tabindex] *, [tabindex]')].find((one) => one.textContent === text && !one.children.length && (one as HTMLElement).offsetParent !== null) as HTMLElement | undefined;
  el?.click();
};
// type into the first text field, as a thumb would (react-native-web draws it as an <input>)
(globalThis as any).app.type = (text: string) => {
  const input = document.querySelector('input') as HTMLInputElement;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  set.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
// the iPhone keyboard's height drawn over the bottom of the screen, to see what it covers
(globalThis as any).app.keyboard = () => {
  const k = document.createElement('div');
  k.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:336px;background:#3a3a3c;color:#999;font:15px sans-serif;display:flex;align-items:center;justify-content:center;z-index:99';
  k.textContent = 'keyboard';
  document.body.appendChild(k);
  setKeyboard(336); // the app hears the keyboard come up, as on the phone
};
// A thumb's fastest flick through the list on screen, then a slow walk: every row number must always show the same
// song, the screen must be full of rows once it settles, and every row from the first to the last must turn up.
(globalThis as any).app.scrollCheck = async (count: number) => {
  const wait = (ms: number) => new Promise((done) => requestAnimationFrame(() => setTimeout(done, ms)));
  const list = [...document.querySelectorAll('div')].find((el) => el.offsetParent !== null && el.scrollHeight > el.clientHeight + 2000 && el.querySelector('[data-testid="song-row"]')) as HTMLElement | undefined;
  if (!list) return { problems: ['no long list on screen'], note: '' };
  const titleAt = new Map<number, string>();
  const problems: string[] = [];
  const look = (must: boolean) => {
    const box = list.getBoundingClientRect();
    const rows = ([...list.querySelectorAll('[data-testid="song-row"]')] as HTMLElement[])
      .map((row) => ({ row, r: row.getBoundingClientRect() }))
      .filter(({ r }) => r.bottom > box.top + 1 && r.top < box.bottom - 1)
      .sort((a, b) => a.r.top - b.r.top);
    for (const { row, r } of rows) {
      const at = (r.top - box.top + list.scrollTop) / 60;
      const index = Math.round(at);
      const title = row.querySelector('[data-testid="song-title"]')?.textContent ?? '';
      if (Math.abs(at - index) > 0.02 || Math.round(r.height) !== 60) problems.push(`row ${index} sits at ${at.toFixed(2)} rows, ${Math.round(r.height)} high`);
      if (!title) problems.push(`row ${index} is blank`);
      if (titleAt.has(index) && titleAt.get(index) !== title) problems.push(`row ${index} changed song`);
      titleAt.set(index, title);
    }
    const covered = rows.length && rows[0].r.top <= box.top + 1 && rows[rows.length - 1].r.bottom >= Math.min(box.bottom, box.top + list.scrollHeight - list.scrollTop) - 1 && rows.every((one, i) => !i || Math.abs(one.r.top - rows[i - 1].r.bottom) < 1.5);
    if (must && !covered) problems.push(`rows missing on screen at ${Math.round(list.scrollTop)}`);
    return covered;
  };
  const end = list.scrollHeight - list.clientHeight;
  // the flick: thousands of points a frame. A blank moment mid-flick is counted; it must fill once the list rests
  let blank = 0;
  let jumps = 0;
  for (let at = 0; at < end; at += 4200) {
    list.scrollTop = at;
    await wait(0);
    if (!look(false)) blank++;
    jumps++;
  }
  list.scrollTop = end;
  for (let tries = 0; tries < 40 && !look(false); tries++) await wait(25);
  look(true);
  for (let at = 0; at <= end + 480; at += 480) {
    list.scrollTop = Math.min(at, end);
    for (let tries = 0; tries < 40 && !look(false); tries++) await wait(25);
    look(true);
  }
  const met = [...titleAt.keys()].sort((a, b) => a - b);
  if (met.length !== count || met[0] !== 0 || met[met.length - 1] !== count - 1) problems.push(`${met.length} of ${count} rows turned up`);
  if (new Set(titleAt.values()).size !== titleAt.size) problems.push('a song showed on two rows');
  list.scrollTop = Math.round(end / 2 / 60) * 60;
  await wait(200);
  return { problems: problems.slice(0, 5), note: `flick: ${jumps} jumps, ${blank} caught mid-fill; walk: ${met.length} of ${count} rows met, each one song, each 60 high` };
};
createRoot(document.getElementById('root')!).render(
  <View style={{ height: '100vh' as any, backgroundColor: '#000' }}>
    <Screen />
  </View>,
);
(globalThis as any).READY = true;
