// What you see of the player: the bar, the full player as a sheet, the queue and the Undo toast. The player itself is
// playerStore.ts, so closing any of these never touches the music.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import ReorderableList, { useIsActive, useReorderableDrag, type ReorderableListDragEndEvent, type ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { player, usePlayer } from './playerStore';

const ROW_HEIGHT = 48;
const HOLD_MS = 300; // not lower: a hold let go just short of this jumps to the song
const SLIDE_MS = 220;
const EDGE_ZONE = 0.15; // the share of the list, top and bottom, that scrolls it during a drag
const SHEET_TOP = 54; // clears the status bar and leaves the screen behind showing, like an iOS sheet
const CLOSE_PULL = 120;
const CLOSE_SPEED = 0.8;
const CLOSE_MS = 180;

const clock = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

type SeekBarProps = { value: number; max: number; onDrag: (value: number) => void; onDrop: (value: number) => void };

function SeekBar({ value, max, onDrag, onDrop }: SeekBarProps) {
  const width = useRef(1);
  const grabbedAt = useRef(0);
  const latest = useRef({ max, onDrag, onDrop });
  latest.current = { max, onDrag, onDrop };

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
      onPanResponderRelease: (_, g) => latest.current.onDrop(valueAt(grabbedAt.current + g.dx)),
      onPanResponderTerminate: (_, g) => latest.current.onDrop(valueAt(grabbedAt.current + g.dx)),
    }),
  ).current;

  const percent = `${max > 0 ? (value / max) * 100 : 0}%` as const;
  return (
    <View style={s.seek} onLayout={(e) => (width.current = e.nativeEvent.layout.width || 1)} {...pan.panHandlers}>
      <View style={s.track} pointerEvents="none">
        <View style={[s.filled, { width: percent }]} />
      </View>
      <View style={[s.knob, { left: percent }]} pointerEvents="none" />
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
  const { song, wanted, sorting, trouble, note } = usePlayer();
  if (!song) return null;
  return (
    <Pressable style={s.bar} onPress={() => player.open('player')}>
      <View style={s.barText}>
        <Text style={s.barTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={s.barDetail} numberOfLines={2}>{trouble || note || (sorting ? 'Sorting' : wanted ? 'Playing' : 'Paused')}</Text>
      </View>
      <Pressable style={s.barButton} onPress={player.toggle} hitSlop={8}>
        <Text style={s.barButtonText}>{wanted ? 'Pause' : 'Play'}</Text>
      </Pressable>
      <Pressable style={s.barButton} onPress={player.next} hitSlop={8}>
        <Text style={s.barButtonText}>Next</Text>
      </Pressable>
    </Pressable>
  );
}

function FullPlayer() {
  const { song, order, wanted, time, duration, note, trouble, timeLeft, sorting, buttonsHidden } = usePlayer();
  const [dragAt, setDragAt] = useState<number | null>(null);
  const [seekingTo, setSeekingTo] = useState<number | null>(null);

  const drop = async (value: number) => {
    setDragAt(null);
    if (!duration) return;
    setSeekingTo(value);
    await player.seek(value);
    setSeekingTo(null);
  };

  const shown = Math.min(dragAt ?? seekingTo ?? time, duration || 0);
  const isMine = player.isMine();
  return (
    <View style={s.page}>
      <View style={s.pageTop}>
        <Text style={s.title} numberOfLines={2}>{song?.title}</Text>
        <Text style={s.note}>{trouble || note || ' '}</Text>
        <SeekBar value={shown} max={duration} onDrag={setDragAt} onDrop={drop} />
        <View style={s.times}>
          <Text style={s.time}>{clock(shown)}</Text>
          <Pressable style={s.timeTap} onPress={player.toggleTimeLeft}>
            <Text style={s.time}>{timeLeft ? `-${clock(Math.max(duration - shown, 0))}` : clock(duration)}</Text>
          </Pressable>
        </View>
        <View style={s.controls}>
          <Pressable style={s.button} onPress={player.previous}>
            <Text style={s.buttonText}>Previous</Text>
          </Pressable>
          <Pressable style={[s.button, s.play]} onPress={player.toggle}>
            <Text style={[s.buttonText, s.playText]}>{wanted ? 'Pause' : 'Play'}</Text>
          </Pressable>
          <Pressable style={s.button} onPress={player.next}>
            <Text style={s.buttonText}>Next</Text>
          </Pressable>
        </View>
        {sorting ? null : (
          <Pressable onPress={() => player.setShuffleOn(!order?.shuffle)}>
            <Text style={[s.link, order?.shuffle && s.linkOn]}>{order?.shuffle ? 'Shuffle: on' : 'Shuffle: off'}</Text>
          </Pressable>
        )}
        <Pressable onPress={() => player.open('queue')}>
          <Text style={s.link}>Queue</Text>
        </Pressable>
        <Pressable onPress={() => player.open('none')}>
          <Text style={s.link}>Back</Text>
        </Pressable>
      </View>
      {/* Keeps its height with the buttons hidden or gone, so nothing above it jumps. */}
      <View style={s.dock}>
        {sorting ? null : (
          <Pressable style={s.hideTap} onPress={player.toggleButtonsHidden}>
            <Text style={s.hideText}>{buttonsHidden ? 'Show buttons' : 'Hide buttons'}</Text>
          </Pressable>
        )}
        <View style={s.verdicts}>
          {buttonsHidden || player.isOut() || sorting ? null : (
            <>
              <Pressable style={[s.verdict, isMine && s.mineOn]} onPress={player.tapMine}>
                <Text style={[s.verdictText, isMine && s.playText]}>Mine</Text>
              </Pressable>
              <Pressable style={s.verdict} onPress={player.tapNotMine}>
                <Text style={s.verdictText}>Not mine</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      <UndoToast aboveButtons />
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
    runOnJS(freeze)();
  }, [freeze]);
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
        <Pressable onPress={() => player.open('player')}>
          <Text style={s.link}>Back</Text>
        </Pressable>
        <Text style={s.queueTitle}>Queue</Text>
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
  const { sheet, song } = usePlayer();
  const visible = sheet !== 'none' && !!song;
  const pulled = useRef(new Animated.Value(0)).current;

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
          Animated.timing(pulled, { toValue: Dimensions.get('window').height, duration: CLOSE_MS, useNativeDriver: true }).start(() => player.open('none'));
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
      onRequestClose={() => player.open(sheet === 'queue' ? 'player' : 'none')}
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
  pageTop: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 8, gap: 12 },
  dock: { height: 160, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 40 },
  hideTap: { height: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 24, marginBottom: 8 },
  hideText: { color: '#888', fontSize: 13 },
  verdicts: { height: 56, flexDirection: 'row', gap: 12 },
  verdict: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#555' },
  verdictText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  title: { color: '#fff', fontSize: 30, fontWeight: '700', textAlign: 'center' },
  note: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  seek: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#444', overflow: 'hidden' },
  filled: { height: 6, backgroundColor: '#8ab4f8' },
  knob: { position: 'absolute', width: 18, height: 18, borderRadius: 9, marginLeft: -9, backgroundColor: '#fff' },
  times: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -12 },
  time: { color: '#ddd', fontSize: 14, fontVariant: ['tabular-nums'] },
  timeTap: { paddingVertical: 14, paddingLeft: 32 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 },
  button: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#555' },
  buttonText: { color: '#fff', fontSize: 16 },
  play: { minWidth: 92, alignItems: 'center', backgroundColor: '#fff', borderColor: '#fff' },
  playText: { color: '#111', fontWeight: '700' },
  mineOn: { backgroundColor: '#8ab4f8', borderColor: '#8ab4f8' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 40, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 8, backgroundColor: '#333' },
  toastAboveButtons: { left: 24, right: 24, bottom: 104 },
  toastText: { flex: 1, color: '#fff', fontSize: 15 },
  toastUndo: { color: '#8ab4f8', fontSize: 16, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, paddingHorizontal: 8, paddingVertical: 13, textAlign: 'center' },
  linkOn: { color: '#fff', fontWeight: '700' },
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
