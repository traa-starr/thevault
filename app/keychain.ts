// The iPhone's Keychain: a small safe that outlives the app, so a reinstall (SideStore, a new build) can find what the
// app knew before (NEXT 2026-11-09 F: the laptop address). Never in the repo, never off the phone.
// The Keychain piece is native: it's only in builds from 2026-11-10 on. In an older build every call here quietly does
// nothing, so the same app code runs on both (it reaches the phone by publish before the rebuild does).

type Store = {
  getItem(key: string, options?: { keychainAccessible?: number }): string | null;
  setItem(key: string, value: string, options?: { keychainAccessible?: number }): void;
  AFTER_FIRST_UNLOCK?: number;
};

let store: Store | null | undefined;
const open = (): Store | null => {
  if (store !== undefined) return store;
  try {
    // asked for only here, inside the try: in a build without the piece this throws, and nothing else may
    store = require('expo-secure-store') as Store;
  } catch {
    store = null;
  }
  return store;
};

export const keychain = {
  read(key: string): string {
    try {
      return open()?.getItem(key)?.trim() ?? '';
    } catch {
      return '';
    }
  },
  /** Keeps `value` under `key`; writes only when it changed. */
  keep(key: string, value: string) {
    try {
      const kept = open();
      if (!kept || kept.getItem(key) === value) return;
      // readable after the first unlock since the phone was turned on, so a locked phone can still start the app's work
      kept.setItem(key, value, kept.AFTER_FIRST_UNLOCK === undefined ? undefined : { keychainAccessible: kept.AFTER_FIRST_UNLOCK });
    } catch {
      // no Keychain today: the address file still holds it
    }
  },
};
