// Home from anywhere: every screen and the player sheet show the same Home link, top right, across from Back.
import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { player } from './playerStore';

let goHomeNow = () => {};
let goLibraryNow = () => {};
export const setHome = (go: () => void, library: () => void) => {
  goHomeNow = go;
  goLibraryNow = library;
};

// Search asked for from outside the app (a lock-screen Shortcut's link): Library opens with the box ready to type in.
let asked: { q: string } | null = null;
const askListeners = new Set<() => void>();
const setAsked = (ask: { q: string } | null) => {
  asked = ask;
  askListeners.forEach((listener) => listener());
};
/** Straight to search: Library, the player sheet out of the way, the keyboard up. */
export const openSearch = (q: string) => {
  player.open('none');
  setAsked({ q });
  goLibraryNow();
};
export const takeSearchAsk = () => {
  const ask = asked;
  if (ask) setAsked(null);
  return ask;
};
export const useSearchAsk = () =>
  useSyncExternalStore(
    (listener) => {
      askListeners.add(listener);
      return () => {
        askListeners.delete(listener);
      };
    },
    () => asked,
  );

// The song Library should open select mode with, ticked: set by the full player's "+ Version".
let seed: string | null = null;
const seedListeners = new Set<() => void>();
const setSeed = (id: string | null) => {
  seed = id;
  seedListeners.forEach((listener) => listener());
};
/** Library in select mode with this song ticked. */
export const openLibrarySelect = (id: string) => {
  setSeed(id);
  goLibraryNow();
};
export const takeSeed = () => {
  const id = seed;
  if (id) setSeed(null);
  return id;
};
export const useSeed = () =>
  useSyncExternalStore(
    (listener) => {
      seedListeners.add(listener);
      return () => {
        seedListeners.delete(listener);
      };
    },
    () => seed,
  );

/** Closes the player sheet and any screen, back to the home screen. The music keeps playing. */
export const goHome = () => {
  player.open('none');
  goHomeNow();
};

export function HomeButton() {
  return (
    <Pressable onPress={goHome} hitSlop={8} style={s.home} accessibilityLabel="Home">
      <Text style={s.text}>Home</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  home: { marginLeft: 'auto' },
  text: { color: '#8ab4f8', fontSize: 15, padding: 8 },
});
