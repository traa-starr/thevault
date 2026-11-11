// One song in a list (overhaul wave 2, Wall): its tile, the title on one line, a quiet second line, and my rating as
// a quiet mark. Library and the search screen draw the same row. Always 60 high: a long title is cut with "…" and
// never pushes into the next row, and the mark and second line never give way to it.
// It redraws only when what it shows changes, so a fast flick through 1,395 of them stays light.
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tile } from './Art';
import { Icon } from './Icon';
import { ROW_HEIGHT } from './libraryCore';
import { pieces } from './search';
import { tint } from './Tagging';
import { C, R, S, T } from './theme';
import { VersionsChip } from './Versions';

/** My rating beside a song: a small heart for a Favorite, the word for Archived. Quiet on purpose: amber is kept for
 * what's playing, so a list of Favorites doesn't shout. */
export function RatingMark({ rating }: { rating: string | null | undefined }) {
  if (rating === 'fire') {
    return (
      <View accessible accessibilityLabel="Favorite" style={s.heart}>
        <Icon name="favoriteOn" size={14} color={C.dim} />
      </View>
    );
  }
  if (rating === 'shelved') return <Text style={s.archived}>Archived</Text>;
  return null;
}

/** "On this phone" as a picture: a tiny phone outline (a thin upright rectangle) at the end of the second line. It
 * replaced the words (owner, 2026-11-11), which were the first thing cut on a busy row. It never shrinks: only the
 * words before it give way. */
export function PhoneMark() {
  return <View accessible accessibilityLabel="On this phone" style={s.phone} />;
}

export type SongRowProps<S> = {
  song: S & { id: string; title: string; date?: string | null };
  /** The second line. */
  meta: string;
  /** The song is saved on this phone: the phone mark after the second line. */
  onPhone?: boolean;
  /** Search: the words typed, so the part of the title that matched is bold like a matched line's words. */
  bold?: { stems: string[]; typed: string };
  rating?: string | null;
  /** Can't play right now: dimmed. */
  off?: boolean;
  /** Can't be tapped at all (cloud only, file missing). */
  disabled?: boolean;
  /** The song playing now: its title in amber. */
  playing?: boolean;
  /** Select mode: true or false draws the tick circle; undefined: not selecting. */
  ticked?: boolean;
  /** Draws "Versions · 3" when the song has versions; a tap on it opens them. */
  versions?: boolean;
  onPress: (song: S) => void;
  onLongPress?: (song: S) => void;
};

function Row<S extends { id: string; title: string; date?: string | null }>({ song, meta, onPhone, bold, rating, off, disabled, playing, ticked, versions, onPress, onLongPress }: SongRowProps<S>) {
  // a title found by a few letters inside a word has no whole word to mark: it stays plain white, never all grey
  const parts = bold ? pieces(song.title, bold.stems, bold.typed) : [];
  const marked = parts.some((piece) => piece.hit);
  return (
    <Pressable
      testID="song-row"
      style={(p) => [s.row, tint(p)]}
      disabled={disabled}
      onPress={() => onPress(song)}
      onLongPress={onLongPress ? () => onLongPress(song) : undefined}
      delayLongPress={400}
    >
      {ticked !== undefined ? (
        <View style={[s.tick, ticked && s.tickOn]}>
          <Text style={s.tickMark}>{ticked ? '✓' : ' '}</Text>
        </View>
      ) : null}
      <View style={off ? s.off : undefined}>
        <Tile title={song.title} date={song.date} size={S.rowTile} radius={R.rowTile} plain />
      </View>
      <View style={s.words}>
        <Text testID="song-title" style={[s.title, marked && s.searched, playing && s.playing, off && s.off]} numberOfLines={1}>
          {marked ? parts.map((piece, i) => <Text key={i} style={piece.hit && !playing ? s.hitWord : undefined}>{piece.text}</Text>) : song.title}
        </Text>
        <View style={s.second}>
          <Text testID="song-meta" style={s.meta} numberOfLines={1}>{meta || ' '}</Text>
          {onPhone ? <PhoneMark /> : null}
        </View>
      </View>
      {versions ? <VersionsChip id={song.id} style={s.versions} textStyle={s.versionsWord} /> : null}
      <RatingMark rating={rating} />
    </Pressable>
  );
}

export const SongRow = memo(Row) as typeof Row;

const s = StyleSheet.create({
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  // the only part that gives way: a long title is cut, the tile, mark and chip keep their size
  words: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { ...T.row },
  playing: { color: C.accent },
  off: { opacity: 0.4 },
  // a searched title is drawn like a searched line: grey, the matched words white and bold
  searched: { color: C.dim },
  hitWord: { color: C.text, fontWeight: '700' },
  second: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  // the words give way (cut with …), the phone mark after them never does
  meta: { ...T.meta, flexShrink: 1, fontVariant: ['tabular-nums'] },
  phone: { width: 8, height: 13, borderRadius: 2.5, borderWidth: 1.3, borderColor: C.dim, flexShrink: 0 },
  heart: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  archived: { color: C.dim, fontSize: 12, fontWeight: '600' },
  versions: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: C.raised, justifyContent: 'center' },
  versionsWord: { color: C.text, fontSize: 12, fontWeight: '600' },
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: C.text, borderColor: C.text },
  tickMark: { color: C.bg, fontSize: 14, fontWeight: '800' },
});
