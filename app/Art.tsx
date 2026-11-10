// A song's picture (the generated tile) and the player's tint, drawn from plain shapes: no image, no gradient
// package, so it looks the same on every build. Colours: tileColor.ts.
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tileOf } from './tileColor';
import { C } from './theme';

type TileProps = { title: string | null | undefined; date?: string | null; size: number; radius: number };

/** The square tile: its colour, a soft lighter patch, and the first two letters large and faint. */
export const Tile = memo(function Tile({ title, date, size, radius }: TileProps) {
  const t = useMemo(() => tileOf(title, date), [title, date]);
  // rings laid over each other, each a little smaller and very faint, read as one soft patch of light with no edge
  const rings = size >= 100 ? BIG_RINGS : SMALL_RINGS;
  const color = `rgba(${t.glow.join(',')},${(0.62 / rings.length).toFixed(3)})`;
  const patch = (scale: number) => {
    const w = size * scale;
    return <View key={scale} style={{ position: 'absolute', width: w, height: w, borderRadius: w / 2, left: size * t.glowX - w / 2, top: size * t.glowY - w / 2, backgroundColor: color }} />;
  };
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: t.base, overflow: 'hidden' }} pointerEvents="none">
      {rings.map(patch)}
      <Text style={[s.letters, { fontSize: size * 0.56, lineHeight: size * 0.62, left: size * 0.06, bottom: -size * 0.1 }]} numberOfLines={1} allowFontScaling={false}>
        {t.letters}
      </Text>
    </View>
  );
});

const BIG_RINGS = Array.from({ length: 14 }, (_, i) => 1.9 - i * 0.12);
const SMALL_RINGS = [1.7, 1.4, 1.1, 0.8, 0.5];
const STEPS = 14;
const LOW = 0.42; // how much of the tint is left at the bottom of the player
/** The player's background, as in the Deal mockup: the tile's colour over the whole sheet, strongest at the top and
 * easing to under half by the buttons. The colour itself is capped (tileColor.ts) so white and grey text read on any
 * song, even where it is strongest. A grey tile (no letters in the title): plain black. */
export const Tint = memo(function Tint({ title, date }: { title: string | null | undefined; date?: string | null }) {
  const t = useMemo(() => tileOf(title, date), [title, date]);
  if (t.grey) return <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} pointerEvents="none" />;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} pointerEvents="none">
      {/* full strength over the top 30%, then steps too small to see, down to LOW from 85% to the bottom */}
      <View style={{ height: '30%', backgroundColor: t.tint }} />
      {Array.from({ length: STEPS }, (_, i) => (
        <View key={i} style={{ height: `${55 / STEPS}%`, backgroundColor: t.tint, opacity: 1 - (1 - LOW) * ((i + 1) / (STEPS + 1)) ** 1.3 }} />
      ))}
      <View style={{ flex: 1, backgroundColor: t.tint, opacity: LOW }} />
    </View>
  );
});

const s = StyleSheet.create({
  letters: { position: 'absolute', color: 'rgba(255,255,255,0.14)', fontWeight: '900', letterSpacing: -2 },
});
