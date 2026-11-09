// Every button's pressed look (NEXT 2026-11-09 A): a short flash started at finger-down and run by the phone's
// animation thread, so it lets go about 100 ms later even while the app is busy loading a song. Timing: pressLook.ts.
// Buttons only: a row in a scrolling list keeps the plain tint, so scrolling past never flashes it.
import { useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { FLASH_CURVE, FLASH_TOTAL_MS } from './pressLook';

/** On a dark button: a light tint. */
const LIGHT = 'rgba(255,255,255,0.14)';
/** On a filled (white or blue) button: a dark tint. */
const DARK = 'rgba(0,0,0,0.22)';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  /** True on a filled button, so the flash darkens it instead of lightening it. */
  filled?: boolean;
  /** The flash's corner radius, to match the button's. */
  radius?: number;
  children?: ReactNode;
};

export function Tap({ style, filled = false, radius = 8, children, onPressIn, ...rest }: Props) {
  const ran = useRef(new Animated.Value(1)).current; // 1: at rest, not lit
  return (
    <Pressable
      {...rest}
      style={style}
      onPressIn={(e) => {
        // one animation, on the animation thread: nothing here waits for the tap's own work
        ran.setValue(0);
        Animated.timing(ran, { toValue: 1, duration: FLASH_TOTAL_MS, easing: Easing.linear, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: filled ? DARK : LIGHT, opacity: ran.interpolate(FLASH_CURVE) }]}
      />
      {children}
    </Pressable>
  );
}
