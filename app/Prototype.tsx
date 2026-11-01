// Sorting prototype (ROADMAP 1.19): made-up songs only, nothing is saved or sent. It exists to judge how sorting feels
// before the real one is built: a bulk sweep of whole sets, then one card at a time with buttons or a swipe.
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Verdict = 'mine' | 'not mine';
type Fake = { id: string; title: string; likely: boolean };
type FakeSet = { id: string; name: string; songs: Fake[] };

const SWIPE_PX = 110;
const UNDO_MS = 5000;

const makeSets = (): FakeSet[] => {
  const make = (id: string, name: string, titles: string[], likelyEvery: number): FakeSet => ({
    id,
    name,
    songs: titles.map((title, i) => ({ id: `${id}-${i}`, title, likely: i % likelyEvery === 0 })),
  });
  return [
    make('a', 'Music: "Mmmm" takes', ['Mmmm-001', 'Mmmm-002', 'Mmmm-003', 'Mmmm-004', 'Mmmm-005', 'Mmmm-006'], 1),
    make('b', 'Session Music: other artist', ['Intro', 'Verse Demo', 'Hook Idea', 'Beat Loop 1', 'Beat Loop 2', 'Outro', 'Skit'], 99),
    make('c', 'Music: dated files', ['10.12', '10.13', '10.13-002', '10.14', '10.20', '11.01', '11.01-002', '11.02'], 3),
    make('d', 'Loose files', ['Untitled', 'Untitled 2', 'new idea', 'freestyle 1', 'freestyle 2'], 2),
  ];
};

export default function Prototype({ onBack }: { onBack: () => void }) {
  const sets = useMemo(makeSets, []);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [cards, setCards] = useState<Fake[] | null>(null);

  const mark = (songs: Fake[], value: Verdict | null) =>
    setVerdicts((all) => {
      const next = { ...all };
      for (const song of songs) value ? (next[song.id] = value) : delete next[song.id];
      return next;
    });

  if (cards) {
    return (
      <Cards
        songs={cards}
        verdicts={verdicts}
        onMark={(song, value) => mark([song], value)}
        onDone={() => setCards(null)}
      />
    );
  }

  const left = (set: FakeSet) => set.songs.filter((song) => !verdicts[song.id]);

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable onPress={onBack}>
          <Text style={s.link}>Back</Text>
        </Pressable>
        <Text style={s.title}>Sort (prototype)</Text>
      </View>
      <Text style={s.note}>Made-up songs. Nothing is saved.</Text>
      <ScrollView>
        {sets.map((set) => {
          const todo = left(set);
          const swept = new Set(set.songs.map((song) => verdicts[song.id]).filter(Boolean));
          const allSame = todo.length === 0 && swept.size === 1 ? [...swept][0] : null;
          return (
            <View key={set.id} style={s.set}>
              <Pressable onPress={() => setOpen(open === set.id ? null : set.id)}>
                <Text style={s.setName}>{set.name}</Text>
                <Text style={s.setCount}>
                  {todo.length === 0 ? 'All sorted' : `${todo.length} of ${set.songs.length} left`} · {open === set.id ? 'hide' : 'show songs'}
                </Text>
              </Pressable>
              {open === set.id
                ? set.songs.map((song) => (
                    <Text key={song.id} style={s.songLine}>
                      {song.title}
                      {song.likely ? '  · likely mine' : ''}
                      {verdicts[song.id] ? `  → ${verdicts[song.id]}` : ''}
                    </Text>
                  ))
                : null}
              <View style={s.row}>
                {todo.length ? (
                  <>
                    <Pressable style={[s.button, s.good]} onPress={() => mark(todo, 'mine')}>
                      <Text style={s.buttonText}>All mine</Text>
                    </Pressable>
                    <Pressable style={[s.button, s.bad]} onPress={() => mark(todo, 'not mine')}>
                      <Text style={s.buttonText}>All not mine</Text>
                    </Pressable>
                    <Pressable style={s.button} onPress={() => setCards(todo)}>
                      <Text style={s.buttonText}>One by one</Text>
                    </Pressable>
                  </>
                ) : null}
                {allSame || todo.length < set.songs.length ? (
                  <Pressable style={s.button} onPress={() => mark(set.songs, null)}>
                    <Text style={s.buttonText}>Undo set</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Cards({ songs, verdicts, onMark, onDone }: {
  songs: Fake[];
  verdicts: Record<string, Verdict>;
  onMark: (song: Fake, value: Verdict | null) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [undo, setUndo] = useState<{ index: number; song: Fake } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const x = useRef(new Animated.Value(0)).current;
  const song = songs[index];

  // the pan handler is made once, so it reads the current card through a ref
  const latest = useRef({ decide: (_: Verdict) => {} });
  latest.current.decide = (value: Verdict) => {
    if (!song) return;
    onMark(song, value);
    setUndo({ index, song });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), UNDO_MS);
    setIndex(index + 1);
    x.setValue(0);
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: Animated.event([null, { dx: x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_PX) latest.current.decide('mine');
        else if (g.dx < -SWIPE_PX) latest.current.decide('not mine');
        else Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const tapUndo = () => {
    if (!undo) return;
    onMark(undo.song, null);
    setIndex(undo.index);
    setUndo(null);
    clearTimeout(timer.current);
  };

  const sorted = songs.filter((one) => verdicts[one.id]).length;

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable onPress={onDone}>
          <Text style={s.link}>Back</Text>
        </Pressable>
        <Text style={s.title}>
          {song ? `${index + 1} of ${songs.length}` : 'Done'}
        </Text>
      </View>
      {song ? (
        <>
          <Animated.View
            {...pan.panHandlers}
            style={[
              s.card,
              {
                transform: [{ translateX: x }, { rotate: x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-6deg', '0deg', '6deg'] }) }],
                borderColor: x.interpolate({ inputRange: [-SWIPE_PX, 0, SWIPE_PX], outputRange: ['#f28b82', '#444', '#81c995'], extrapolate: 'clamp' }),
              },
            ]}
          >
            <Text style={s.cardTitle}>{song.title}</Text>
            <Text style={s.cardNote}>{song.likely ? 'Likely mine' : 'Not sure'}</Text>
            <Text style={s.cardHint}>(a real card would be playing from about 30% in)</Text>
          </Animated.View>
          <Text style={s.swipeHint}>← not mine · mine →</Text>
          <View style={s.row}>
            <Pressable style={[s.big, s.bad]} onPress={() => latest.current.decide('not mine')}>
              <Text style={s.bigText}>Not mine</Text>
            </Pressable>
            <Pressable style={[s.big, s.good]} onPress={() => latest.current.decide('mine')}>
              <Text style={s.bigText}>Mine</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={s.middle}>
          <Text style={s.cardTitle}>{sorted} sorted</Text>
          <Pressable onPress={onDone}>
            <Text style={s.link}>Back to sets</Text>
          </Pressable>
        </View>
      )}
      {undo ? (
        <Pressable style={s.toast} onPress={tapUndo}>
          <Text style={s.toastText} numberOfLines={1}>{verdicts[undo.song.id] === 'mine' ? 'Mine' : 'Not mine'}: {undo.song.title}</Text>
          <Text style={s.toastUndo}>Undo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#111', paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8 },
  note: { color: '#888', fontSize: 13, marginBottom: 12 },
  set: { paddingVertical: 14, borderBottomColor: '#2a2a2a', borderBottomWidth: 1, gap: 6 },
  setName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  setCount: { color: '#888', fontSize: 13, marginTop: 2 },
  songLine: { color: '#bbb', fontSize: 14, paddingLeft: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  button: { backgroundColor: '#2a2a2a', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 },
  buttonText: { color: '#fff', fontSize: 15 },
  good: { backgroundColor: '#1e5b34' },
  bad: { backgroundColor: '#6a2a2a' },
  card: { marginTop: 24, height: 260, borderRadius: 16, borderWidth: 3, backgroundColor: '#1c1c1c', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 },
  cardTitle: { color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  cardNote: { color: '#8ab4f8', fontSize: 16 },
  cardHint: { color: '#666', fontSize: 12, textAlign: 'center' },
  swipeHint: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 12 },
  big: { flex: 1, borderRadius: 12, paddingVertical: 28, alignItems: 'center' },
  bigText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 40, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 8, backgroundColor: '#333' },
  toastText: { flex: 1, color: '#fff', fontSize: 15 },
  toastUndo: { color: '#8ab4f8', fontSize: 16, fontWeight: '700' },
});
