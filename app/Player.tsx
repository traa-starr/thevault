// What you see of the player: the bar, the full player as a sheet, the queue and the Undo toast. The player itself is
// playerStore.ts, so closing any of these never touches the music.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert, Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import ReorderableList, { useIsActive, useReorderableDrag, type ReorderableListDragEndEvent, type ReorderableListReorderEvent } from 'react-native-reorderable-list';

/** A light tick: a queue song grabbed, and each spot it bumps past while dragged. */
const tick = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
import { CompareDial, WHEEL_WIDTH } from './Compare';
import { compare, useCompare } from './compareStore';
import { openLibrarySelect, HomeButton } from './nav';
import { player, usePlayer, type Pool } from './playerStore';
import type { ShownTag } from './playOrder';
import { jumpToTag, ReservedLine, TagButton, TagList, TagsButton } from './Tagging';
import { say, tagLine, useTagLine, useTags } from './tagStore';
import { VersionsChip, VersionsToast } from './Versions';
import * as versions from './versionStore';

const ROW_HEIGHT = 48;
const HOLD_MS = 300; // not lower: a hold let go just short of this jumps to the song
const SLIDE_MS = 220;
const EDGE_ZONE = 0.3; // the share of the list, top and bottom, that scrolls it during a drag; the middle 40% is safe
const SHEET_TOP = 54; // clears the status bar and leaves the screen behind showing, like an iOS sheet
const CLOSE_PULL = 120;
const CLOSE_SPEED = 0.8;
const CLOSE_MS = 180;
const SWIPE_UP = 40;
const SWIPE_UP_SPEED = 0.4;
const HIDE_MS = 250;
const EYE_DROP = 64; // the verdict row's height plus the gap above it, so the hidden eye sits where the buttons were
const VERDICT_DROP = 120; // far enough to leave the bottom of the screen
const PULSE_MS = 600;
const SLOT_HEIGHT = 52; // the controls row: a fixed height, so nothing below moves

const clock = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

type SeekBarProps = {
  value: number;
  max: number;
  onDrag: (value: number) => void;
  onDrop: (value: number) => void;
  /** Tag ticks: a tap within half a finger of one calls onTick with it instead of seeking to the spot. */
  ticks?: ShownTag[];
  onTick?: (tag: ShownTag) => void;
};
const TICK_REACH = 22;
const TAP_SLOP = 6;
const TICK_MERGE = 0.025; // ticks closer than this share of the bar draw as one wider tick

export function SeekBar({ value, max, onDrag, onDrop, ticks = [], onTick }: SeekBarProps) {
  const width = useRef(1);
  const grabbedAt = useRef(0);
  const latest = useRef({ max, onDrag, onDrop, ticks, onTick });
  latest.current = { max, onDrag, onDrop, ticks, onTick };

  /** The tick nearest a tap at x, if within reach. */
  const tickAt = (x: number) => {
    const { max: m, ticks: all } = latest.current;
    if (!m) return null;
    let best: ShownTag | null = null;
    let bestGap = TICK_REACH;
    for (const tag of all) {
      const gap = Math.abs((tag.at_sec / m) * width.current - x);
      if (gap <= bestGap) [best, bestGap] = [tag, gap];
    }
    return best;
  };
  const release = (dx: number) => {
    const tag = Math.abs(dx) < TAP_SLOP && latest.current.onTick ? tickAt(grabbedAt.current) : null;
    if (tag) latest.current.onTick!(tag);
    else latest.current.onDrop(valueAt(grabbedAt.current + dx));
  };

  const valueAt = (x: number) => (Math.min(Math.max(x, 0), width.current) / width.current) * latest.current.max;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        grabbedAt.current = e.nativeEvent.locationX;
        latest.current.onDrag(valueAt(grabbedAt.current));
      },
      onPanResponderMove: (_, g) => latest.current.onDrag(valueAt(grabbedAt.current + g.dx)),
      onPanResponderRelease: (_, g) => release(g.dx),
      onPanResponderTerminate: (_, g) => latest.current.onDrop(valueAt(grabbedAt.current + g.dx)),
    }),
  ).current;

  const percent = `${max > 0 ? (value / max) * 100 : 0}%` as const;
  const marks: { at: number; wide: boolean }[] = [];
  if (max > 0)
    for (const tag of ticks) {
      const at = Math.min(tag.at_sec / max, 1);
      const last = marks[marks.length - 1];
      if (last && at - last.at < TICK_MERGE) last.wide = true;
      else marks.push({ at, wide: false });
    }
  return (
    <View style={s.seek} onLayout={(e) => (width.current = e.nativeEvent.layout.width || 1)} {...pan.panHandlers}>
      <View style={s.track} pointerEvents="none">
        <View style={[s.filled, { width: percent }]} />
      </View>
      {marks.map((mark, i) => (
        <View key={i} style={[s.tick, mark.wide && s.tickWide, { left: `${mark.at * 100}%` }]} pointerEvents="none" />
      ))}
      <View style={[s.knob, { left: percent }]} pointerEvents="none" />
    </View>
  );
}

/** Shuffle asks what to play: songs not yet called mine, or only Mine. */
export const askShuffle = (pick: (pool: Pool) => void) =>
  Alert.alert('Shuffle', undefined, [
    { text: 'Unsorted', onPress: () => pick('unsorted') },
    { text: 'Mine', onPress: () => pick('mine') },
    { text: 'Cancel', style: 'cancel' },
  ]);

/** Touch handlers that call onSwipe on an upward swipe and leave taps to whatever is inside. */
function useSwipeUp(onSwipe: () => void) {
  const latest = useRef(onSwipe);
  latest.current = onSwipe;
  return useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_UP || g.vy < -SWIPE_UP_SPEED) latest.current();
      },
    }),
  ).current.panHandlers;
}

/**
 * Touch handlers for an empty area: it takes the touch as the finger lands, like the sheet's grab area, and calls onSwipe
 * on an upward swipe. Waiting for the finger to move first (useSwipeUp) never got the touch inside the player sheet.
 */
function useBlankSwipeUp(onSwipe: () => void) {
  const latest = useRef(onSwipe);
  latest.current = onSwipe;
  return useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if ((g.dy < -SWIPE_UP || g.vy < -SWIPE_UP_SPEED) && Math.abs(g.dy) > Math.abs(g.dx)) latest.current();
      },
    }),
  ).current.panHandlers;
}

/** Open eye while the buttons show, crossed out while they're hidden. Drawn, so it needs no icon package. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <View style={s.eye}>
      <View style={s.eyeLid}>
        <View style={s.eyePupil} />
      </View>
      {crossed ? <View style={s.eyeSlash} /> : null}
    </View>
  );
}

/** Two arrows, one each way. Drawn, like the eye. */
function ShuffleIcon({ color }: { color: string }) {
  return (
    <View style={s.shuffleIcon}>
      <View style={s.arrowRow}>
        <View style={[s.arrowBar, { backgroundColor: color }]} />
        <View style={[s.arrowHeadRight, { borderLeftColor: color }]} />
      </View>
      <View style={s.arrowRow}>
        <View style={[s.arrowHeadLeft, { borderRightColor: color }]} />
        <View style={[s.arrowBar, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** The 5-second Undo. Sits above the bar and survives changing screens, because it belongs to the player. */
export function UndoToast({ aboveButtons = false }: { aboveButtons?: boolean }) {
  const { undo, message } = usePlayer();
  const style = [s.toast, aboveButtons && s.toastAboveButtons];
  if (message) {
    return (
      <View style={style}>
        <Text style={s.toastText}>{message}</Text>
      </View>
    );
  }
  if (!undo) return null;
  return (
    <Pressable style={style} onPress={player.tapUndo}>
      <Text style={s.toastText} numberOfLines={1}>Hidden: {undo.title}</Text>
      <Text style={s.toastUndo}>Undo</Text>
    </Pressable>
  );
}

/** Near the bottom of every screen once something has played. */
export function NowPlayingBar() {
  const { song, wanted, sorting, trouble, note, comparing } = usePlayer();
  const swipe = useSwipeUp(() => player.open('queue'));
  if (!song) return null;
  return (
    // Tap opens the player; swipe up opens Queue straight away.
    <View {...swipe}>
      <Pressable style={s.bar} onPress={() => player.open('player')}>
        <View style={s.barText}>
          <Text style={s.barTitle} numberOfLines={1}>{song.title}</Text>
          <Text style={s.barDetail} numberOfLines={2}>{comparing ? 'Comparing versions' : trouble || note || (sorting ? 'Sorting' : wanted ? 'Playing' : 'Paused')}</Text>
        </View>
        <Pressable style={s.barButton} onPress={player.toggle} hitSlop={8}>
          <Text style={s.barButtonText}>{wanted ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable style={s.barButton} onPress={player.next} hitSlop={8}>
          <Text style={s.barButtonText}>Next</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

function FullPlayer() {
  const { song, order, wanted: playerWanted, time: playerTime, duration: playerDuration, note, trouble, timeLeft, sorting, buttonsHidden, pool } = usePlayer();
  const [dragAt, setDragAt] = useState<number | null>(null);
  const [seekingTo, setSeekingTo] = useState<number | null>(null);
  const swipe = useBlankSwipeUp(() => player.open('queue'));
  const hidden = useRef(new Animated.Value(buttonsHidden ? 1 : 0)).current;
  // Compare lives inside the player (6.6): it owns the sound, so the title, seek bar and Play/Pause are its. The buttons
  // never change or move; Previous, Next and Shuffle mean another song, which ends Compare first (Done, then the move)
  const cmp = useCompare();
  const comparing = cmp.open;
  const time = comparing ? cmp.sound.time : playerTime;
  const duration = comparing ? cmp.sound.duration : playerDuration;
  const shownId = comparing ? cmp.sound.sounding || cmp.ids[0] : song?.id;
  const wanted = comparing ? cmp.sound.playing : playerWanted;
  const pulse = useRef(new Animated.Value(1)).current;
  const leavingCompare = (then: () => void) => () => {
    if (compare.busy()) compare.done();
    then();
  };

  // the wait: "Compare" pulses in place (opacity only, so it can't change width)
  useEffect(() => {
    if (!cmp.preparing) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [cmp.preparing, pulse]);

  useEffect(() => {
    Animated.timing(hidden, { toValue: buttonsHidden ? 1 : 0, duration: HIDE_MS, useNativeDriver: true }).start();
  }, [buttonsHidden, hidden]);

  // Next or another song while typing: the draft is saved to the song it was tapped on
  const { draft } = useTagLine();
  const lastSong = useRef(song?.id);
  useEffect(() => {
    if (draft && lastSong.current === draft.songId && song?.id !== draft.songId) tagLine.finish(song?.id);
    lastSong.current = song?.id;
  }, [song?.id]);

  const drop = async (value: number) => {
    setDragAt(null);
    if (!duration) return;
    setSeekingTo(value);
    await (comparing ? compare.seek(value) : player.seek(value));
    setSeekingTo(null);
  };

  const shown = Math.min(dragAt ?? seekingTo ?? time, duration || 0);
  const tags = useTags(shownId);
  const isMine = player.isMine();
  const shuffleOn = !!order?.shuffle;
  return (
    <View style={s.page}>
      <View style={s.topRow}>
        <HomeButton />
      </View>
      <View style={s.pageTop}>
        {/* two lines' height always, so a longer version name never moves the bar */}
        <View style={s.titleBox}>
          <Text style={s.title} numberOfLines={2}>{comparing ? versions.songTitle(shownId ?? '') : song?.title}</Text>
        </View>
        <SeekBar value={shown} max={duration} onDrag={setDragAt} onDrop={drop} ticks={tags} onTick={comparing ? undefined : (tag) => (setDragAt(null), jumpToTag(tag))} />
        <View style={s.times}>
          <Text style={s.time}>{clock(shown)}</Text>
          <Pressable style={s.timeTap} onPress={player.toggleTimeLeft}>
            <Text style={s.time}>{timeLeft ? `-${clock(Math.max(duration - shown, 0))}` : clock(duration)}</Text>
          </Pressable>
        </View>
        {/* also the player's own note when nothing about tags is showing */}
        <ReservedLine songId={song?.id} duration={duration} fallback={trouble || note} />
        {/* the same buttons in Compare: Play/Pause works the version heard, the rest end Compare first */}
        <View style={s.slot}>
          <View style={s.controls}>
            <Pressable style={s.button} onPress={leavingCompare(player.previous)}>
              <Text style={s.buttonText}>Previous</Text>
            </Pressable>
            <Pressable style={[s.button, s.play]} onPress={comparing ? compare.toggle : player.toggle}>
              <Text style={[s.buttonText, s.playText]}>{wanted ? 'Pause' : 'Play'}</Text>
            </Pressable>
            <Pressable style={s.button} onPress={leavingCompare(player.next)}>
              <Text style={s.buttonText}>Next</Text>
            </Pressable>
            {/* on: filled, like Mine. Hidden while sorting, its width kept so the row never shifts */}
            {sorting ? (
              <View style={s.shuffle} />
            ) : (
              <Pressable
                style={[s.button, s.shuffle, shuffleOn && s.shuffleOn]}
                onPress={leavingCompare(() =>
                  shuffleOn
                    ? (player.setShuffleOn(false), say({ text: 'Shuffle ', bold: 'off' }))
                    : askShuffle((picked) => (player.setShuffleOn(true, picked), say({ text: 'Shuffle: ', bold: picked === 'mine' ? 'Mine' : 'unsorted' }))),
                )}
                accessibilityLabel={shuffleOn ? `Shuffle on, ${pool === 'mine' ? 'Mine' : 'unsorted'}` : 'Shuffle off'}
              >
                <ShuffleIcon color={shuffleOn ? '#111' : '#8e8e93'} />
              </Pressable>
            )}
          </View>
        </View>
        {!shownId ? null : (
          <View style={s.versionRow}>
            {!comparing && (sorting || player.isOut()) ? null : (
              <>
                {/* never a sheet over this sheet (iOS froze on that): the player closes first, then the next screen opens */}
                {/* already in a group: hidden, its Versions chip and Compare do the work */}
                {versions.members(shownId).length > 1 ? null : (
                  <Pressable onPress={() => player.closeThen(() => openLibrarySelect(shownId))}>
                    <Text style={s.link}>+ Version</Text>
                  </Pressable>
                )}
                <VersionsChip id={shownId} onPress={() => player.closeThen(() => versions.openVersions(shownId))} />
                {/* one fixed-width slot: the Compare word, or in Compare the wheel in its place, so nothing beside it moves */}
                {versions.members(shownId).length > 1 ? (
                  <View style={s.compareSlot}>
                    {comparing ? (
                      <CompareDial />
                    ) : (
                      <Animated.View style={{ opacity: pulse }}>
                        <Pressable onPress={() => compare.openFromPlayer(player.url())}>
                          <Text style={s.link}>Compare</Text>
                        </Pressable>
                      </Animated.View>
                    )}
                  </View>
                ) : null}
              </>
            )}
            {/* hidden in Compare: its ticks and rows would be another version's */}
            {comparing ? null : <TagsButton songId={shownId} tags={tags} />}
          </View>
        )}
        <View style={s.backRow}>
          {/* while comparing, Back is Done: same spot, same size */}
          <Pressable onPress={comparing ? compare.done : () => player.open('none')}>
            <Text style={s.link}>{comparing ? 'Done' : 'Back'}</Text>
          </Pressable>
          {/* the most-used button: full-size, the thumb's side. Its slot stays in Compare so Done never moves */}
          {comparing || !song ? <View style={s.tagSlot} /> : <TagButton songId={song.id} title={song.title} />}
        </View>
      </View>
      {/* the song's tags, while Tags · N has them open; the space under them is the swipe area */}
      <View style={s.tagZone}>
        {comparing ? null : <TagList songId={shownId} tags={tags} time={shown} />}
        {/* The blank space under the tags: a swipe up opens Queue, a tap does nothing. */}
        <View style={s.swipeZone} {...(comparing ? {} : swipe)} />
      </View>
      {/* Keeps its height with the buttons hidden or gone, so nothing above it jumps. */}
      <View style={s.dock}>
        {sorting ? null : (
          <Animated.View style={{ transform: [{ translateY: hidden.interpolate({ inputRange: [0, 1], outputRange: [0, EYE_DROP] }) }] }}>
            <Pressable
              style={s.hideTap}
              onPress={player.toggleButtonsHidden}
              accessibilityLabel={buttonsHidden ? 'Show buttons' : 'Hide buttons'}
            >
              <EyeIcon crossed={buttonsHidden} />
            </Pressable>
          </Animated.View>
        )}
        <Animated.View
          style={[s.verdicts, { transform: [{ translateY: hidden.interpolate({ inputRange: [0, 1], outputRange: [0, VERDICT_DROP] }) }] }]}
          pointerEvents={buttonsHidden || comparing ? 'none' : 'auto'}
        >
          {/* only the eye shows or hides these; in Compare they stay as the eye says, dimmed, and take no taps */}
          {player.isOut() || sorting ? null : (
            <View style={[s.verdictPair, comparing && s.verdictsResting]}>
              <Pressable style={[s.verdict, isMine && s.mineOn]} onPress={player.tapMine}>
                <Text style={[s.verdictText, isMine && s.playText]}>Mine</Text>
              </Pressable>
              <Pressable style={s.verdict} onPress={player.tapNotMine}>
                <Text style={s.verdictText}>Not mine</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
      <UndoToast aboveButtons />
      <VersionsToast />
    </View>
  );
}

/** Up next with one row moved to its slot. */
const withRowAt = (rows: string[], id: string, slot: number) => {
  const out = rows.filter((one) => one !== id);
  out.splice(slot, 0, id);
  return out;
};

function QueueRow({ id, sorting }: { id: string; sorting: boolean }) {
  const lift = useReorderableDrag();
  const lifted = useIsActive();
  return (
    <Pressable
      style={[s.queueRow, lifted && s.queueLifted]}
      onPress={() => player.jump(id)}
      onLongPress={sorting ? undefined : lift}
      delayLongPress={HOLD_MS}
    >
      <Text style={s.queueSong} numberOfLines={1}>{player.titleOf(id)}</Text>
      {sorting ? null : <Text style={s.queueGrip}>≡</Text>}
    </Pressable>
  );
}

function Queue() {
  const { song, order, marks, sorting } = usePlayer();
  const live = useMemo(() => player.upNext(), [order, marks]);
  // Rows stay frozen while one is lifted, so a song ending mid-drag can't move them under the finger.
  const [frozen, setFrozen] = useState<string[] | null>(null);
  const rows = frozen ?? live;
  const shown = useRef(rows);
  shown.current = rows;

  const freeze = useCallback(() => setFrozen(shown.current), []);
  const thaw = useCallback(() => setFrozen(null), []);
  const onDragStart = useCallback(() => {
    'worklet';
    runOnJS(tick)();
    runOnJS(freeze)();
  }, [freeze]);
  const onIndexChange = useCallback(() => {
    'worklet';
    runOnJS(tick)();
  }, []);
  // A row dropped where it started never reaches onReorder, so it thaws here.
  const onDragEnd = useCallback((e: ReorderableListDragEndEvent) => {
    'worklet';
    if (e.from === e.to) runOnJS(thaw)();
  }, [thaw]);

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => {
    const id = shown.current[from];
    const moved = withRowAt(shown.current, id, to);
    setFrozen(null);
    player.moveUpNext(id, to > 0 ? moved[to - 1] : null);
  };

  return (
    <View style={s.queue}>
      <View style={s.queueHeader}>
        <Pressable onPress={player.closeQueue}>
          <Text style={s.link}>Back</Text>
        </Pressable>
        <Text style={s.queueTitle}>Queue</Text>
        <HomeButton />
      </View>
      <Text style={s.queueLabel}>Now playing</Text>
      <Text style={s.queueNow} numberOfLines={1}>{song?.title}</Text>
      <Text style={s.queueLabel}>Up next</Text>
      <ReorderableList
        style={s.queueList}
        data={rows}
        dragEnabled={!sorting}
        shouldUpdateActiveItem
        animationDuration={SLIDE_MS}
        autoscrollThreshold={EDGE_ZONE}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onIndexChange={onIndexChange}
        onReorder={onReorder}
        keyExtractor={(id) => id}
        ListEmptyComponent={<Text style={s.queueEmpty}>Nothing after this song</Text>}
        renderItem={({ item }) => <QueueRow id={item} sorting={sorting} />}
      />
    </View>
  );
}

/**
 * Not an iOS sheet: its own pull-down fights a held song and can't be limited to one area. Only the grab area at the
 * top pulls this one, so nothing inside it can move it.
 */
export function PlayerSheet() {
  const { sheet, song, queueFrom, comparing } = usePlayer();
  // Compare from a Library group may have no queue song: the sheet still opens, on the group
  const visible = sheet !== 'none' && (!!song || comparing);
  const wasVisible = useRef(visible);

  // the sheet closing, any way at all, counts as Done in Compare: the sound carries on as Done leaves it
  useEffect(() => {
    if (wasVisible.current && !visible) compare.done();
    wasVisible.current = visible;
  }, [visible]);
  const pulled = useRef(new Animated.Value(0)).current;
  // Queue opened from the player pulls down to the player, not all the way out.
  const toPlayer = useRef(false);
  toPlayer.current = sheet === 'queue' && queueFrom === 'player';

  useEffect(() => {
    if (visible) pulled.setValue(0);
  }, [visible, pulled]);

  const grab = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => pulled.setValue(Math.max(g.dy, 0)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_PULL || g.vy > CLOSE_SPEED) {
          const back = toPlayer.current;
          Animated.timing(pulled, { toValue: Dimensions.get('window').height, duration: CLOSE_MS, useNativeDriver: true }).start(() => {
            if (!back) return player.open('none');
            player.open('player');
            Animated.timing(pulled, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }).start();
          });
        } else {
          Animated.spring(pulled, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(pulled, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => (sheet === 'queue' ? player.closeQueue() : player.open('none'))}
      onDismiss={player.runAfterClose}
    >
      <GestureHandlerRootView style={s.sheetRoot}>
        <Animated.View style={[s.sheet, { transform: [{ translateY: pulled }] }]}>
          <View style={s.grabArea} {...grab.panHandlers}>
            <View style={s.grabMark} />
          </View>
          {sheet === 'queue' ? <Queue /> : <FullPlayer />}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 16, paddingRight: 8, paddingTop: 10, paddingBottom: 30, backgroundColor: '#222', borderTopColor: '#333', borderTopWidth: 1 },
  barText: { flex: 1 },
  barTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  barDetail: { color: '#888', fontSize: 12, marginTop: 2 },
  barButton: { paddingVertical: 12, paddingHorizontal: 10 },
  barButtonText: { color: '#8ab4f8', fontSize: 15, fontWeight: '600' },
  sheetRoot: { flex: 1 },
  sheet: { flex: 1, marginTop: SHEET_TOP, backgroundColor: '#111', borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
  grabArea: { height: 44, alignItems: 'center', justifyContent: 'center' },
  grabMark: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#555' },
  page: { flex: 1, backgroundColor: '#111' },
  // beside the grab mark, only as wide as Home, so the rest of the grab area still pulls the sheet down
  topRow: { alignSelf: 'flex-end', marginTop: -44, height: 44, justifyContent: 'center', paddingRight: 8 },
  versionRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 46, marginTop: -8 },
  pageTop: { paddingHorizontal: 24, gap: 12 },
  tagZone: { flex: 1, marginTop: 8, paddingHorizontal: 24 },
  swipeZone: { flex: 1, minHeight: 24 },
  backRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -8 },
  tagSlot: { width: 56, height: 48 },
  dock: { height: 160, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 40 },
  hideTap: { height: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 24, marginBottom: 8 },
  eye: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  eyeLid: { width: 28, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#aaa', alignItems: 'center', justifyContent: 'center' },
  eyePupil: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#aaa' },
  eyeSlash: { position: 'absolute', width: 32, height: 2, backgroundColor: '#aaa', transform: [{ rotate: '-35deg' }] },
  verdicts: { height: 56, flexDirection: 'row', gap: 12 },
  verdictPair: { flex: 1, flexDirection: 'row', gap: 12 },
  verdictsResting: { opacity: 0.35 },
  verdict: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#555' },
  verdictText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  titleBox: { height: 72, justifyContent: 'flex-end' },
  title: { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '700', textAlign: 'center' },
  seek: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#444', overflow: 'hidden' },
  filled: { height: 6, backgroundColor: '#8ab4f8' },
  tick: { position: 'absolute', top: 12, width: 2, height: 10, marginLeft: -1, borderRadius: 1, backgroundColor: '#f5b041' },
  tickWide: { width: 4, marginLeft: -2 },
  knob: { position: 'absolute', width: 18, height: 18, borderRadius: 9, marginLeft: -9, backgroundColor: '#fff' },
  times: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -12 },
  time: { color: '#ddd', fontSize: 14, fontVariant: ['tabular-nums'] },
  timeTap: { paddingVertical: 14, paddingLeft: 32 },
  slot: { height: SLOT_HEIGHT, marginTop: 8, justifyContent: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  shuffle: { width: 48, alignItems: 'center' },
  shuffleOn: { backgroundColor: '#8ab4f8', borderColor: '#8ab4f8' },
  shuffleIcon: { width: 20, height: 22, justifyContent: 'center', gap: 5 },
  arrowRow: { flexDirection: 'row', alignItems: 'center' },
  arrowBar: { flex: 1, height: 2 },
  arrowHeadRight: { width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 6, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  arrowHeadLeft: { width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderRightWidth: 6, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  compareSlot: { width: WHEEL_WIDTH, height: 46, justifyContent: 'center', alignItems: 'flex-end' }, // the closed word ends where the pill does (6.7)
  button: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#555' },
  buttonText: { color: '#fff', fontSize: 16 },
  play: { minWidth: 92, alignItems: 'center', backgroundColor: '#fff', borderColor: '#fff' },
  playText: { color: '#111', fontWeight: '700' },
  mineOn: { backgroundColor: '#8ab4f8', borderColor: '#8ab4f8' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 40, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 8, backgroundColor: '#333' },
  toastAboveButtons: { left: 24, right: 24, bottom: 104 },
  toastText: { flex: 1, color: '#fff', fontSize: 15 },
  toastUndo: { color: '#8ab4f8', fontSize: 16, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, paddingHorizontal: 8, paddingVertical: 13, textAlign: 'center' },
  queue: { flex: 1, backgroundColor: '#111', paddingHorizontal: 16 },
  queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  queueTitle: { color: '#fff', fontSize: 26, fontWeight: '700' },
  queueLabel: { color: '#888', fontSize: 13, marginTop: 8, marginBottom: 4 },
  queueNow: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 12 },
  queueList: { flex: 1 },
  queueRow: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderBottomColor: '#2a2a2a', borderBottomWidth: 1 },
  queueLifted: { backgroundColor: '#2a2a2a', borderRadius: 6 },
  queueSong: { flex: 1, color: '#fff', fontSize: 16 },
  queueGrip: { color: '#555', fontSize: 20, paddingLeft: 16 },
  queueEmpty: { color: '#888', fontSize: 15, paddingTop: 16 },
});
