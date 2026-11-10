// The design system in one place (docs/overhaul/DESIGN-SYSTEM.md): Wall's base, Deal's player. A screen never types a
// colour or a size of its own; change it here and every screen follows. No React Native here, so a test can load it.

export const C = {
  bg: '#000000',
  surface: '#111114',
  raised: '#1c1c21',
  line: '#2a2a30',
  text: '#f2f2f4',
  dim: '#a0a0aa',
  faint: '#6a6a74',
  /** Only: the playing song, tag dots, Tag, an action that is on, Undo. */
  accent: '#ffb020',
  onAccent: '#141006',
  warnBg: '#3a2a06',
  warnText: '#ffd58a',
  danger: '#ff6961',
  /** Where real glass isn't available: the tab bar, the search button, the mini player, the transport pill. */
  glassSolid: 'rgba(30,30,36,0.94)',
  glassEdge: 'rgba(255,255,255,0.09)',
  toast: '#2c2c33',
  white: '#ffffff',
} as const;

export const T = {
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: C.text },
  heading: { fontSize: 20, fontWeight: '700', color: C.text },
  playerTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: C.text },
  row: { fontSize: 17, color: C.text },
  meta: { fontSize: 13, color: C.dim },
  action: { fontSize: 12, color: C.dim },
  tab: { fontSize: 10, fontWeight: '500' },
  chip: { fontSize: 14 },
  toast: { fontSize: 15, color: C.text },
} as const;

export const S = {
  u: 4,
  side: 16,
  playerSide: 20,
  tap: 44,
  row: 60,
  rowTile: 44,
  cardTile: 132,
  /** Home's lower rows (wave 2). */
  cardSmall: 104,
  /** The player's tile: a square, at most this share of the screen's height. */
  playerTileMax: 0.42,
  mini: 60,
  miniSide: 12,
  miniGap: 8,
  tabBar: 56,
  tabBottom: 8,
  search: 56,
  play: 64,
  pill: 76,
  actions: 52,
  seek: 44,
  /** Below the phone's home bar on a phone with one: iPhones with a notch or island all have 34. */
  homeBar: 34,
  statusBar: 54,
} as const;

export const R = { rowTile: 8, cardTile: 14, playerTile: 22, sheet: 22, tabBar: 28, mini: 18, pill: 38, field: 12, toast: 12 } as const;

/** How far the bottom of a screen is covered by the tab bar and the mini player, so a list's last row scrolls clear. */
export const coveredBelow = (tabs: boolean, mini: boolean) =>
  S.homeBar + (tabs ? S.tabBottom + S.tabBar : 0) + (mini ? S.miniGap + S.mini : 0) + (tabs || mini ? 8 : 0);
