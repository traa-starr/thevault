// One card per unsorted song, its sound starting at 0:30 (the player's start point while sorting). Mine and Not mine by button or swipe; Not sure by the small
// button or a swipe up. Built from the batch 2 prototype. The card shown is always the first song still open, so a song
// judged anywhere else drops out at once, and Undo brings a song back to its own place.
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeButton } from './nav';
import { player, usePlayer } from './playerStore';
import { startLink } from './Versions';
import { members, undo as undoLink, type Sent } from './versionStore';
import type { SortSong, SortView } from './sortData';

type Choice = 'mine' | 'not mine' | 'not sure';
type Undo = { song: SortSong; choice: Choice; at: number | undefined; link?: Sent };

const SWIPE_PX = 110;
const UNDO_MS = 5000;
const LIKELY: Record<string, string> = { mine: 'Mine by its folder', 'likely mine': 'Likely mine' };
const SAID: Record<Choice, string> = { mine: 'Mine', 'not mine': 'Not mine', 'not sure': 'Not sure' };

const number = (n: number) => n.toLocaleString('en-US');

export default function Cards({ url, view, scope, pile, notSure, onNotSure, onDone }: {
  url: string;
  view: SortView;
  /** Only these songs (a set's), or every open song. */
  scope: string[] | null;
  /** The Not sure pile, instead of a normal pass. */
  pile: boolean;
  notSure: Set<string>;
  onNotSure: (ids: Set<string>) => void;
  onDone: () => void;
}) {
  // songs passed over this time only: Next on the lock screen, or Not sure again inside the pile
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<Undo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const xy = useRef(new Animated.ValueXY()).current;
  const { song: playing, time } = usePlayer();
  const inScope = useRef(scope && new Set(scope)).current;
  const queue = view.open.filter((one) =>
    (!inScope || inScope.has(one.id)) && notSure.has(one.id) === pile && !passed.has(one.id));
  const song = queue[0];

  // Cards borrow the player. The songs it can play are fixed now; Back always gives the library's song back.
  const audio = useRef<Set<string> | null>(null);
  const resume = useRef<{ id: string; at: number | undefined } | null>(null);
  // leaving Cards stops everything Cards started: its toast timer, and the player goes back to the library song, paused
  useEffect(() => () => {
    clearTimeout(timer.current);
    player.leaveSort();
  }, []);
  useEffect(() => {
    if (!audio.current) {
      const list = queue.filter((one) => one.where === 'laptop');
      audio.current = new Set(list.map((one) => one.id));
      player.enterSort(url, list, song?.where === 'laptop'); // starts on this card's song when it can play
      return;
    }
    if (!song || !audio.current.has(song.id)) {
      player.pause();
      return;
    }
    const spot = resume.current?.id === song.id ? resume.current : null;
    resume.current = null;
    player.jump(song.id, spot?.at); // an undone song carries on from where it was; a new one starts at 0:30
  }, [song?.id]);

  // Next on the lock screen moves the card along with no verdict: the songs before it wait for another pass
  useEffect(() => {
    if (!playing || !song || playing.id === song.id) return;
    const at = queue.findIndex((one) => one.id === playing.id);
    if (at > 0) setPassed((old) => new Set([...old, ...queue.slice(0, at).map((one) => one.id)]));
  }, [playing?.id]);

  // the pan handler is made once, so it reads the current card through a ref
  const latest = useRef({ decide: (_: Choice) => {} });
  latest.current.decide = (choice: Choice) => {
    if (!song) return;
    if (choice !== 'not sure') player.judge([song], choice);
    else if (pile) setPassed((old) => new Set([...old, song.id]));
    else onNotSure(new Set([...notSure, song.id]));
    setUndo({ song, choice, at: playing?.id === song.id ? time : undefined });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), UNDO_MS);
    xy.setValue({ x: 0, y: 0 });
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 || g.dy < -12,
      onPanResponderMove: Animated.event([null, { dx: xy.x, dy: xy.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_PX) latest.current.decide('mine');
        else if (g.dx < -SWIPE_PX) latest.current.decide('not mine');
        else if (g.dy < -SWIPE_PX && -g.dy > Math.abs(g.dx)) latest.current.decide('not sure');
        else Animated.spring(xy, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => Animated.spring(xy, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
    }),
  ).current;

  const tapUndo = () => {
    if (!undo) return;
    const { song: back, choice, at, link } = undo;
    if (link) undoLink(link); // out of the family first, then no longer Mine
    if (choice !== 'not sure') player.unjudge([back]);
    else if (pile) setPassed((old) => new Set([...old].filter((id) => id !== back.id)));
    else onNotSure(new Set([...notSure].filter((id) => id !== back.id)));
    resume.current = { id: back.id, at };
    setUndo(null);
    clearTimeout(timer.current);
  };

  const sorted = view.total - view.open.length;
  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable onPress={onDone}>
          <Text style={s.link}>Back</Text>
        </Pressable>
        <Text style={s.title}>{pile ? 'Not sure' : 'Cards'}</Text>
        <HomeButton />
      </View>
      <Text style={s.progress}>
        {number(sorted)} of {number(view.total)} sorted · {song ? `${number(queue.length)} left here` : 'none left here'}
      </Text>
      {song ? (
        <>
          <Animated.View
            {...pan.panHandlers}
            style={[
              s.card,
              {
                transform: [
                  { translateX: xy.x },
                  { translateY: xy.y.interpolate({ inputRange: [-400, 0], outputRange: [-400, 0], extrapolate: 'clamp' }) },
                  { rotate: xy.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-6deg', '0deg', '6deg'] }) },
                ],
                borderColor: xy.x.interpolate({ inputRange: [-SWIPE_PX, 0, SWIPE_PX], outputRange: ['#f28b82', '#444', '#81c995'], extrapolate: 'clamp' }),
              },
            ]}
          >
            <Text style={s.cardTitle} numberOfLines={3}>{song.title}</Text>
            <Text style={s.cardNote}>{LIKELY[song.mine] ?? ' '}</Text>
            <Text style={s.cardDetail} numberOfLines={2}>{[song.folder, song.date].filter(Boolean).join(' · ')}</Text>
            <Text style={s.cardDetail}>{song.where === 'laptop' ? ' ' : 'No sound: not on the laptop'}</Text>
          </Animated.View>
          <Text style={s.swipeHint}>← not mine · mine → · up: not sure</Text>
          <View style={s.row}>
            <Pressable style={[s.big, s.bad]} onPress={() => latest.current.decide('not mine')}>
              <Text style={s.bigText}>Not mine</Text>
            </Pressable>
            <Pressable style={[s.big, s.good]} onPress={() => latest.current.decide('mine')}>
              <Text style={s.bigText}>Mine</Text>
            </Pressable>
          </View>
          <Pressable style={s.unsure} onPress={() => latest.current.decide('not sure')}>
            <Text style={s.unsureText}>Not sure</Text>
          </Pressable>
          {/* Mine and linked: the card moves on as Mine, and its Undo takes back both. Already in a group: hidden */}
          {members(song.id).length > 1 ? null : (
            <Pressable
              onPress={() =>
                startLink(url, song, (sent) => setUndo((old) => old && { ...old, link: sent }), () => latest.current.decide('mine'))
              }
            >
              <Text style={s.versionLink}>+ Version</Text>
            </Pressable>
          )}
        </>
      ) : (
        <View style={s.middle}>
          <Text style={s.cardTitle}>{pile ? 'Not sure pile done' : 'All done here'}</Text>
          <Pressable onPress={onDone}>
            <Text style={s.link}>Back to Sort</Text>
          </Pressable>
        </View>
      )}
      {undo ? (
        <Pressable style={s.toast} onPress={tapUndo}>
          <Text style={s.toastText} numberOfLines={1}>{SAID[undo.choice]}: {undo.song.title}</Text>
          <Text style={s.toastUndo}>Undo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  versionLink: { color: '#8ab4f8', fontSize: 15, textAlign: 'center', paddingVertical: 10 },
  page: { flex: 1, backgroundColor: '#111', paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8 },
  progress: { color: '#888', fontSize: 14, marginTop: 4, fontVariant: ['tabular-nums'] },
  card: { marginTop: 20, height: 260, borderRadius: 16, borderWidth: 3, backgroundColor: '#1c1c1c', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 },
  cardTitle: { color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  cardNote: { color: '#8ab4f8', fontSize: 16 },
  cardDetail: { color: '#888', fontSize: 13, textAlign: 'center' },
  swipeHint: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  big: { flex: 1, borderRadius: 12, paddingVertical: 28, alignItems: 'center' },
  bigText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  good: { backgroundColor: '#1e5b34' },
  bad: { backgroundColor: '#6a2a2a' },
  unsure: { alignSelf: 'center', marginTop: 12, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, borderColor: '#555' },
  unsureText: { color: '#ddd', fontSize: 15 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 40, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 8, backgroundColor: '#333' },
  toastText: { flex: 1, color: '#fff', fontSize: 15 },
  toastUndo: { color: '#8ab4f8', fontSize: 16, fontWeight: '700' },
});
