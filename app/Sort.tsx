// Sort home: how far along I am, the cards, the Not sure pile, and sets to sweep (folders first, then repeated name
// patterns). A set opens inline with its songs listed, and only then offers All mine / All not mine. A sweep is one send,
// and its Undo puts back only the songs that sweep changed.
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Cards from './Cards';
import { player } from './playerStore';
import { loadNotSure, saveNotSure, useSortData, type SortSet, type SortSong } from './sortData';

type Row = { key: string; set: SortSet } & ({ kind: 'set' } | { kind: 'actions' } | { kind: 'song'; song: SortSong });
type Sweep = { songs: SortSong[]; value: 'mine' | 'not mine' };

const LIKELY: Record<string, string> = { mine: 'Mine by its folder', 'likely mine': 'Likely mine' };
const WHERE: Record<string, string> = { cloud: 'Cloud only', gone: 'File missing' };

const number = (n: number) => n.toLocaleString('en-US');
const songs = (n: number) => (n === 1 ? '1 song' : `${number(n)} songs`);
const detail = (song: SortSong) => [LIKELY[song.mine], song.date, WHERE[song.where]].filter(Boolean).join(' · ');

export default function Sort({ url, onBack }: { url: string; onBack: () => void }) {
  const { view, failed, retry } = useSortData(url);
  const [notSure, setNotSure] = useState(loadNotSure);
  const [cards, setCards] = useState<{ scope: string[] | null; pile: boolean } | null>(null);
  const [openSet, setOpenSet] = useState<string | null>(null);
  const [sweep, setSweep] = useState<Sweep | null>(null);

  const changeNotSure = (ids: Set<string>) => {
    saveNotSure(ids);
    setNotSure(ids);
  };

  if (!view) {
    return (
      <View style={s.page}>
        <Header onBack={onBack} />
        <View style={s.middle}>
          <Text style={s.line}>{failed ? 'Laptop not reachable' : 'Loading…'}</Text>
          {failed ? (
            <Pressable onPress={retry}>
              <Text style={s.link}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (cards) {
    return (
      <Cards
        url={url}
        view={view}
        scope={cards.scope}
        pile={cards.pile}
        notSure={notSure}
        onNotSure={changeNotSure}
        onDone={() => setCards(null)}
      />
    );
  }

  const unsure = view.open.filter((song) => notSure.has(song.id)).length;
  const toCard = view.open.length - unsure;

  const sweepSet = (set: SortSet, value: Sweep['value']) => {
    const list = set.songs.map(view.song);
    player.judge(list, value);
    setSweep({ songs: list, value });
    setOpenSet(null);
  };

  const undoSweep = () => {
    if (!sweep) return;
    player.unjudge(sweep.songs);
    setSweep(null);
  };

  const play = (set: SortSet, song: SortSong) => {
    const playable = set.songs.map(view.song).filter((one) => one.where === 'laptop');
    player.playList(url, playable, song.id, false);
    player.open('player');
  };

  // one list, so a set of hundreds opens inline without slowing the screen
  const rows: Row[] = view.sets.flatMap((set): Row[] =>
    openSet !== set.id
      ? [{ key: set.id, kind: 'set', set }]
      : [
          { key: set.id, kind: 'set', set },
          { key: `${set.id}/actions`, kind: 'actions', set },
          ...set.songs.map((id): Row => ({ key: `${set.id}/${id}`, kind: 'song', set, song: view.song(id) })),
        ]);

  return (
    <View style={s.page}>
      <Header onBack={onBack} />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        initialNumToRender={20}
        ListHeaderComponent={
          <View style={s.top}>
            <Text style={s.progress}>{number(view.total - view.open.length)} of {number(view.total)} sorted</Text>
            {toCard ? (
              <Pressable style={[s.button, s.primary]} onPress={() => setCards({ scope: null, pile: false })}>
                <Text style={s.primaryText}>Cards · {number(toCard)} left</Text>
              </Pressable>
            ) : (
              <Text style={s.line}>Every song has a card verdict or is in Not sure.</Text>
            )}
            {unsure ? (
              <Pressable style={s.button} onPress={() => setCards({ scope: null, pile: true })}>
                <Text style={s.buttonText}>Not sure · {number(unsure)}</Text>
              </Pressable>
            ) : null}
            <Text style={s.section}>{view.sets.length ? 'Sets to sweep' : 'No sets left'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'set') {
            const isOpen = openSet === item.set.id;
            return (
              <Pressable style={s.set} onPress={() => setOpenSet(isOpen ? null : item.set.id)}>
                <Text style={s.setName} numberOfLines={2}>{item.set.name}</Text>
                <Text style={s.setCount}>
                  {songs(item.set.songs.length)} · {item.set.kind === 'folder' ? 'folder' : 'similar names'} · {isOpen ? 'hide' : 'show songs'}
                </Text>
              </Pressable>
            );
          }
          if (item.kind === 'actions') {
            return (
              <View style={s.actions}>
                <Pressable style={[s.button, s.good]} onPress={() => sweepSet(item.set, 'mine')}>
                  <Text style={s.buttonText}>All mine</Text>
                </Pressable>
                <Pressable style={[s.button, s.bad]} onPress={() => sweepSet(item.set, 'not mine')}>
                  <Text style={s.buttonText}>All not mine</Text>
                </Pressable>
                <Pressable style={s.button} onPress={() => setCards({ scope: item.set.songs, pile: false })}>
                  <Text style={s.buttonText}>One by one</Text>
                </Pressable>
              </View>
            );
          }
          const off = item.song.where !== 'laptop';
          return (
            <Pressable style={s.song} disabled={off} onPress={() => play(item.set, item.song)}>
              <Text style={[s.songTitle, off && s.off]} numberOfLines={1}>{item.song.title}</Text>
              <Text style={s.songDetail} numberOfLines={1}>{detail(item.song) || ' '}</Text>
            </Pressable>
          );
        }}
      />
      {sweep ? (
        <Pressable style={s.toast} onPress={undoSweep}>
          <Text style={s.toastText} numberOfLines={1}>
            {songs(sweep.songs.length)} marked {sweep.value === 'mine' ? 'Mine' : 'Not mine'}
          </Text>
          <Text style={s.toastUndo}>Undo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack}>
        <Text style={s.link}>Back</Text>
      </Pressable>
      <Text style={s.title}>Sort</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#111', paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  line: { color: '#ddd', fontSize: 16 },
  top: { gap: 10, paddingBottom: 8 },
  progress: { color: '#ddd', fontSize: 16, fontVariant: ['tabular-nums'] },
  section: { color: '#888', fontSize: 13, marginTop: 12 },
  button: { backgroundColor: '#2a2a2a', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15 },
  primary: { backgroundColor: '#fff', paddingVertical: 16 },
  primaryText: { color: '#111', fontSize: 17, fontWeight: '700' },
  good: { backgroundColor: '#1e5b34' },
  bad: { backgroundColor: '#6a2a2a' },
  set: { paddingVertical: 14, borderBottomColor: '#2a2a2a', borderBottomWidth: 1 },
  setName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  setCount: { color: '#888', fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
  song: { height: 56, justifyContent: 'center', paddingLeft: 12, borderBottomColor: '#222', borderBottomWidth: 1 },
  songTitle: { color: '#ddd', fontSize: 15 },
  songDetail: { color: '#777', fontSize: 12, marginTop: 2 },
  off: { color: '#666' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 40, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 8, backgroundColor: '#333' },
  toastText: { flex: 1, color: '#fff', fontSize: 15 },
  toastUndo: { color: '#8ab4f8', fontSize: 16, fontWeight: '700' },
});
