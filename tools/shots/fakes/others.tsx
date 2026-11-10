// compareStore, Compare, Versions, Hidden, versionStore, offline, phoneBackup: just enough for the screens to draw.
// Compare's wheel and the Versions sheets are the app's real ones, drawn over these fake stores.
import { FIX, noop, notify, useFix } from './store';

// compareStore: `compare: { ids, at }` in the fixture opens Compare on those versions, row `at` sounding
const on = FIX.compare ?? null;
const cmp = {
  open: !!on, preparing: false, ids: on?.ids ?? [], at: on?.at ?? 0,
  sound: { time: 62, duration: 214, sounding: on ? on.ids[on.at ?? 0] : null, playing: !!on, pending: null },
};
export const compare = noop({ busy: () => cmp.open, refusal: () => null, notReady: () => false });
export const useCompare = () => cmp;
// Compare, Versions: the real components
export { CompareDial, WHEEL_ROW, WHEEL_WIDTH } from '../../../app/Compare';
export { startLink, VersionsChip, VersionsLayer, VersionsToast } from '../../../app/Versions';
// Hidden
export default function Hidden() {
  return null;
}
// versionStore
export type LibSong = any;
export type Sent = any;
// `versions: { s1: 3 }` in the fixture: s1 is the Main of a family of 3 (s1, s1-1, s1-2)
const family = (main: string) => Array.from({ length: FIX.versions?.[main] ?? 1 }, (_, i) => (i ? `${main}-${i}` : main));
const families = new Map<string, string>(Object.keys(FIX.versions ?? {}).flatMap((main) => family(main).map((id): [string, string] => [id, main])));
let versions: any = { families, picks: new Set<string>(FIX.picked ?? []), songs: FIX.songs ?? null, picker: null, versionsOf: null, toast: null };
const setVersions = (next: any) => {
  versions = { ...versions, ...next };
  notify();
};
export const useVersions = () => useFix(() => versions);
export const members = (id: string) => family(families.get(id) ?? id);
export const songTitle = (id: string) => FIX.titles?.[id] ?? (FIX.songs ?? []).find((song: any) => song.id === id)?.title ?? id;
export const openVersions = (id: string | null) => setVersions({ versionsOf: id });
export const openPicker = (picker: any) => setVersions({ picker });
export const closePicker = () => setVersions({ picker: null });
export const setLibrary = () => {};
export const groupMainOf = () => null;
export const showToast = () => {};
export const undo = () => {};
export const group = () => null;
export const ensureLibrary = () => {};
export const isPicked = (id: string) => versions.picks.has(id);
export const isVersion = () => false;
export const removeEditFor = () => null;
export const sendEdit = () => null;
// offline
const off = { reachable: !FIX.laptopOff, stored: 0, wanted: 0, bytes: 0, saving: false, full: null, left: 0 };
export const useOffline = () => off;
export const offline = noop({ has: (id: string) => (FIX.onPhone ?? []).includes(id) });
export const loadSongList = () => (FIX.songs ? { songs: FIX.songs, asked: 0 } : null);
export const saveSongList = () => {};
// phoneBackup
export const phoneBackup = noop();
export const usePhoneBackup = () => ({ outOfDate: false, saveFailed: false, waiting: 0, restored: 0 });
export const survivalStamp = () => '2026-11-01';
