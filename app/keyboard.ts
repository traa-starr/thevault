// How much of the screen's bottom the keyboard covers right now (0: it's down), so a list can end above it.
import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    // "will": the list makes room while the keyboard slides, not after it has landed
    const up = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates?.height ?? 0));
    const down = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      up.remove();
      down.remove();
    };
  }, []);
  return height;
}
