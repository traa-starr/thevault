// The inline Compare dial (board meeting 5): one row under the Compare button in the full player. Swipe sideways, or
// tap an arrow, to the next version; the sound flips when the dial rests, at the same second. The player's own seek bar
// and Play drive Compare while it's open. compareStore.ts holds the logic; this only draws it.
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import { compare, useCompare } from './compareStore';
import { dialTarget } from './playOrder';
import { isPicked, songTitle, useVersions } from './versionStore';

const ROW_HEIGHT = 50;
const NO_MOMENTUM_MS = 250;

export function CompareDial() {
  const { ids, at, sound } = useCompare();
  const { families } = useVersions();
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const resting = useRef(at);
  const noMomentum = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const steering = useRef<number | null>(null);
  const lastX = useRef(0);

  useEffect(() => compare.familyChanged(), [families]);
  useEffect(() => () => clearTimeout(noMomentum.current), []);

  const goTo = (index: number, animated = true) => {
    steering.current = animated ? index : null;
    scroller.current?.scrollTo({ x: index * width, animated });
  };

  // the dial follows the store when it moves without a swipe: a version removed elsewhere
  useEffect(() => {
    if (!width || resting.current === at) return;
    resting.current = at;
    goTo(at);
  }, [at, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w === width) return;
    setWidth(w);
    lastX.current = resting.current * w;
    requestAnimationFrame(() => scroller.current?.scrollTo({ x: resting.current * w, animated: false }));
  };

  // can't play, or not lined up after the wait: stepped over by swipes and arrows
  const blocked = (id: string) => !!compare.refusal(id) || compare.notReady(id);

  /** Rests on the row a swipe or an arrow aimed at: a row that can't play is stepped over (playOrder.ts dialTarget). */
  const restFrom = (landed: number, scroll = false) => {
    const index = dialTarget(resting.current, landed, ids.map((id) => !blocked(id)));
    if (scroll || index !== landed) goTo(index);
    resting.current = index;
    compare.rest(index);
  };

  const settle = (x: number) => {
    clearTimeout(noMomentum.current);
    if (!width) return;
    const landed = Math.min(Math.max(Math.round(x / width), 0), ids.length - 1);
    // our own move still running: a late event from the swipe that started it must not move the dial again
    if (steering.current !== null) {
      if (landed === steering.current) steering.current = null;
      else goTo(steering.current);
      return;
    }
    restFrom(landed);
  };

  // a slow drag that stops on a row sends no momentum events: settle once the dial has stopped on a row
  const waitForStop = (tries = 0) => {
    clearTimeout(noMomentum.current);
    noMomentum.current = setTimeout(() => {
      const x = lastX.current;
      const onRow = width > 0 && Math.abs(x - Math.round(x / width) * width) < 2;
      if (onRow || tries >= 8) settle(x);
      else waitForStop(tries + 1);
    }, NO_MOMENTUM_MS);
  };

  const step = (by: number) => {
    const landed = resting.current + by;
    if (landed >= 0 && landed < ids.length) restFrom(landed, true);
  };

  return (
    <View style={s.dial}>
      <Pressable style={s.arrow} onPress={() => step(-1)} hitSlop={6} disabled={at === 0} accessibilityLabel="Previous version">
        <Text style={[s.arrowText, at === 0 && s.dim]}>‹</Text>
      </Pressable>
      <View style={s.window} onLayout={onLayout}>
        {width ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={32}
            onScroll={(e) => (lastX.current = e.nativeEvent.contentOffset.x)}
            onScrollBeginDrag={() => {
              clearTimeout(noMomentum.current);
              steering.current = null;
            }}
            onScrollEndDrag={() => waitForStop()}
            onMomentumScrollBegin={() => clearTimeout(noMomentum.current)}
            onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
          >
            {ids.map((id, i) => {
              const refusal = compare.refusal(id);
              const notReady = compare.notReady(id);
              const state = id === sound.sounding ? '●' : id === sound.pending ? 'Loading…' : refusal ?? (notReady ? 'Not ready' : '');
              return (
                <View key={id} style={[s.row, { width }, (refusal || notReady) && s.dimmed]}>
                  <Text style={s.title} numberOfLines={1}>{songTitle(id)}</Text>
                  <View style={s.line}>
                    <Text style={s.count}>{i + 1}/{ids.length}</Text>
                    {i === 0 ? <Text style={s.main}>{isPicked(id) ? 'Main, your pick' : 'Main'}</Text> : null}
                    <Text style={[s.state, id === sound.sounding && s.on]} numberOfLines={1}>{state}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
      <Pressable style={s.arrow} onPress={() => step(1)} hitSlop={6} disabled={at >= ids.length - 1} accessibilityLabel="Next version">
        <Text style={[s.arrowText, at >= ids.length - 1 && s.dim]}>›</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  dial: { flexDirection: 'row', alignItems: 'center', height: ROW_HEIGHT, borderRadius: 10, backgroundColor: '#222' },
  arrow: { width: 26, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: '#8ab4f8', fontSize: 24, lineHeight: 28 },
  dim: { color: '#444' },
  window: { flex: 1, height: ROW_HEIGHT, overflow: 'hidden' },
  row: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 2 },
  dimmed: { opacity: 0.4 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  main: { color: '#999', fontSize: 12 },
  state: { flexShrink: 1, color: '#888', fontSize: 12, fontWeight: '600' },
  on: { color: '#8ab4f8' },
  count: { color: '#888', fontSize: 12, fontVariant: ['tabular-nums'] },
});
