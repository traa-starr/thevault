// The half sheet's frame, shared by the song sheet, its small menus and its pages (Versions, Add as a version of…;
// world map goal 4). The app draws it over every screen and the player, never an iOS pop-up sheet: the dimmed screen
// behind (a tap closes), the grab mark, and a pull down that closes the whole sheet to where it opened.
import { useRef, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useKeyboardHeight } from './keyboard';
import { ROW_HEIGHT, tint } from './Tagging';
import { C, R, S, T } from './theme';

const PULL_CLOSES = 60; // a pull down this far closes it, like a tap outside

// Back on a page: the song sheet it was opened from. Set by the song sheet when one of its rows opens a page; a page
// opened any other way has none, and its Back closes it.
let back: (() => void) | null = null;
export const setBack = (fn: (() => void) | null) => {
  back = fn;
};
/** Takes the way back (once): the page closes itself, then calls what this returns, if anything. */
export const pageBack = () => {
  const fn = back;
  back = null;
  return fn;
};

type Props = {
  children: ReactNode;
  /** A tap on the dimmed screen, the pull down and Cancel. */
  onClose: () => void;
  /** The Cancel row at the bottom. Pages have Back at the top instead. */
  cancel?: boolean;
  /** A page's own height (the picker's list): the sheet keeps it, rising above the keyboard. */
  style?: ViewStyle;
};

export function SheetFrame({ children, onClose, cancel = true, style }: Props) {
  const close = useRef(onClose);
  close.current = onClose;
  const keyboard = useKeyboardHeight();
  const pull = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > PULL_CLOSES) close.current();
      },
    }),
  ).current.panHandlers;
  return (
    <View style={s.layer}>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[s.sheet, style, keyboard ? { paddingBottom: keyboard + 8 } : null]} {...pull}>
        <View style={s.grab}>
          <View style={s.grabMark} />
        </View>
        {children}
        {cancel ? (
          <>
            <View style={s.gap} />
            <Pressable style={(p) => [s.row, tint(p)]} onPress={onClose} accessibilityLabel="Cancel">
              <Text style={[s.rowText, s.cancel]}>Cancel</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // over the player sheet (zIndex 10) and every screen
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 11, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: C.raised, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet, paddingHorizontal: S.side, paddingBottom: S.homeBar + 8 },
  grab: { height: 20, alignItems: 'center', justifyContent: 'center' },
  grabMark: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.faint },
  row: { height: ROW_HEIGHT, justifyContent: 'center' },
  rowText: { ...T.row },
  cancel: { color: C.dim },
  gap: { height: 1, backgroundColor: C.line, marginTop: 8, marginBottom: 8 },
});
