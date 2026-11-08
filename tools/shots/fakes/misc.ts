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
