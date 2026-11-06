// The Compare sheet: one version showing on a dial, swipe up or down to the next, and the sound flips when the dial
// rests, at the same second. compareStore.ts holds the logic; this only draws it.
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { clock, compare, useCompare } from './compareStore';
import { SeekBar } from './Player';
import { usePlayer } from './playerStore';
import { isPicked, songInfo, songTitle, useVersions } from './versionStore';

const DIAL_HEIGHT = 120;
const NO_MOMENTUM_MS = 250;

function Dial() {
  const { ids, at, can, sound } = useCompare();
  const scroller = useRef<ScrollViewInstance>(null);
  const resting = useRef(at);
  const noMomentum = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // the dial follows the store when it moves without a swipe: Back to the last one, or a version removed elsewhere
  useEffect(() => {
    if (resting.current === at) return;
    resting.current = at;
    scroller.current?.scrollTo({ y: at * DIAL_HEIGHT, animated: true });
  }, [at]);

  const blocked = (id: string) => can[id] === 'cloud' || can[id] === 'missing' || can[id] === 'unreachable';

  const settle = (y: number) => {
    clearTimeout(noMomentum.current);
    let index = Math.min(Math.max(Math.round(y / DIAL_HEIGHT), 0), ids.length - 1);
    // a row that can't play is stepped over in the direction of the swipe; none further: back where it was
    if (blocked(ids[index])) {
      const step = index >= resting.current ? 1 : -1;
      let next = index + step;
      while (next >= 0 && next < ids.length && blocked(ids[next])) next += step;
      index = next >= 0 && next < ids.length ? next : resting.current;
      scroller.current?.scrollTo({ y: index * DIAL_HEIGHT, animated: true });
    }
    resting.current = index;
    compare.rest(index);
  };

  const onDragEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    noMomentum.current = setTimeout(() => settle(y), NO_MOMENTUM_MS);
  };

  return (
    <View style={s.dialFrame}>
      <Text style={s.hint}>▲</Text>
      <ScrollView
        ref={scroller}
        style={s.dial}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: at * DIAL_HEIGHT }}
        onScrollEndDrag={onDragEnd}
        onMomentumScrollBegin={() => clearTimeout(noMomentum.current)}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      >
        {ids.map((id, i) => {
          const refusal = compare.refusal(id);
          const length = sound.lengths[id];
          const tag = id === sound.sounding ? 'Playing' : id === sound.pending ? 'Loading' : refusal ?? '';
          return (
            <View key={id} style={s.dialRow}>
              <Text style={[s.dialTitle, refusal && s.off]} numberOfLines={2}>{songTitle(id)}</Text>
              <Text style={s.dialDetail} numberOfLines={1}>
                {[i === 0 ? (isPicked(id) ? 'Main, your pick' : 'Main') : null, songInfo(id)?.date, length ? clock(length) : null]
                  .filter(Boolean).join(' · ')}
              </Text>
              <Text style={[s.tag, id === sound.sounding && s.tagOn]}>{tag || ' '}</Text>
            </View>
          );
        })}
      </ScrollView>
      <Text style={s.hint}>▼</Text>
    </View>
  );
}

function CompareSheet() {
  const { ids, at, can, last, sound, open } = useCompare();
  const { families } = useVersions();
  const [dragAt, setDragAt] = useState<number | null>(null);
  const [seekingTo, setSeekingTo] = useState<number | null>(null);

  useEffect(() => compare.familyChanged(), [families]);

  if (!open) return null;
  const playable = ids.filter((id) => can[id] === 'ok' || can[id] === 'checking').length;
  const shown = Math.min(dragAt ?? seekingTo ?? sound.time, sound.duration || 0);
  const drop = async (value: number) => {
    setDragAt(null);
    if (!sound.duration) return;
    setSeekingTo(value);
    await compare.seek(value);
    setSeekingTo(null);
  };
  const lastIndex = last ? ids.indexOf(last) : -1;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={compare.done}>
      <View style={s.sheet}>
        <View style={s.header}>
          <Pressable onPress={compare.done}>
            <Text style={s.link}>Done</Text>
          </Pressable>
          <Text style={s.title}>Compare</Text>
        </View>
        <Dial />
        <Text style={s.count}>{at + 1} of {ids.length}</Text>
        {playable < 2 ? <Text style={s.note}>Only one version can play right now.</Text> : null}
        {lastIndex >= 0 && last !== sound.sounding ? (
          <Pressable onPress={() => compare.rest(lastIndex)}>
            <Text style={s.link} numberOfLines={1}>Back to {songTitle(last!)}</Text>
          </Pressable>
        ) : (
          <Text style={s.link}> </Text>
        )}
        <SeekBar value={shown} max={sound.duration} onDrag={setDragAt} onDrop={drop} />
        <View style={s.times}>
          <Text style={s.time}>{clock(shown)}</Text>
          <Text style={s.time}>{clock(sound.duration)}</Text>
        </View>
        <Pressable style={s.play} onPress={compare.toggle}>
          <Text style={s.playText}>{sound.playing ? 'Pause' : 'Play'}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** Mounted once. iOS shows one sheet at a time, so Compare waits until the player sheet has gone. */
export function CompareLayer() {
  const { sheet } = usePlayer();
  return sheet === 'none' ? <CompareSheet /> : null;
}

const s = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#161616', paddingTop: 16, paddingHorizontal: 20, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8, textAlign: 'center' },
  dialFrame: { alignItems: 'center' },
  hint: { color: '#555', fontSize: 14 },
  dial: { height: DIAL_HEIGHT, alignSelf: 'stretch', borderRadius: 12, backgroundColor: '#222' },
  dialRow: { height: DIAL_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  dialTitle: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  dialDetail: { color: '#999', fontSize: 14, marginTop: 4 },
  tag: { color: '#888', fontSize: 13, marginTop: 4, fontWeight: '600' },
  tagOn: { color: '#8ab4f8' },
  off: { color: '#666' },
  count: { color: '#888', fontSize: 14, textAlign: 'center' },
  note: { color: '#d9a', fontSize: 14, textAlign: 'center' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  time: { color: '#ddd', fontSize: 14, fontVariant: ['tabular-nums'] },
  play: { alignSelf: 'center', minWidth: 120, alignItems: 'center', paddingVertical: 14, borderRadius: 8, backgroundColor: '#fff', marginTop: 16 },
  playText: { color: '#111', fontSize: 16, fontWeight: '700' },
});
