// The keyboard's height as the fixture says: `app.keyboard()` in a step brings it up (entry.tsx).
import { notify, useFix } from './store';

let height = 0;
export const setKeyboard = (next: number) => {
  height = next;
  notify();
};
export const useKeyboardHeight = () => useFix(() => height);
