// One card per unsorted song, its sound starting at 0:30 (the player's start point while sorting). Mine and Not mine by
// button or swipe; Not sure by the small button or a swipe up. Built from the batch 2 prototype; the look is Deal's
// swipe card (overhaul wave 3, board/wave3.md): a tall card in the song's own tile colour, stamps that fade in with the
// drag, the next card behind for show only, three quiet round buttons under it. The card itself has no tap, so a
// swipe can never also count as a tap. The verdict is saved the moment the finger lifts; the throw is drawn after.
// The card shown is always the first song still open, so a song judged anywhere else drops out at once, and Undo
// brings a song back to its own place. Rules: cardsCore.ts.
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Tap } from './Tap';
import { effectsOf, GRAB_PX, grabs, LIFT_MAX, liftY, queueOf, SWIPE_PX, THROW, THROW_MS, UNDO_MS, undoEffects, verdictAt, type Choice } from './cardsCore';
import { player, usePlayer } from './playerStore';
import type { SortSong, SortView } from './sortData';
import { C, R, S, T } from './theme';
import { tileOf } from './tileColor';
import { startLink } from './Versions';
import { members, undo as undoLink, type Sent } from './versionStore';

type Undo = { song: SortSong; choice: Choice; at: number | undefined; link?: Sent };
/** A judged card on its way off the screen. Each has its own flight, so a fast second swipe never cuts the first short. */
type Ghost = { key: number; song: SortSong; choice: Choice; fly: Animated.ValueXY };

const LIKELY: Record<string, string> = { mine: 'Mine by its folder', 'likely mine': 'Likely mine' };
const SAID: Record<Choice, string> = { mine: 'Mine', 'not mine': 'Not mine', 'not sure': 'Not sure' };
const DECK_MAX = 520;
const ROUND = 60;
/** The row under the buttons: "+ Version", and the Undo toast's one spot (over it) while a verdict can be taken back. */
const BOTTOM_ROW = 48;

const number = (n: number) => n.toLocaleString('en-US');

/** A short tick when a swipe decides: on the decision only, never during the drag. Buttons tick for themselves (Tap). */
const buzz = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

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
  // the cards just judged, flying off while the next one is already live underneath
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const ghostKey = useRef(0);
  // the song judged on this card, until the next card is up: a second verdict before the redraw is ignored
  const judged = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const xy = useRef(new Animated.ValueXY()).current;
  const enter = useRef(new Animated.Value(1)).current; // 0: still in the "behind" spot, 1: in front
  const { song: playing, time } = usePlayer();
  const inScope = useRef(scope && new Set(scope)).current;
  const queue = queueOf(view.open, inScope, notSure, pile, passed);
  const song = queue[0];
  const behind = queue[1];

  // Cards borrow the player. The songs it can play are fixed now; Back always gives the library's song back.
  const audio = useRef<Set<string> | null>(null);
  const resume = useRef<{ id: string; at: number | undefined } | null>(null);
  // leaving Cards stops everything Cards started: its toast timer, and the player goes back to the library song, paused
  useEffect(() => () => {
    clearTimeout(timer.current);
    player.leaveSort();
  }, []);
  useEffect(() => {
    judged.current = null;
    if (!audio.current) {
      const list = queue.filter((one) => one.where === 'laptop');
      audio.current = new Set(list.map((one) => one.id));
      player.enterSort(url, list, song?.where === 'laptop'); // starts on this card's song when it can play
      return;
    }
    // the next card comes forward from the "behind" spot
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, speed: 18, bounciness: 3, useNativeDriver: false }).start();
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
  const latest = useRef({ decide: (_: Choice, __: { x: number; y: number }) => {} });
  latest.current.decide = (choice, from) => {
    if (!song || judged.current === song.id) return;
    judged.current = song.id;
    // saved first: a kill mid-throw loses nothing
    const does = effectsOf(choice, pile);
    if (does.judge) player.judge([song], does.judge);
    if (does.pass) setPassed((old) => new Set([...old, song.id]));
    if (does.unsure) onNotSure(new Set([...notSure, song.id]));
    setUndo({ song, choice, at: playing?.id === song.id ? time : undefined });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), UNDO_MS);
    // the live card is back at rest for the next song; the judged one flies off as a ghost
    xy.setValue({ x: 0, y: 0 });
    const ghost: Ghost = { key: ++ghostKey.current, song, choice, fly: new Animated.ValueXY(from) };
    setGhosts((old) => [...old, ghost]);
    Animated.timing(ghost.fly, { toValue: THROW[choice], duration: THROW_MS, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(() => {
      setGhosts((old) => old.filter((one) => one !== ghost));
    });
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => grabs(g.dx, g.dy),
      onPanResponderMove: Animated.event([null, { dx: xy.x, dy: xy.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        const choice = verdictAt(g.dx, g.dy);
        if (!choice) {
          Animated.spring(xy, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          return;
        }
        buzz();
        latest.current.decide(choice, { x: g.dx, y: liftY(g.dy) });
      },
      onPanResponderTerminate: () => Animated.spring(xy, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
    }),
  ).current;

  const tapUndo = () => {
    if (!undo) return;
    const { song: back, choice, at, link } = undo;
    const does = undoEffects(choice, pile);
    if (link) undoLink(link); // out of the family first, then no longer Mine
    if (does.unjudge) player.unjudge([back]);
    if (does.unpass) setPassed((old) => new Set([...old].filter((id) => id !== back.id)));
    if (does.unsure) onNotSure(new Set([...notSure].filter((id) => id !== back.id)));
    resume.current = { id: back.id, at };
    setUndo(null);
    clearTimeout(timer.current);
  };

  const sorted = view.total - view.open.length;
  const width = useWindowDimensions().width - 2 * S.side;
  // the same as cardsCore liftY(): half the finger, never under the header
  const lift = xy.y.interpolate({ inputRange: [-2 * LIFT_MAX, 0], outputRange: [-LIFT_MAX, 0], extrapolate: 'clamp' });
  const liveTransform = [
    { translateX: xy.x },
    { translateY: Animated.add(lift, enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] })) },
    { rotate: xy.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-7deg', '0deg', '7deg'] }) },
    { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
  ];
  // the same fade as cardsCore stamps(): nothing inside the grab zone, full at the mark
  const fade = (value: Animated.Value, dir: 1 | -1) =>
    value.interpolate({ inputRange: dir > 0 ? [GRAB_PX, SWIPE_PX] : [-SWIPE_PX, -GRAB_PX], outputRange: dir > 0 ? [0, 1] : [1, 0], extrapolate: 'clamp' });
  const liveStamps = { mine: fade(xy.x, 1), notMine: fade(xy.x, -1), notSure: fade(xy.y, -1) };

  return (
    // the app's Sort layer already stops above the mini player (App.tsx coveredBelow): only a little air here
    <View style={s.page}>
      {/* the header's words and the progress line are drawn over the card: a lifted card slides under them, never over them */}
      <View style={s.header}>
        <Pressable style={s.back} onPress={onDone} accessibilityLabel="Back">
          <Text style={s.backWord}>Back</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>{pile ? 'Not sure' : 'Cards'}</Text>
        <Text style={s.left} numberOfLines={1}>{song ? `${number(queue.length)} left here` : 'none left here'}</Text>
      </View>
      {/* the thin amber line: how much of the whole catalogue is sorted */}
      <View style={s.track} accessibilityLabel={`${number(sorted)} of ${number(view.total)} sorted`}>
        <View style={[s.bar, { width: `${view.total > 0 ? Math.min(sorted / view.total, 1) * 100 : 0}%` }]} />
      </View>
      {song ? (
        <>
          <View style={s.deck}>
            {behind ? (
              <View style={[StyleSheet.absoluteFill, s.behind]} pointerEvents="none">
                <Card song={behind} width={width} bare />
              </View>
            ) : null}
            <Animated.View {...pan.panHandlers} style={[StyleSheet.absoluteFill, { transform: liveTransform }]}>
              <Card song={song} width={width} stamps={liveStamps} />
            </Animated.View>
            {ghosts.map((ghost) => (
              <Animated.View
                key={ghost.key}
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    transform: [
                      { translateX: ghost.fly.x },
                      { translateY: ghost.fly.y },
                      { rotate: ghost.fly.x.interpolate({ inputRange: [-560, 0, 560], outputRange: ['-16deg', '0deg', '16deg'] }) },
                    ],
                  },
                ]}
              >
                <Card song={ghost.song} width={width} stamps={{ mine: ghost.choice === 'mine' ? 1 : 0, notMine: ghost.choice === 'not mine' ? 1 : 0, notSure: ghost.choice === 'not sure' ? 1 : 0 }} />
              </Animated.View>
            ))}
          </View>
          <View style={s.buttons}>
            <Round word="Not mine" onPress={() => latest.current.decide('not mine', { x: 0, y: 0 })} />
            <Round word="Not sure" onPress={() => latest.current.decide('not sure', { x: 0, y: 0 })} />
            <Round word="Mine" accent onPress={() => latest.current.decide('mine', { x: 0, y: 0 })} />
          </View>
          {/* Mine and linked: the card moves on as Mine, and its Undo takes back both. Already in a group: hidden */}
          {members(song.id).length > 1 ? (
            <View style={s.versionSpot} />
          ) : (
            <Pressable
              style={s.versionSpot}
              onPress={() =>
                startLink(url, song, (sent) => setUndo((old) => old && { ...old, link: sent }), () => latest.current.decide('mine', { x: 0, y: 0 }))
              }
            >
              <Text style={s.versionLink}>+ Version</Text>
            </Pressable>
          )}
        </>
      ) : (
        <View style={s.middle}>
          <Text style={s.doneTitle}>{pile ? 'Not sure pile done' : 'All done here'}</Text>
          <Pressable style={s.back} onPress={onDone}>
            <Text style={s.backWord}>Back to Sort</Text>
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

type Stamps = { mine: Animated.AnimatedInterpolation<number> | number; notMine: Animated.AnimatedInterpolation<number> | number; notSure: Animated.AnimatedInterpolation<number> | number };

/** The card: the song's tile colour over its whole face, the first two letters large and faint, the title bottom-left.
 * No tap of its own. `bare`: colour and letters only, no words (the one behind, as in the mockup: it is for show). */
function Card({ song, width, stamps, bare = false }: { song: SortSong; width: number; stamps?: Stamps; bare?: boolean }) {
  const t = tileOf(song.title, song.date);
  const patch = (scale: number, alpha: number) => {
    const w = width * scale;
    return <View key={scale} style={{ position: 'absolute', width: w, height: w, borderRadius: w / 2, left: width * t.glowX - w / 2, top: `${t.glowY * 100}%`, marginTop: -w / 2, backgroundColor: `rgba(${t.glow.join(',')},${alpha})` }} />;
  };
  const meta = [LIKELY[song.mine], song.date].filter(Boolean).join(' · ');
  return (
    <View style={[s.card, { backgroundColor: t.base }]} pointerEvents="none">
      {patch(1.6, 0.2)}
      {patch(1.0, 0.22)}
      <Text style={[s.letters, { fontSize: width * 0.5, lineHeight: width * 0.56 }]} numberOfLines={1} allowFontScaling={false}>
        {t.letters}
      </Text>
      {stamps ? (
        <>
          <Animated.Text style={[s.stamp, s.stampMine, { opacity: stamps.mine }]} allowFontScaling={false}>Mine</Animated.Text>
          <Animated.Text style={[s.stamp, s.stampNotMine, { opacity: stamps.notMine }]} allowFontScaling={false}>Not mine</Animated.Text>
          <Animated.Text style={[s.stamp, s.stampNotSure, { opacity: stamps.notSure }]} allowFontScaling={false}>Not sure</Animated.Text>
        </>
      ) : null}
      {bare ? null : (
        <View style={s.words}>
          <Text style={s.cardTitle} numberOfLines={2}>{song.title}</Text>
          <Text style={s.cardMeta} numberOfLines={1}>{meta || ' '}</Text>
          <Text style={s.cardMeta} numberOfLines={1}>{song.folder || ' '}</Text>
          <Text style={s.cardMeta} numberOfLines={1}>{song.where === 'laptop' ? ' ' : 'No sound: not on the laptop'}</Text>
        </View>
      )}
    </View>
  );
}

/** A quiet round button under the card: the same choice as the swipe, with the pressed look and tick of every button. */
function Round({ word, accent = false, onPress }: { word: string; accent?: boolean; onPress: () => void }) {
  return (
    <Tap style={s.round} radius={ROUND / 2} onPress={onPress} accessibilityLabel={word}>
      <Text style={[s.roundWord, accent && s.roundAccent]} numberOfLines={1} allowFontScaling={false}>{word}</Text>
    </Tap>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg, paddingTop: S.statusBar + 6, paddingHorizontal: S.side, paddingBottom: 8 },
  header: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 2 },
  back: { height: S.tap, minWidth: S.tap, justifyContent: 'center', marginLeft: -8 },
  backWord: { color: C.dim, fontSize: 15, paddingHorizontal: 8 },
  title: { ...T.title, flex: 1 },
  left: { ...T.meta, fontSize: 15, fontVariant: ['tabular-nums'] },
  // the gap under the line is what a lifted card climbs into (LIFT_MAX), so it stops short of the header's words
  track: { height: 2, backgroundColor: C.line, borderRadius: 1, marginTop: 6, marginBottom: 16, overflow: 'hidden', zIndex: 2 },
  bar: { height: 2, backgroundColor: C.accent },
  deck: { flex: 1, maxHeight: DECK_MAX, minHeight: 280 },
  behind: { transform: [{ scale: 0.94 }, { translateY: 20 }], opacity: 0.5 },
  card: { flex: 1, borderRadius: R.playerTile, overflow: 'hidden', justifyContent: 'flex-end', padding: 20 },
  letters: { position: 'absolute', top: -8, left: 8, color: 'rgba(255,255,255,0.14)', fontWeight: '900', letterSpacing: -3 },
  words: { gap: 4 },
  cardTitle: { color: C.white, fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  cardMeta: { color: 'rgba(255,255,255,0.72)', fontSize: 13 },
  // a dark backing, so the stamp reads on a bright tile too
  stamp: { position: 'absolute', top: 24, fontSize: 24, fontWeight: '900', letterSpacing: 1, paddingVertical: 4, paddingHorizontal: 12, borderWidth: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.55)' },
  stampMine: { left: 20, color: C.accent, borderColor: C.accent, transform: [{ rotate: '-12deg' }] },
  stampNotMine: { right: 20, color: C.text, borderColor: C.dim, transform: [{ rotate: '12deg' }] },
  // lower than the others: the card lifts under the header on an up drag, and this stamp must stay in view
  stampNotSure: { alignSelf: 'center', top: 24 + LIFT_MAX, color: C.text, borderColor: C.dim },
  buttons: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 24 },
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' },
  roundWord: { ...T.action, color: C.text },
  roundAccent: { color: C.accent, fontWeight: '700' },
  versionSpot: { height: BOTTOM_ROW, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  versionLink: { color: C.dim, fontSize: 15 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  doneTitle: { ...T.heading },
  // always the same spot: over the "+ Version" row, never over the buttons or the card
  toast: { position: 'absolute', left: S.side, right: S.side, bottom: 8, height: BOTTOM_ROW, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: R.toast, backgroundColor: C.toast },
  toastText: { flex: 1, ...T.toast },
  toastUndo: { color: C.accent, fontSize: 16, fontWeight: '700' },
});
