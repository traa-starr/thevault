// Home from anywhere: every screen and the player sheet show the same Home link, top right, across from Back.
import { Pressable, StyleSheet, Text } from 'react-native';
import { player } from './playerStore';

let goHomeNow = () => {};
export const setHome = (go: () => void) => {
  goHomeNow = go;
};

/** Closes the player sheet and any screen, back to the home screen. The music keeps playing. */
export const goHome = () => {
  player.open('none');
  goHomeNow();
};

export function HomeButton() {
  return (
    <Pressable onPress={goHome} hitSlop={8} style={s.home} accessibilityLabel="Home">
      <Text style={s.text}>Home</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  home: { marginLeft: 'auto' },
  text: { color: '#8ab4f8', fontSize: 15, padding: 8 },
});
