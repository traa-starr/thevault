// expo-audio, expo-haptics, expo-updates, reanimated, worklets: nothing happens on the laptop.
import { noop } from './store';

export default noop();
export const impactAsync = async () => {};
export const ImpactFeedbackStyle = { Light: 0, Medium: 1, Heavy: 2 };
export const runOnJS = (f: any) => f;
export const createAudioPlayer = () => noop();
export const setAudioModeAsync = async () => {};
export const useAudioPlayer = () => noop();
export const checkForUpdateAsync = async () => ({ isAvailable: false });
export const fetchUpdateAsync = async () => ({});
export const reloadAsync = async () => {};
export const updateId = null;
export const isEnabled = false;
export const isEmbeddedLaunch = true;
export const createdAt = null;
export const useUpdates = () => ({ isUpdatePending: false });
export const setUpdateURLAndRequestHeadersOverride = () => {};
export const StatusBar = () => null;
export const selectionAsync = async () => {};
// expo-secure-store (the Keychain): empty here, so the app falls back to its address file
export const getItem = () => null;
export const setItem = () => {};
