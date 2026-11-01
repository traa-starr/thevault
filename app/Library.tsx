// The song list from the laptop: scroll, sort, filter by title. Tapping a song does nothing yet.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Song = { id: string; title: string; where: string; date: string | null };
type Sort = 'title' | 'date';

const TIMEOUT_MS = 10000;
const ROW_HEIGHT = 60;
const WHERE: Record<string, string> = { laptop: 'On the laptop', cloud: 'Cloud only', gone: 'File missing' };

const number = (n: number) => n.toLocaleString('en-US');
const detail = (song: Song) => [song.date, WHERE[song.where]].filter(Boolean).join(' · ');

export default function Library({ url, onBack }: { url: string; onBack: () => void }) {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState<Sort>('title');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
    let current = true;
    setFailed(false);
    (async () => {
      try {
        const r = await fetch(`${url}/songs`, { signal: abort.signal });
        if (!r.ok) throw new Error(`Server said ${r.status}`);
        const data: { songs: Song[] } = await r.json();
        if (current) setSongs(data.songs);
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

  const sorted = useMemo(() => {
    const byTitle = [...(songs ?? [])].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'title') return byTitle;
    // Newest first, no date last. A year-only date sorts just after the full dates of that year.
    return byTitle.sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : (a.date ?? '') > (b.date ?? '') ? -1 : 0));
  }, [songs, sort]);

  const shown = useMemo(() => {
    const wanted = filter.trim().toLowerCase();
    return wanted ? sorted.filter((song) => song.title.toLowerCase().includes(wanted)) : sorted;
  }, [sorted, filter]);

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable onPress={onBack}>
          <Text style={s.link}>Back</Text>
        </Pressable>
        <Text style={s.title}>Library</Text>
      </View>
      {failed ? (
        <View style={s.middle}>
          <Text style={s.line}>Laptop not reachable</Text>
          <Pressable onPress={() => setAttempt(attempt + 1)}>
            <Text style={s.link}>Try again</Text>
          </Pressable>
        </View>
      ) : !songs ? (
        <View style={s.middle}>
          <Text style={s.line}>Loading songs…</Text>
        </View>
      ) : (
        <>
          <TextInput
            style={s.input}
            value={filter}
            onChangeText={setFilter}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            placeholder="Filter by title"
            placeholderTextColor="#888"
            clearButtonMode="while-editing"
          />
          <View style={s.bar}>
            <Text style={s.count}>{filter.trim() ? `${number(shown.length)} of ${number(songs.length)}` : `${number(songs.length)} songs`}</Text>
            <View style={s.sorts}>
              <Pressable onPress={() => setSort('title')}>
                <Text style={[s.sort, sort === 'title' && s.sortOn]}>A-Z</Text>
              </Pressable>
              <Pressable onPress={() => setSort('date')}>
                <Text style={[s.sort, sort === 'date' && s.sortOn]}>Newest</Text>
              </Pressable>
            </View>
          </View>
          <FlatList
            key={sort}
            data={shown}
            keyExtractor={(song) => song.id}
            getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={s.empty}>No titles match</Text>}
            renderItem={({ item }) => (
              <View style={s.row}>
                <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.rowDetail} numberOfLines={1}>{detail(item)}</Text>
              </View>
            )}
          />
        </>
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
  input: { color: '#fff', fontSize: 16, borderColor: '#555', borderWidth: 1, borderRadius: 8, padding: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  count: { color: '#ddd', fontSize: 14, fontVariant: ['tabular-nums'] },
  sorts: { flexDirection: 'row', gap: 4 },
  sort: { color: '#8ab4f8', fontSize: 15, paddingVertical: 8, paddingHorizontal: 10 },
  sortOn: { color: '#fff', fontWeight: '700' },
  empty: { color: '#888', fontSize: 15, textAlign: 'center', paddingTop: 32 },
  row: { height: ROW_HEIGHT, justifyContent: 'center', borderBottomColor: '#2a2a2a', borderBottomWidth: 1 },
  rowTitle: { color: '#fff', fontSize: 16 },
  rowDetail: { color: '#888', fontSize: 13, marginTop: 2 },
});
