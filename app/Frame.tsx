// The frame every screen sits in (overhaul wave 1, Wall): the floating tab bar (Home, Library) with the round search
// button beside it (wave 2: it opens the search screen). The mini player floats just above (Player.tsx). The tabs only say where I am (nav.tsx): they never
// touch the player, so tapping them as fast as I like can't stall or reload it.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { GlassView } from './native';
import { goTab, openSearch, usePlace, type Tab } from './nav';
import { Tap } from './Tap';
import { C, R, S, T } from './theme';

/** Glass where the phone has it (iOS 26 and the rebuild), a solid dark surface with a faint edge where it doesn't.
 * Only for the tab bar, the search button, the mini player and the transport pill: never under text to read. */
export function Glass({ style, radius, children }: { style?: StyleProp<ViewStyle>; radius: number; children?: ReactNode }) {
  if (GlassView) {
    return (
      <GlassView style={[{ borderRadius: radius, overflow: 'hidden' }, style]} glassEffectStyle="regular" colorScheme="dark">
        {children}
      </GlassView>
    );
  }
  return <View style={[s.solid, { borderRadius: radius }, style]}>{children}</View>;
}

const TABS: { tab: Tab; word: string; icon: IconName }[] = [
  { tab: 'home', word: 'Home', icon: 'home' },
  { tab: 'library', word: 'Library', icon: 'library' },
];

/** Hidden while Sort is open (Sort is a job with its own Back, not a place). */
export function TabBar() {
  const { tab, sort } = usePlace();
  if (sort) return null;
  return (
    <View style={s.dock} pointerEvents="box-none">
      <Glass style={s.bar} radius={R.tabBar}>
        {TABS.map((one) => {
          const on = tab === one.tab;
          return (
            <Tap key={one.tab} style={s.tab} radius={R.tabBar - 6} onPress={() => goTab(one.tab)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={one.word}>
              <Icon name={one.icon} size={24} color={on ? C.accent : C.dim} />
              <Text style={[T.tab, { color: on ? C.accent : C.dim }]} allowFontScaling={false}>{one.word}</Text>
            </Tap>
          );
        })}
      </Glass>
      <Glass style={s.search} radius={S.search / 2}>
        {/* straight to the search screen, keyboard up; lit while I'm there */}
        <Tap style={s.searchTap} radius={S.search / 2} onPress={() => openSearch('')} accessibilityRole="tab" accessibilityState={{ selected: tab === 'search' }} accessibilityLabel="Search">
          <Icon name="search" size={24} color={tab === 'search' ? C.accent : C.dim} />
        </Tap>
      </Glass>
    </View>
  );
}

const s = StyleSheet.create({
  solid: { backgroundColor: C.glassSolid, borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassEdge, overflow: 'hidden' },
  dock: { position: 'absolute', left: S.miniSide, right: S.miniSide, bottom: S.homeBar + S.tabBottom, height: S.tabBar, flexDirection: 'row', gap: 12, zIndex: 5 },
  bar: { flex: 1, flexDirection: 'row', paddingHorizontal: 6 },
  tab: { flex: 1, height: S.tabBar, alignItems: 'center', justifyContent: 'center', gap: 2 },
  search: { width: S.search, height: S.search },
  searchTap: { width: S.search, height: S.search, alignItems: 'center', justifyContent: 'center' },
});
