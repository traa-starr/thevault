// Sort home: how far along I am, the cards, the Not sure pile, and sets to sweep (folders first, then repeated name
// patterns). Tap a set for its cards; hold it for its sheet: All mine / All not mine and its songs (WORLD-MAP, O.6).
// A sweep is one send, and its Undo puts back only the songs that sweep changed.
// Look (overhaul wave 4, the whole-app pass): theme colours only. The green and red blocks are gone (amber is the one
// accent); buttons are the quiet pills of the Sort card, the main one white like Play.
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Cards from './Cards';
import { WaitingLine } from './Notices';
import { player } from './playerStore';
import { HOLD_MS, SET_ACTIONS } from './songActions';
import { openMenu, type MenuRow } from './SongSheet';
import { tint } from './Tagging';
import { Tap } from './Tap';
import { C, R, S, T } from './theme';
import { loadNotSure, saveNotSure, useSortData, type SortSet, type SortSong } from './sortData';

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

  // hold a set: its sheet (WORLD-MAP Sort 6, 7, 9). All mine, All not mine, then its songs; a song's tap plays it
  const holdSet = (set: SortSet) => {
    const ACTION: Record<(typeof SET_ACTIONS)[number], MenuRow> = {
      all_mine: { key: 'all_mine', label: 'All mine', onPress: () => sweepSet(set, 'mine') },
      all_not_mine: { key: 'all_not_mine', label: 'All not mine', onPress: () => sweepSet(set, 'not mine') },
    };
    const list = set.songs.map(view.song).map((song): MenuRow => ({
      key: song.id,
      label: song.title,
      note: detail(song) || undefined,
      onPress: () => (song.where === 'laptop' ? play(set, song) : player.showMessage('No sound: not on the laptop')),
    }));
    openMenu([...SET_ACTIONS.map((key) => ACTION[key]), ...list], set.name, `${songs(set.songs.length)} · ${set.kind === 'folder' ? 'folder' : 'similar names'}`);
  };

  return (
    <View style={s.page}>
      <Header onBack={onBack} />
      <WaitingLine />
      <FlatList
        data={view.sets}
        keyExtractor={(set) => set.id}
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
            {unsure ? (
              <Tap style={s.button} radius={22} onPress={() => setCards({ scope: null, pile: true })}>
                <Text style={s.buttonText}>Not sure · {number(unsure)}</Text>
              </Tap>
            ) : null}
            <Text style={s.section}>{view.sets.length ? 'Sets to sweep' : 'No sets left'}</Text>
          </View>
        }
        // tap a set: its cards, one by one. Hold it: All mine, All not mine and its songs (the set sheet)
        renderItem={({ item: set }) => (
          <Pressable
            style={(p) => [s.set, tint(p)]}
            onPress={() => setCards({ scope: set.songs, pile: false })}
            onLongPress={() => holdSet(set)}
            delayLongPress={HOLD_MS}
            accessibilityHint="Hold for All mine, All not mine and its songs"
          >
            <Text style={s.setName} numberOfLines={2}>{set.name}</Text>
            <Text style={s.setCount}>{songs(set.songs.length)} · {set.kind === 'folder' ? 'folder' : 'similar names'}</Text>
          </Pressable>
        )}
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
  // the same toast as the player's Undo
  toast: { position: 'absolute', left: 16, right: 16, bottom: 40, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.toast, backgroundColor: C.toast },
  toastText: { flex: 1, ...T.toast },
  toastUndo: { color: C.accent, fontSize: 16, fontWeight: '700' },
});
