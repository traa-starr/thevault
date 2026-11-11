// Songs marked Not mine, with Restore. Restore goes through the outbox like Undo, so it works when the laptop is away.
// Look (overhaul wave 4, the whole-app pass): the list row every screen uses (60 high, a tile), theme colours only.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Tile } from './Art';
import { addChange, flush, useOutbox } from './outbox';
import { withoutRestored } from './playOrder';
import { Tap } from './Tap';
import { C, R, S, T } from './theme';

type Song = { id: string; title: string; where: string; date: string | null };

const TIMEOUT_MS = 10000;
const ROW_HEIGHT = S.row;
const WHERE: Record<string, string> = { laptop: 'On the laptop', cloud: 'Cloud only', gone: 'File missing' };

const detail = (song: Song) => [song.date, WHERE[song.where]].filter(Boolean).join(' · ');

export default function Hidden({ url, onBack }: { url: string; onBack: () => void }) {
  const [fetched, setFetched] = useState<Song[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { pending } = useOutbox();

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
    let current = true;
    setFailed(false);
    (async () => {
      try {
        await flush(); // so a song I just hid is in the list, and one I just restored isn't
        const r = await fetch(`${url}/songs?hidden=1`, { signal: abort.signal });
        if (!r.ok) throw new Error(`Server said ${r.status}`);
        const data: { songs: Song[] } = await r.json();
        if (current) setFetched(data.songs);
      } catch {
        if (current) setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      current = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [url, attempt]);

  const songs = useMemo(() => fetched && withoutRestored(fetched, pending), [fetched, pending]);

  const restore = (id: string) => {
    addChange('mine_restore', id);
    setFetched((list) => list && list.filter((song) => song.id !== id)); // stays gone once the outbox empties
  };

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Tap style={s.back} radius={22} onPress={onBack} accessibilityLabel="Back">
          <Text style={s.backWord}>Back</Text>
        </Tap>
        <Text style={s.title}>Hidden</Text>
      </View>
      {failed && !songs ? (
        <View style={s.middle}>
          <Text style={[s.line, s.warn]}>Laptop not reachable</Text>
          <Tap style={s.again} radius={22} onPress={() => setAttempt(attempt + 1)}>
            <Text style={s.againWord}>Try again</Text>
          </Tap>
        </View>
      ) : !songs ? (
        <View style={s.middle}>
          <Text style={s.line}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(song) => song.id}
          ListHeaderComponent={<Text style={s.count}>{songs.length === 1 ? '1 hidden song' : `${songs.length.toLocaleString('en-US')} hidden songs`}</Text>}
          ListEmptyComponent={<Text style={s.empty}>Nothing hidden</Text>}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Tile title={item.title} date={item.date} size={S.rowTile} radius={R.rowTile} plain />
              <View style={s.text}>
                <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.rowDetail} numberOfLines={1}>{detail(item) || ' '}</Text>
              </View>
              <Tap style={s.restore} radius={18} onPress={() => restore(item.id)} hitSlop={4}>
                <Text style={s.restoreWord}>Restore</Text>
              </Tap>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg, paddingTop: S.statusBar + 6, paddingHorizontal: S.side },
  header: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { height: S.tap, minWidth: S.tap, justifyContent: 'center', marginLeft: -8 },
  backWord: { color: C.dim, fontSize: 15, paddingHorizontal: 8 },
  title: { ...T.title, flex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  line: { ...T.meta, fontSize: 15 },
  warn: { color: C.warnText },
  again: { minHeight: S.tap, borderRadius: 22, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.raised, overflow: 'hidden' },
  againWord: { color: C.text, fontSize: 15, fontWeight: '600' },
  count: { ...T.meta, paddingVertical: 8, fontVariant: ['tabular-nums'] },
  empty: { ...T.meta, fontSize: 15, textAlign: 'center', paddingTop: 32 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, minWidth: 0 },
  rowTitle: { ...T.row },
  rowDetail: { ...T.meta, marginTop: 2 },
  // a quiet pill, 36 high with its touch reaching 44
  restore: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  restoreWord: { color: C.text, fontSize: 14, fontWeight: '600' },
});
