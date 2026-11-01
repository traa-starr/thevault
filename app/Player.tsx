// The player: streams songs from the laptop, nothing saved on the phone. Leaving it stops the music.
// Mine and Not mine go through the outbox, so they work with the laptop off.
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { addChange } from './outbox';
import { nextInOrder, previousInOrder, removeFromOrder, setShuffle, startOrder, type Order } from './playOrder';

export type PlayerSong = { id: string; title: string; mine: string; sorted: boolean };

const UPDATE_MS = 500;
const STALL_MS = 10000;
const PROBE_TIMEOUT_MS = 5000;
const UNDO_MS = 5000;

const clock = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

// A stuck player doesn't say why, so ask the server. HEAD opens no music file.
async function whyStuck(audioUrl: string) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(audioUrl, { method: 'HEAD', signal: abort.signal });
    if (r.ok) return 'Still trying to load this song…';
    return r.status === 409 ? 'This song is cloud only now' : "Couldn't play this song";
  } catch {
    return 'Laptop not reachable';
  } finally {
    clearTimeout(timer);
  }
}

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

type PlayerProps = { url: string; songs: PlayerSong[]; start: number; shuffle: boolean; onBack: () => void };

export default function Player({ url, songs, start, shuffle, onBack }: PlayerProps) {
  const player = useAudioPlayer(null, { updateInterval: UPDATE_MS });
  const status = useAudioPlayerStatus(player);
  const [order, setOrder] = useState(() => startOrder(start, shuffle));
  const [wanted, setWanted] = useState(true);
  const [dragAt, setDragAt] = useState<number | null>(null);
  const [seekingTo, setSeekingTo] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [trouble, setTrouble] = useState('');
  const [marks, setMarks] = useState<Record<string, { mine: string; sorted: boolean }>>({});
  const [undo, setUndo] = useState<{ order: Order; id: string } | null>(null);
  const song = songs[order.current];
  const audioUrl = (id: string) => `${url}/songs/${id}/audio`;
  const markOf = (one: PlayerSong) => marks[one.id] ?? one;
  // while sorting, shuffle only lands on songs not yet called mine
  const avoid = () => songs.flatMap((one, position) => (markOf(one).mine === 'mine' ? [position] : []));

  const load = (index: number) => {
    setSeekingTo(null);
    setNote('');
    setWanted(true);
    player.replace({ uri: audioUrl(songs[index].id) });
    player.play();
  };

  useEffect(() => {
    let live = true;
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' })
      .catch(() => {})
      .finally(() => {
        if (live) load(start);
      });
    return () => {
      live = false;
    };
  }, []);

  const next = (finished: boolean) => {
    const moved = nextInOrder(order, songs.length, Math.random, avoid());
    if (moved) {
      setOrder(moved);
      load(moved.current);
      return;
    }
    setNote('Played every song in this list');
    if (finished) {
      setWanted(false);
      player.pause();
      player.seekTo(0).catch(() => {});
    }
  };

  const previous = () => {
    const moved = previousInOrder(order, songs.length);
    if (moved) {
      setOrder(moved);
      load(moved.current);
    } else {
      player.seekTo(0).catch(() => {});
    }
  };

  const tapMine = () => {
    const mark = markOf(song);
    if (mark.mine === 'mine' && mark.sorted) {
      addChange('mine_restore', song.id);
      const { [song.id]: mine, ...others } = marks;
      setMarks(mine ? others : { ...marks, [song.id]: { mine: 'unknown', sorted: false } });
    } else {
      addChange('mine_set', song.id, 'mine');
      setMarks({ ...marks, [song.id]: { mine: 'mine', sorted: true } });
    }
  };

  const tapNotMine = () => {
    addChange('mine_set', song.id, 'not mine');
    setUndo({ order, id: song.id });
    const out = removeFromOrder(order);
    const moved = nextInOrder(out, songs.length, Math.random, avoid());
    setOrder(moved ?? out);
    if (moved) {
      load(moved.current);
    } else {
      setNote('No more songs in this list');
      setWanted(false);
      player.pause();
    }
  };

  const tapUndo = () => {
    if (!undo) return;
    addChange('mine_restore', undo.id);
    setOrder(undo.order);
    load(undo.order.current);
    setUndo(null);
  };

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const toggle = () => {
    if (wanted) player.pause();
    else player.play();
    setWanted(!wanted);
  };

  const drop = async (value: number) => {
    setDragAt(null);
    if (!status.duration) return;
    setSeekingTo(value);
    try {
      await player.seekTo(value);
    } catch {
      // the song changed or the player closed while seeking: nothing to do
    }
    setSeekingTo(null);
  };

  useEffect(() => {
    if (status.didJustFinish) next(true);
  }, [status.didJustFinish]);

  // No progress while it should be playing: say why. Any progress clears the message.
  useEffect(() => {
    setTrouble('');
    if (!wanted) return;
    let live = true;
    const timer = setInterval(async () => {
      const why = await whyStuck(audioUrl(song.id));
      if (live) setTrouble(why);
    }, STALL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [wanted, song.id, status.currentTime, url]);

  const shown = Math.min(dragAt ?? seekingTo ?? status.currentTime, status.duration || 0);
  const isMine = markOf(song).mine === 'mine';
  const isOut = order.removed.includes(order.current);
  return (
    <View style={s.page}>
      <Text style={s.title} numberOfLines={2}>{song.title}</Text>
      <Text style={s.note}>{trouble || note || ' '}</Text>
      <SeekBar value={shown} max={status.duration} onDrag={setDragAt} onDrop={drop} />
      <View style={s.times}>
        <Text style={s.time}>{clock(shown)}</Text>
        <Text style={s.time}>{clock(status.duration)}</Text>
      </View>
      <View style={s.controls}>
        <Pressable style={s.button} onPress={previous}>
          <Text style={s.buttonText}>Previous</Text>
        </Pressable>
        <Pressable style={[s.button, s.play]} onPress={toggle}>
          <Text style={[s.buttonText, s.playText]}>{wanted ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable style={s.button} onPress={() => next(false)}>
          <Text style={s.buttonText}>Next</Text>
        </Pressable>
      </View>
      {isOut ? null : (
        <View style={s.controls}>
          <Pressable style={[s.button, isMine && s.mineOn]} onPress={tapMine}>
            <Text style={[s.buttonText, isMine && s.playText]}>Mine</Text>
          </Pressable>
          <Pressable style={s.button} onPress={tapNotMine}>
            <Text style={s.buttonText}>Not mine</Text>
          </Pressable>
        </View>
      )}
      <Pressable onPress={() => setOrder(setShuffle(order, !order.shuffle))}>
        <Text style={[s.link, order.shuffle && s.linkOn]}>{order.shuffle ? 'Shuffle: on' : 'Shuffle: off'}</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={s.link}>Back</Text>
      </Pressable>
      {undo ? (
        <Pressable style={s.toast} onPress={tapUndo}>
          <Text style={s.toastText} numberOfLines={1}>Hidden: {songs.find((one) => one.id === undo.id)?.title}</Text>
          <Text style={s.toastUndo}>Undo</Text>
        </Pressable>
      ) : null}
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
  mineOn: { backgroundColor: '#8ab4f8', borderColor: '#8ab4f8' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 40, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 8, backgroundColor: '#333' },
  toastText: { flex: 1, color: '#fff', fontSize: 15 },
  toastUndo: { color: '#8ab4f8', fontSize: 16, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8, textAlign: 'center' },
  linkOn: { color: '#fff', fontWeight: '700' },
});
