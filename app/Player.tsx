// Prototype player: made-up songs and a pretend clock, to feel the controls. No audio, no server calls.
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

const FAKE_SONGS = [
  { title: 'Fake Song One', seconds: 45 },
  { title: 'Placeholder Anthem', seconds: 132 },
  { title: 'Not a Real Track', seconds: 208 },
  { title: 'Demo Title Four', seconds: 20 },
];
const TICK_MS = 250;

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

  const percent = `${(value / max) * 100}%` as const;
  return (
    <View style={s.seek} onLayout={(e) => (width.current = e.nativeEvent.layout.width || 1)} {...pan.panHandlers}>
      <View style={s.track} pointerEvents="none">
        <View style={[s.filled, { width: percent }]} />
      </View>
      <View style={[s.knob, { left: percent }]} pointerEvents="none" />
    </View>
  );
}

export default function Player({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [dragAt, setDragAt] = useState<number | null>(null);
  const song = FAKE_SONGS[index];
  const dragging = dragAt !== null;

  const go = (step: number) => {
    setIndex((i) => (i + step + FAKE_SONGS.length) % FAKE_SONGS.length);
    setPosition(0);
  };

  useEffect(() => {
    if (!playing || dragging) return;
    const timer = setInterval(() => setPosition((p) => p + TICK_MS / 1000), TICK_MS);
    return () => clearInterval(timer);
  }, [playing, dragging]);

  useEffect(() => {
    if (position >= song.seconds && !dragging) go(1);
  }, [position, song.seconds, dragging]);

  const shown = Math.min(dragAt ?? position, song.seconds);
  return (
    <View style={s.page}>
      <Text style={s.title} numberOfLines={2}>{song.title}</Text>
      <Text style={s.note}>Prototype: made-up songs, no sound</Text>
      <SeekBar
        value={shown}
        max={song.seconds}
        onDrag={setDragAt}
        onDrop={(value) => {
          setPosition(value);
          setDragAt(null);
        }}
      />
      <View style={s.times}>
        <Text style={s.time}>{clock(shown)}</Text>
        <Text style={s.time}>{clock(song.seconds)}</Text>
      </View>
      <View style={s.controls}>
        <Pressable style={s.button} onPress={() => go(-1)}>
          <Text style={s.buttonText}>Previous</Text>
        </Pressable>
        <Pressable style={[s.button, s.play]} onPress={() => setPlaying(!playing)}>
          <Text style={[s.buttonText, s.playText]}>{playing ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable style={s.button} onPress={() => go(1)}>
          <Text style={s.buttonText}>Next</Text>
        </Pressable>
      </View>
      <Pressable onPress={onBack}>
        <Text style={s.link}>Back</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#111', justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 30, fontWeight: '700', textAlign: 'center' },
  note: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  seek: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#444', overflow: 'hidden' },
  filled: { height: 6, backgroundColor: '#8ab4f8' },
  knob: { position: 'absolute', width: 18, height: 18, borderRadius: 9, marginLeft: -9, backgroundColor: '#fff' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -12 },
  time: { color: '#ddd', fontSize: 14, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 },
  button: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#555' },
  buttonText: { color: '#fff', fontSize: 16 },
  play: { minWidth: 92, alignItems: 'center', backgroundColor: '#fff', borderColor: '#fff' },
  playText: { color: '#111', fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8, textAlign: 'center', marginTop: 16 },
});
