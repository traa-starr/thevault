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

const FIX = (globalThis as any).FIX;

// the laptop, answered from the fixture
(globalThis as any).fetch = async (url: string) => {
  const path = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const body = path === '/songs' ? { songs: FIX.songs ?? [] } : path === '/tags' ? { tags: FIX.tags ?? [] } : (FIX.routes?.[path] ?? {});
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
  const el = [...document.querySelectorAll('[tabindex] *, [tabindex]')].find((one) => one.textContent === text && !one.children.length) as HTMLElement | undefined;
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
};
createRoot(document.getElementById('root')!).render(
  <View style={{ height: '100vh' as any, backgroundColor: '#000' }}>
    <Screen />
  </View>,
);
(globalThis as any).READY = true;
