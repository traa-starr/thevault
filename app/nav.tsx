// Where I am in the app (overhaul wave 1): the two tabs, the search screen (wave 2), and Sort opened over Home. Kept here, outside the screens, so
// anything can move me (a tab, a link from the lock screen, the player's "+ Version") and nothing a tab does can touch
// the player: the player's own state lives in playerStore.
import { useSyncExternalStore } from 'react';
import { player } from './playerStore';
import type { Chip, SortBy } from './libraryCore';
import { samePlace, searchLeft, searchOpened, settingsClosed, settingsOpened, sortClosed, sortOpened, tabTapped, type Place, type Tab } from './sheetCore';

export type { Place, Tab };
let place: Place = { tab: 'home', sort: false };
const placeListeners = new Set<() => void>();
const setPlace = (next: Place) => {
  if (samePlace(next, place)) return;
  place = next;
  placeListeners.forEach((listener) => listener());
};
export const usePlace = () =>
  useSyncExternalStore(
    (listener) => {
      placeListeners.add(listener);
      return () => {
        placeListeners.delete(listener);
      };
    },
    () => place,
  );
export const placeNow = () => place;
/** A tab tapped. Leaves Sort if it was open. The player and the music are never touched. */
export const goTab = (tab: Tab) => setPlace(tabTapped(place, tab));
export const openSort = () => setPlace(sortOpened(place));
export const closeSort = () => setPlace(sortClosed(place));
/** Settings: Home's gear opens it, its Back closes it (a tab, Sort or search leaves it too). */
export const openSettings = () => setPlace(settingsOpened(place));
export const closeSettings = () => setPlace(settingsClosed(place));
const goHomeNow = () => goTab('home');
const goLibraryNow = () => goTab('library');

// Search asked for (the round button, Home's box, a lock-screen Shortcut's link): the search screen with the box
// ready to type in. `q`: words to fill the box with (a link may bring some).
let asked: { q: string } | null = null;
let cameFrom: Place | null = null;
const askListeners = new Set<() => void>();
const setAsked = (ask: { q: string } | null) => {
  asked = ask;
  askListeners.forEach((listener) => listener());
};
/** Straight to search: its own screen, the player sheet out of the way, the keyboard up. */
export const openSearch = (q: string) => {
  player.open('none');
  if (place.tab !== 'search') cameFrom = place;
  setAsked({ q });
  setPlace(searchOpened(place));
};
/** Search's Cancel: back to the tab I was on. */
export const closeSearch = () => setPlace(searchLeft(cameFrom));
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

// The chip and order Library should show: set by a "See all" on Home, held until Library takes it.
export type LibraryAsk = { chip: Chip; sort: SortBy };
let libraryAsk: LibraryAsk | null = null;
const libraryAskListeners = new Set<() => void>();
const setLibraryAsk = (ask: LibraryAsk | null) => {
  libraryAsk = ask;
  libraryAskListeners.forEach((listener) => listener());
};
/** Library on this chip, in this order. */
export const openLibrary = (ask: LibraryAsk) => {
  setLibraryAsk(ask);
  goLibraryNow();
};
export const takeLibraryAsk = () => {
  const ask = libraryAsk;
  if (ask) setLibraryAsk(null);
  return ask;
};
export const useLibraryAsk = () =>
  useSyncExternalStore(
    (listener) => {
      libraryAskListeners.add(listener);
      return () => {
        libraryAskListeners.delete(listener);
      };
    },
    () => libraryAsk,
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
