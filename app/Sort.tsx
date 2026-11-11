// Sort home: how far along I am, the cards, the Not sure pile, and sets to sweep (folders first, then repeated name
// patterns). A set opens inline with its songs listed, and only then offers All mine / All not mine. A sweep is one send,
// and its Undo puts back only the songs that sweep changed.
// Look (overhaul wave 4, the whole-app pass): theme colours only. The green and red blocks are gone (amber is the one
// accent); buttons are the quiet pills of the Sort card, the main one white like Play.
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Cards from './Cards';
import { WaitingLine } from './Notices';
import { player } from './playerStore';
import { session } from './sessionStore';
import { tint } from './Tagging';
import { Tap } from './Tap';
import { C, R, S, T } from './theme';
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
          <Text style={[s.line, failed && s.warn]}>{failed ? 'Laptop not reachable' : 'Loading…'}</Text>
          {failed ? (
            <Tap style={s.button} radius={22} onPress={retry}>
              <Text style={s.buttonText}>Try again</Text>
            </Tap>
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
      <WaitingLine />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        initialNumToRender={20}
        ListHeaderComponent={
          <View style={s.top}>
            <Text style={s.progress}>{number(view.total - view.open.length)} of {number(view.total)} sorted</Text>
            {toCard ? (
              <Tap filled style={[s.button, s.primary]} radius={24} onPress={() => setCards({ scope: null, pile: false })}>
                <Text style={s.primaryText}>Cards · {number(toCard)} left</Text>
              </Tap>
            ) : (
              <Text style={s.line}>Every song has a card verdict or is in Not sure.</Text>
            )}
            {/* the tagging session over Mine songs: the cards' other half */}
            <Tap style={s.button} radius={22} onPress={() => session.start(url)}>
              <Text style={s.buttonText}>Tag songs</Text>
            </Tap>
            {unsure ? (
              <Tap style={s.button} radius={22} onPress={() => setCards({ scope: null, pile: true })}>
                <Text style={s.buttonText}>Not sure · {number(unsure)}</Text>
              </Tap>
            ) : null}
            <Text style={s.section}>{view.sets.length ? 'Sets to sweep' : 'No sets left'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'set') {
            const isOpen = openSet === item.set.id;
            return (
              <Pressable style={(p) => [s.set, tint(p)]} onPress={() => setOpenSet(isOpen ? null : item.set.id)}>
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
                <Tap style={s.button} radius={22} onPress={() => sweepSet(item.set, 'mine')}>
                  <Text style={s.buttonText}>All mine</Text>
                </Tap>
                <Tap style={s.button} radius={22} onPress={() => sweepSet(item.set, 'not mine')}>
                  <Text style={s.buttonText}>All not mine</Text>
                </Tap>
                <Tap style={s.button} radius={22} onPress={() => setCards({ scope: item.set.songs, pile: false })}>
                  <Text style={s.buttonText}>One by one</Text>
                </Tap>
              </View>
            );
          }
          const off = item.song.where !== 'laptop';
          return (
            <Pressable style={(p) => [s.song, tint(p)]} disabled={off} onPress={() => play(item.set, item.song)}>
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
      <Tap style={s.back} radius={22} onPress={onBack} accessibilityLabel="Back">
        <Text style={s.backWord}>Back</Text>
      </Tap>
      <Text style={s.title}>Sort</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg, paddingTop: S.statusBar + 6, paddingHorizontal: S.side },
  // the same header as Cards: Back, then the screen's name
  header: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { height: S.tap, minWidth: S.tap, justifyContent: 'center', marginLeft: -8 },
  backWord: { color: C.dim, fontSize: 15, paddingHorizontal: 8 },
  title: { ...T.title, flex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  line: { ...T.meta, fontSize: 15 },
  warn: { color: C.warnText },
  top: { gap: 10, paddingBottom: 8 },
  progress: { ...T.meta, fontSize: 15, color: C.text, fontVariant: ['tabular-nums'] },
  section: { ...T.heading, marginTop: 18 },
  // a quiet pill, 44 to touch; the main one (Cards) is white like Play
  button: { minHeight: S.tap, borderRadius: 22, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.raised, overflow: 'hidden' },
  buttonText: { color: C.text, fontSize: 15, fontWeight: '600' },
  primary: { minHeight: 48, borderRadius: 24, backgroundColor: C.white },
  primaryText: { color: '#000', fontSize: 17, fontWeight: '700' },
  set: { minHeight: S.row, justifyContent: 'center', paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  setName: { ...T.row, fontWeight: '600' },
  setCount: { ...T.meta, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
  song: { height: 56, justifyContent: 'center', paddingLeft: 12, borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  songTitle: { color: C.text, fontSize: 15 },
  songDetail: { ...T.meta, fontSize: 12, marginTop: 2 },
  off: { color: C.faint },
  // the same toast as the player's Undo
  toast: { position: 'absolute', left: 16, right: 16, bottom: 40, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.toast, backgroundColor: C.toast },
  toastText: { flex: 1, ...T.toast },
  toastUndo: { color: C.accent, fontSize: 16, fontWeight: '700' },
});
