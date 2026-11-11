// Every symbol in the app. On a build with Apple's icons (SF Symbols, the 2026-11-10 rebuild on) it draws those; on an
// older build, and in the laptop's screenshots, it draws its own stand-in from plain shapes, the same size, so nothing
// moves when the rebuild lands.
import { StyleSheet, View } from 'react-native';
import { SymbolView } from './native';

export type IconName =
  | 'play' | 'pause' | 'next' | 'previous' | 'home' | 'library' | 'search' | 'favorite' | 'favoriteOn' | 'archive' | 'archiveOn'
  | 'tag' | 'lines' | 'queue' | 'shuffle' | 'more' | 'down' | 'close' | 'eye' | 'eyeOff' | 'back' | 'settings' | 'grip';

/** Apple's name for each. */
export const SF: Record<IconName, string> = {
  play: 'play.fill', pause: 'pause.fill', next: 'forward.fill', previous: 'backward.fill', home: 'house.fill', library: 'square.stack.fill',
  search: 'magnifyingglass', favorite: 'heart', favoriteOn: 'heart.fill', archive: 'archivebox', archiveOn: 'archivebox.fill', tag: 'tag.fill',
  lines: 'text.alignleft', queue: 'list.bullet', shuffle: 'shuffle', more: 'ellipsis', down: 'chevron.down', close: 'xmark', eye: 'eye',
  eyeOff: 'eye.slash', back: 'chevron.left', settings: 'gearshape.fill', grip: 'line.3.horizontal',
};

type Props = { name: IconName; size?: number; color: string };

export function Icon({ name, size = 24, color }: Props) {
  if (SymbolView) {
    return (
      <View style={{ width: size, height: size }} pointerEvents="none">
        <SymbolView name={SF[name]} size={size} tintColor={color} weight="semibold" resizeMode="scaleAspectFit" fallback={<Drawn name={name} size={size} color={color} />} />
      </View>
    );
  }
  return <Drawn name={name} size={size} color={color} />;
}

const tri = (dir: 'left' | 'right' | 'up', w: number, h: number, color: string) => {
  const clear = 'transparent';
  if (dir === 'up') return { width: 0, height: 0, borderLeftWidth: w / 2, borderRightWidth: w / 2, borderBottomWidth: h, borderLeftColor: clear, borderRightColor: clear, borderBottomColor: color };
  const side = dir === 'right' ? { borderLeftWidth: w, borderLeftColor: color } : { borderRightWidth: w, borderRightColor: color };
  return { width: 0, height: 0, borderTopWidth: h / 2, borderBottomWidth: h / 2, borderTopColor: clear, borderBottomColor: clear, ...side };
};

/** The stand-in, drawn from plain shapes: `u` is a 24th of its size, so every symbol scales as one. */
function Drawn({ name, size, color }: Required<Props>) {
  const u = size / 24;
  const fill = { backgroundColor: color };
  const box = [d.box, { width: size, height: size }];
  const bar = (w: number, h: number, more: object = {}) => <View style={[fill, { width: w * u, height: h * u, borderRadius: Math.min(w, h) * u * 0.5 }, more]} />;
  switch (name) {
    case 'play':
      return <View style={box} pointerEvents="none"><View style={[tri('right', 15 * u, 18 * u, color), { marginLeft: 3 * u }]} /></View>;
    case 'pause':
      return <View style={[box, d.row, { gap: 4 * u }]} pointerEvents="none">{bar(5, 17)}{bar(5, 17)}</View>;
    case 'next':
    case 'previous': {
      const dir = name === 'next' ? 'right' : 'left';
      return <View style={[box, d.row]} pointerEvents="none"><View style={tri(dir, 11 * u, 14 * u, color)} /><View style={tri(dir, 11 * u, 14 * u, color)} /></View>;
    }
    case 'home':
      return (
        <View style={box} pointerEvents="none">
          <View style={tri('up', 22 * u, 10 * u, color)} />
          <View style={[fill, { width: 16 * u, height: 9 * u, borderBottomLeftRadius: 2 * u, borderBottomRightRadius: 2 * u, alignItems: 'center', justifyContent: 'flex-end' }]}>
            <View style={{ width: 4 * u, height: 5 * u, backgroundColor: '#000', opacity: 0.55 }} />
          </View>
        </View>
      );
    case 'library':
      return <View style={[box, d.row, { gap: 2.5 * u }]} pointerEvents="none">{bar(3.5, 17)}{bar(3.5, 17)}{bar(3.5, 17, { transform: [{ rotate: '-14deg' }], marginLeft: 1.5 * u })}</View>;
    case 'search':
      return (
        <View style={box} pointerEvents="none">
          <View style={{ width: 15 * u, height: 15 * u, borderRadius: 8 * u, borderWidth: 2.4 * u, borderColor: color, marginRight: 4 * u, marginBottom: 4 * u }} />
          <View style={[fill, { position: 'absolute', width: 2.6 * u, height: 8 * u, borderRadius: 1.3 * u, right: 4.4 * u, bottom: 2 * u, transform: [{ rotate: '-45deg' }] }]} />
        </View>
      );
    case 'favorite':
    case 'favoriteOn': {
      // a heart: two rounded halves leaning together
      const half = { position: 'absolute' as const, width: 11 * u, height: 17 * u, top: 4 * u, borderTopLeftRadius: 6 * u, borderTopRightRadius: 6 * u, backgroundColor: color };
      return (
        <View style={box} pointerEvents="none">
          <View style={[half, { left: 3.6 * u, transform: [{ rotate: '-45deg' }] }]} />
          <View style={[half, { right: 3.6 * u, transform: [{ rotate: '45deg' }] }]} />
        </View>
      );
    }
    case 'archive':
    case 'archiveOn':
      return (
        <View style={box} pointerEvents="none">
          {bar(20, 5, { borderRadius: 1.5 * u })}
          <View style={{ width: 17 * u, height: 11 * u, marginTop: 1.5 * u, borderWidth: 2 * u, borderColor: color, borderBottomLeftRadius: 2.5 * u, borderBottomRightRadius: 2.5 * u, alignItems: 'center', backgroundColor: name === 'archiveOn' ? color : 'transparent' }}>
            <View style={{ width: 6 * u, height: 2 * u, borderRadius: u, marginTop: 1.5 * u, backgroundColor: name === 'archiveOn' ? '#000' : color }} />
          </View>
        </View>
      );
    case 'tag':
      return (
        <View style={[box, d.row]} pointerEvents="none">
          <View style={[fill, { width: 11 * u, height: 11 * u, borderRadius: 1.5 * u, marginRight: -7 * u, transform: [{ rotate: '45deg' }] }]} />
          <View style={[fill, { width: 14 * u, height: 15.5 * u, borderRadius: 3 * u, justifyContent: 'center', paddingLeft: 1.5 * u }]}>
            <View style={{ width: 4 * u, height: 4 * u, borderRadius: 2 * u, backgroundColor: '#000', opacity: 0.7 }} />
          </View>
        </View>
      );
    case 'lines':
      return <View style={[box, { alignItems: 'flex-start', paddingLeft: 3 * u, gap: 3.4 * u }]} pointerEvents="none">{bar(18, 2.4)}{bar(18, 2.4)}{bar(11, 2.4)}</View>;
    case 'queue':
      return (
        <View style={[box, { gap: 3.4 * u }]} pointerEvents="none">
          {[0, 1, 2].map((i) => <View key={i} style={[d.row, { gap: 2.4 * u }]}>{bar(2.6, 2.6)}{bar(13, 2.4)}</View>)}
        </View>
      );
    case 'shuffle':
      return (
        <View style={[box, { gap: 5 * u }]} pointerEvents="none">
          <View style={d.row}>{bar(13, 2.2)}<View style={tri('right', 6 * u, 8 * u, color)} /></View>
          <View style={d.row}><View style={tri('left', 6 * u, 8 * u, color)} />{bar(13, 2.2)}</View>
        </View>
      );
    case 'more':
      return <View style={[box, d.row, { gap: 3 * u }]} pointerEvents="none">{bar(4, 4)}{bar(4, 4)}{bar(4, 4)}</View>;
    case 'down':
    case 'back':
      return (
        <View style={box} pointerEvents="none">
          <View style={{ width: 10 * u, height: 10 * u, borderRightWidth: 2.6 * u, borderBottomWidth: 2.6 * u, borderColor: color, borderRadius: u, transform: [{ rotate: name === 'down' ? '45deg' : '135deg' }], marginBottom: name === 'down' ? 5 * u : 0, marginLeft: name === 'back' ? 5 * u : 0 }} />
        </View>
      );
    case 'close':
      return (
        <View style={box} pointerEvents="none">
          {bar(19, 2.6, { position: 'absolute', transform: [{ rotate: '45deg' }] })}
          {bar(19, 2.6, { position: 'absolute', transform: [{ rotate: '-45deg' }] })}
        </View>
      );
    case 'settings':
      // a gear: four bars crossed for the teeth, a disc over them, a dark hole in the middle
      return (
        <View style={box} pointerEvents="none">
          {bar(22, 5, { position: 'absolute', borderRadius: 1.5 * u })}
          {bar(22, 5, { position: 'absolute', borderRadius: 1.5 * u, transform: [{ rotate: '45deg' }] })}
          {bar(22, 5, { position: 'absolute', borderRadius: 1.5 * u, transform: [{ rotate: '90deg' }] })}
          {bar(22, 5, { position: 'absolute', borderRadius: 1.5 * u, transform: [{ rotate: '135deg' }] })}
          <View style={[fill, { width: 16 * u, height: 16 * u, borderRadius: 8 * u, alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ width: 6.5 * u, height: 6.5 * u, borderRadius: 3.25 * u, backgroundColor: '#000', opacity: 0.8 }} />
          </View>
        </View>
      );
    case 'grip':
      return <View style={[box, { gap: 3.6 * u }]} pointerEvents="none">{bar(18, 2.2)}{bar(18, 2.2)}{bar(18, 2.2)}</View>;
    case 'eye':
    case 'eyeOff':
      return (
        <View style={box} pointerEvents="none">
          <View style={{ width: 21 * u, height: 12.5 * u, borderRadius: 6.5 * u, borderWidth: 2 * u, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
            {bar(5, 5)}
          </View>
          {name === 'eyeOff' ? bar(24, 2, { position: 'absolute', transform: [{ rotate: '-35deg' }] }) : null}
        </View>
      );
  }
}

const d = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
