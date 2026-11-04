// Songs marked Not mine, with Restore. Restore goes through the outbox like Undo, so it works when the laptop is away.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeButton } from './nav';
import { addChange, flush, useOutbox } from './outbox';
import { withoutRestored } from './playOrder';

type Song = { id: string; title: string; where: string; date: string | null };

const TIMEOUT_MS = 10000;
const ROW_HEIGHT = 60;
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
        <Pressable onPress={onBack}>
          <Text style={s.link}>Back</Text>
        </Pressable>
        <Text style={s.title}>Hidden</Text>
        <HomeButton />
      </View>
      {failed && !songs ? (
        <View style={s.middle}>
          <Text style={s.line}>Laptop not reachable</Text>
          <Pressable onPress={() => setAttempt(attempt + 1)}>
            <Text style={s.link}>Try again</Text>
          </Pressable>
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
              <View style={s.text}>
                <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.rowDetail} numberOfLines={1}>{detail(item)}</Text>
              </View>
              <Pressable onPress={() => restore(item.id)} hitSlop={8}>
                <Text style={s.restore}>Restore</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#111', paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  line: { color: '#ddd', fontSize: 18 },
  count: { color: '#ddd', fontSize: 14, paddingVertical: 8 },
  empty: { color: '#888', fontSize: 15, textAlign: 'center', paddingTop: 32 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: '#2a2a2a', borderBottomWidth: 1 },
  text: { flex: 1 },
  rowTitle: { color: '#fff', fontSize: 16 },
  rowDetail: { color: '#888', fontSize: 13, marginTop: 2 },
  restore: { color: '#8ab4f8', fontSize: 15, fontWeight: '700', padding: 8 },
});
