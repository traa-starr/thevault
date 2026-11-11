// Compare's version wheel (Batch 6.5, the picker 4d agreed; 6.6: a small pill in the Compare word's place, like the
// Claude app's model picker but scrolled, never tapped). Only the middle row shows: the version name and a dim "3/5".
// A flick travels several versions and settles where it stops, like the iPhone picker; the sound flips when the wheel
// rests, at the same second, and passing rows stay silent. The name on the wheel is always the version sounding: a version still lining up shows dimmed until
// it sounds, and a wheel caught between rows is finished on the nearest one, never left half-way.
// The player's own seek bar drives Compare while it's open. compareStore.ts holds the logic; this only draws it.
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { compare, useCompare } from './compareStore';
import { dialTarget } from './playOrder';
import { C } from './theme';
import { songTitle, useVersions } from './versionStore';

export const WHEEL_ROW = 32;
export const WHEEL_WIDTH = 168; // the Compare word's slot: the same width open or closed, so nothing beside it moves
const NO_MOMENTUM_MS = 120; // a drag let go without a flick: rest once no momentum follows
const SNAP_BACK_MS = 600;

export function CompareDial() {
  const { ids, at, sound } = useCompare();
  const { families } = useVersions();
  const scroller = useRef<ScrollViewInstance>(null);
  const resting = useRef(at);
  const touching = useRef(false);
  const steering = useRef<number | null>(null); // our own animated move: its end event must not move the wheel again
  const lastY = useRef(at * WHEEL_ROW);
  const noMomentum = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => compare.familyChanged(), [families]);
  useEffect(() => () => clearTimeout(noMomentum.current), []);

  const goTo = (index: number, animated: boolean) => {
    steering.current = animated ? index : null;
    lastY.current = index * WHEEL_ROW;
    scroller.current?.scrollTo({ y: index * WHEEL_ROW, animated });
  };

  // the store moved the row without a swipe (a version removed elsewhere): the wheel follows at once
  useEffect(() => {
    if (touching.current || resting.current === at) return;
    resting.current = at;
    goTo(at, false);
  }, [at]);

  // can't play, or not lined up after the wait: stepped over
  const blocked = (id: string) => !!compare.refusal(id) || compare.notReady(id);

  const settle = (y: number) => {
    clearTimeout(noMomentum.current);
    touching.current = false;
    const landed = Math.min(Math.max(Math.round(y / WHEEL_ROW), 0), ids.length - 1);
    if (steering.current !== null) {
      const target = steering.current;
      steering.current = null;
      if (landed !== target) goTo(target, false);
      return;
    }
    // stepped over rows that can't play (playOrder.ts dialTarget); a wheel stopped between rows snaps to its row
    const index = dialTarget(resting.current, landed, ids.map((id) => !blocked(id)));
    if (index !== landed) goTo(index, true);
    else if (Math.abs(y - landed * WHEEL_ROW) > 1) goTo(landed, false);
    resting.current = index;
    compare.rest(index);
  };

  // the wheel resting on a row that isn't sounding and isn't on its way (it couldn't play): back to the one you hear
  const sounding = ids.indexOf(sound.sounding);
  useEffect(() => {
    if (touching.current || steering.current !== null || sound.pending || sounding < 0 || sounding === resting.current) return;
    const timer = setTimeout(() => {
      if (touching.current || steering.current !== null) return;
      resting.current = sounding;
      goTo(sounding, true);
      compare.rest(sounding);
    }, SNAP_BACK_MS);
    return () => clearTimeout(timer);
  }, [sounding, sound.pending, at]);

  return (
    <View style={s.wheel}>
      <ScrollView
        ref={scroller}
        style={s.window}
        contentOffset={{ x: 0, y: at * WHEEL_ROW }}
        snapToInterval={WHEEL_ROW}
        decelerationRate="normal"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => (lastY.current = e.nativeEvent.contentOffset.y)}
        onScrollBeginDrag={() => {
          clearTimeout(noMomentum.current);
          touching.current = true;
          steering.current = null;
        }}
        onScrollEndDrag={() => {
          clearTimeout(noMomentum.current);
          noMomentum.current = setTimeout(() => settle(lastY.current), NO_MOMENTUM_MS);
        }}
        onMomentumScrollBegin={() => clearTimeout(noMomentum.current)}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      >
        {ids.map((id, i) => {
          const dim = i !== sounding || !!compare.refusal(id) || compare.notReady(id);
          return (
            <View key={id} style={s.row}>
              <Text style={[s.name, dim && s.dim]} numberOfLines={1} ellipsizeMode="middle">{songTitle(id)}</Text>
              <Text style={s.count}>{i + 1}/{ids.length}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  // look (overhaul wave 4): the app's own raised pill with a faint edge; the name white, the count grey. No blue
  wheel: { width: WHEEL_WIDTH, height: WHEEL_ROW, borderRadius: WHEEL_ROW / 2, backgroundColor: C.raised, borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassEdge, overflow: 'hidden' },
  window: { height: WHEEL_ROW },
  row: { height: WHEEL_ROW, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  name: { flexShrink: 1, color: C.text, fontSize: 15 },
  dim: { opacity: 0.4 },
  count: { color: C.dim, fontSize: 12, fontVariant: ['tabular-nums'] },
});
