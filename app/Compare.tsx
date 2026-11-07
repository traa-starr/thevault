// The inline Compare dial (board meeting 5): one row under the Compare button in the full player. Swipe sideways, or
// tap an arrow, to the next version; the sound flips when the dial rests, at the same second. The player's own seek bar
// and Play drive Compare while it's open. compareStore.ts holds the logic; this only draws it.
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import { compare, useCompare } from './compareStore';
import { dialTarget } from './playOrder';
import { isPicked, songTitle, useVersions } from './versionStore';

const ROW_HEIGHT = 48;
const NO_MOMENTUM_MS = 250;

export function CompareDial() {
  const { ids, at, can, sound } = useCompare();
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

  // the dial follows the store when it moves without a swipe: Back to the last one, or a version removed elsewhere
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

  const blocked = (id: string) => can[id] === 'cloud' || can[id] === 'missing' || can[id] === 'unreachable';

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
              const state = id === sound.sounding ? '●' : id === sound.pending ? 'Loading…' : refusal ?? '';
              return (
                <View key={id} style={[s.row, { width }]}>
                  <Text style={[s.title, refusal && s.off]} numberOfLines={1}>
                    {songTitle(id)}
                    {i === 0 ? <Text style={s.main}>{isPicked(id) ? '  Main, your pick' : '  Main'}</Text> : null}
                  </Text>
                  <Text style={[s.state, id === sound.sounding && s.on]} numberOfLines={1}>{state}</Text>
                  <Text style={s.count}>{i + 1}/{ids.length}</Text>
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

/** "Back to <the version heard before>", under the Versions button; only once you've moved off the first one. */
export function CompareBack() {
  const { ids, last, sound } = useCompare();
  const index = last ? ids.indexOf(last) : -1;
  const show = index >= 0 && last !== sound.sounding;
  return (
    <Pressable style={s.back} onPress={() => show && compare.rest(index)} disabled={!show}>
      <Text style={s.backText} numberOfLines={1}>{show ? `Back to ${songTitle(last!)}` : ' '}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  dial: { flexDirection: 'row', alignItems: 'center', height: ROW_HEIGHT, borderRadius: 10, backgroundColor: '#222' },
  arrow: { width: 36, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: '#8ab4f8', fontSize: 26, lineHeight: 30 },
  dim: { color: '#444' },
  window: { flex: 1, height: ROW_HEIGHT, overflow: 'hidden' },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700' },
  main: { color: '#999', fontSize: 13, fontWeight: '400' },
  state: { color: '#888', fontSize: 13, fontWeight: '600', maxWidth: 140 },
  on: { color: '#8ab4f8' },
  off: { color: '#666' },
  count: { color: '#888', fontSize: 13, fontVariant: ['tabular-nums'] },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', maxWidth: '70%' },
  backText: { color: '#8ab4f8', fontSize: 15 },
});
