// compareStore, Compare, Versions, Hidden, versionStore, offline, phoneBackup: just enough for the screens to draw.
import { Text } from 'react-native';
import { FIX, noop } from './store';

// compareStore
const cmp = { open: false, preparing: false, ids: [], sound: { time: 0, duration: 0, sounding: null, playing: false } };
export const compare = noop({ busy: () => false });
export const useCompare = () => cmp;
// Compare
export const WHEEL_WIDTH = 168;
export const WHEEL_ROW = 32;
export const CompareDial = () => null;
// Versions
export function VersionsChip({ id }: { id: string }) {
  const n = FIX.versions?.[id];
  return n ? <Text style={{ color: '#8ab4f8', fontSize: 15, padding: 8 }}>Versions · {n}</Text> : null;
}
export const VersionsToast = () => null;
export const VersionsLayer = () => null;
export const startLink = () => {};
// Hidden
export default function Hidden() {
  return null;
}
// versionStore
export type LibSong = any;
export type Sent = any;
const versions = { families: new Map<string, string>(), picks: new Set<string>(), songs: null, picker: null, versionsOf: null, toast: null };
export const useVersions = () => versions;
export const members = (id: string) => (FIX.versions?.[id] ? Array.from({ length: FIX.versions[id] }, (_, i) => `${id}-${i}`) : [id]);
export const songTitle = (id: string) => id;
export const setLibrary = () => {};
export const groupMainOf = () => null;
export const showToast = () => {};
export const undo = () => {};
export const group = () => null;
export const openVersions = () => {};
export const ensureLibrary = () => {};
export const isPicked = () => false;
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
