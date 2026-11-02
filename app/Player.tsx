// What you see of the player: the bar, the full player as a sheet, the queue and the Undo toast. The player itself is
// playerStore.ts, so closing any of these never touches the music.
import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { player, usePlayer } from './playerStore';

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
export function UndoToast() {
  const { undo, message } = usePlayer();
  if (message) {
    return (
      <View style={s.toast}>
        <Text style={s.toastText}>{message}</Text>
      </View>
    );
  }
  if (!undo) return null;
  return (
    <Pressable style={s.toast} onPress={player.tapUndo}>
      <Text style={s.toastText} numberOfLines={1}>Hidden: {undo.title}</Text>
      <Text style={s.toastUndo}>Undo</Text>
    </Pressable>
  );
}

/** Near the bottom of every screen once something has played. */
export function NowPlayingBar() {
  const { song, wanted, sorting } = usePlayer();
  if (!song) return null;
  return (
    <Pressable style={s.bar} onPress={() => player.open('player')}>
      <View style={s.barText}>
        <Text style={s.barTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={s.barDetail}>{sorting ? 'Sorting' : wanted ? 'Playing' : 'Paused'}</Text>
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
  const { song, order, wanted, time, duration, note, trouble, timeLeft, sorting } = usePlayer();
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
      {player.isOut() || sorting ? null : (
        <View style={s.controls}>
          <Pressable style={[s.button, isMine && s.mineOn]} onPress={player.tapMine}>
            <Text style={[s.buttonText, isMine && s.playText]}>Mine</Text>
          </Pressable>
          <Pressable style={s.button} onPress={player.tapNotMine}>
            <Text style={s.buttonText}>Not mine</Text>
          </Pressable>
        </View>
      )}
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
      <UndoToast />
    </View>
  );
}

function Queue() {
  const { song, order, marks } = usePlayer();
  const ids = useMemo(() => player.upNext(), [order, marks]);
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
      <FlatList
        data={ids}
        keyExtractor={(id) => id}
        ListEmptyComponent={<Text style={s.queueEmpty}>Nothing after this song</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.queueRow} onPress={() => player.jump(item)}>
            <Text style={s.queueSong} numberOfLines={1}>{player.titleOf(item)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

/** Swiping the sheet down does the same as its Back button. */
export function PlayerSheet() {
  const { sheet, song } = usePlayer();
  return (
    <Modal
      visible={sheet !== 'none' && !!song}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => player.open(sheet === 'queue' ? 'player' : 'none')}
    >
      {sheet === 'queue' ? <Queue /> : <FullPlayer />}
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
  page: { flex: 1, backgroundColor: '#111', justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 30, fontWeight: '700', textAlign: 'center' },
  note: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
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
  toastText: { flex: 1, color: '#fff', fontSize: 15 },
  toastUndo: { color: '#8ab4f8', fontSize: 16, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8, textAlign: 'center' },
  linkOn: { color: '#fff', fontWeight: '700' },
  queue: { flex: 1, backgroundColor: '#111', paddingTop: 20, paddingHorizontal: 16 },
  queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  queueTitle: { color: '#fff', fontSize: 26, fontWeight: '700' },
  queueLabel: { color: '#888', fontSize: 13, marginTop: 8, marginBottom: 4 },
  queueNow: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 12 },
  queueRow: { height: 48, justifyContent: 'center', borderBottomColor: '#2a2a2a', borderBottomWidth: 1 },
  queueSong: { color: '#fff', fontSize: 16 },
  queueEmpty: { color: '#888', fontSize: 15, paddingTop: 16 },
});
