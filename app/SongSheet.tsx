// The song sheet (ROADMAP O.6, WORLD-MAP rule 1): hold a song anywhere, or tap the player's "...", and this half sheet
// opens in place. One sheet, one set of rows (songActions.ts), every screen. Drawn by the app like the tag hold menu
// (Tagging.tsx), never an iOS dialog. It closes on the first tap, before any Undo toast shows (WORLD-MAP rule 5).
import { useRef, useSyncExternalStore, type ReactNode } from 'react';
import { FlatList, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Tile } from './Art';
import { compare, useCompare } from './compareStore';
import { openLibrarySelect } from './nav';
import { player, usePlayerPick, type PlayerSong } from './playerStore';
import { ratingStore, useRating } from './ratingStore';
import { useSession } from './sessionStore';
import { actionLabel, songActions, type SheetFrom, type SongAction, type SongContext } from './songActions';
import { ROW_HEIGHT, tint } from './Tagging';
import { C, R, S, T } from './theme';
import * as versions from './versionStore';

type More = {
  /** Library and Home's Select row: select mode starting on this song. */
  onSelect?: () => void;
  second?: string | null;
  /** The screen does this row itself (Sort cards: Mine moves the deck on): true when it did. */
  handle?: (action: SongAction) => boolean;
};
/** A row of a small menu (Home's and Library's "...", Shuffle's pools, a Sort set). `on`: ticked, the choice now. */
export type MenuRow = { key: string; label: string; note?: string; on?: boolean; onPress: () => void };
type SongOpen = { kind: 'song'; song: PlayerSong; from: SheetFrom } & More;
type MenuOpen = { kind: 'menu'; title?: string; note?: string; rows: MenuRow[] };
type Open = ((SongOpen | MenuOpen) & { n: number }) | null;
let open: Open = null;
let opened = 0; // each opening draws afresh, a menu opened from a menu too
const listeners = new Set<() => void>();
const set = (next: Open) => {
  open = next;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Opens the sheet on this song. `onSelect`: Library and Home's Select row (select mode starting on this song). */
export const openSongSheet = (song: PlayerSong, from: SheetFrom, more: More = {}) => set({ kind: 'song', song, from, ...more, n: ++opened });
/** Opens a small menu drawn like the song sheet: a tap on a row closes it, then does the row. */
export const openMenu = (rows: MenuRow[], title?: string, note?: string) => set({ kind: 'menu', rows, title, note, n: ++opened });
export const closeSongSheet = () => set(null);
export const useSongSheet = () => useSyncExternalStore(subscribe, () => open);

const PULL_CLOSES = 60; // a pull down this far closes it, like a tap outside

/** Mine / Not mine on a song that isn't the one playing: sent like the player's, with an Undo on the toast. */
function verdict(song: PlayerSong, value: 'mine' | 'not mine') {
  const family = versions.members(song.id);
  if (value === 'not mine' && family[0] === song.id && family.length > 2) {
    versions.showToast({ text: `This is the Main of ${family.length} versions: make another one Main first (Versions).` });
    return;
  }
  const edit = value === 'not mine' && family.length > 1 ? versions.removeEditFor(song.id) : null;
  const sent = edit ? versions.sendEdit(edit, song.id) : null; // out of the family first: the laptop refuses a hidden version
  const mine = versions.sendMine(song.id, value);
  player.setMark(song.id, { mine: value, sorted: true });
  versions.showToast({
    text: `${value === 'mine' ? 'Mine' : 'Hidden'}: ${song.title}`,
    undo: () => {
      versions.undoMine(mine, song.id);
      if (sent) versions.undo(sent);
      player.setMark(song.id, null);
    },
  });
}

function run(action: SongAction, now: SongOpen) {
  const { song, from } = now;
  if (now.handle?.(action)) return;
  const playing = player.current()?.id === song.id;
  const url = player.url();
  switch (action) {
    case 'favorite':
    case 'unfavorite':
      return ratingStore.tap(song.id, song.title, 'fire');
    case 'archive':
    case 'unarchive':
      return ratingStore.tap(song.id, song.title, 'shelved');
    case 'mine':
      return playing ? player.tapMine() : verdict(song, 'mine');
    case 'not_mine':
      return playing ? player.tapNotMine() : verdict(song, 'not mine');
    case 'versions':
      return versions.openVersions(song.id); // over whatever is open, the player too
    case 'compare':
      return from === 'player' && playing ? compare.openFromPlayer(url) : compare.openFromLibrary(url, song.id);
    case 'add_version':
      // Library's select mode, started on this song: a screen, so the player gets out of the way first
      return player.closeThen(() => openLibrarySelect(song.id));
    case 'queue':
      return player.open('queue');
    case 'select':
      return now.onSelect?.();
  }
}

/** Mounted once, over every screen and the player sheet. */
export function SongSheetLayer() {
  const now = useSongSheet();
  if (!now) return null;
  return now.kind === 'menu' ? <MenuSheet key={now.n} now={now} /> : <SongSheet key={now.n} now={now} />;
}

/** The half sheet's frame: the dimmed screen behind (a tap closes), the grab mark, a pull down closes. */
function Frame({ children }: { children: ReactNode }) {
  const pull = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > PULL_CLOSES) closeSongSheet();
      },
    }),
  ).current.panHandlers;
  return (
    <View style={s.layer}>
      <Pressable style={s.scrim} onPress={closeSongSheet} accessibilityLabel="Close" />
      <View style={s.sheet} {...pull}>
        <View style={s.grab}>
          <View style={s.grabMark} />
        </View>
        {children}
        <View style={s.gap} />
        <Pressable style={(p) => [s.row, tint(p)]} onPress={closeSongSheet} accessibilityLabel="Cancel">
          <Text style={[s.rowText, s.cancel]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** One tap and it closes, before the row runs: a second tap can't flip a choice back. */
const useOnce = () => {
  const done = useRef(false);
  return (fn: () => void) => {
    if (done.current) return;
    done.current = true;
    closeSongSheet();
    fn();
  };
};

function MenuSheet({ now }: { now: MenuOpen }) {
  const once = useOnce();
  const { height } = useWindowDimensions();
  const row = (one: MenuRow) => (
    <Pressable key={one.key} style={(p) => [s.row, s.menuRow, tint(p)]} onPress={() => once(one.onPress)} accessibilityLabel={one.label} accessibilityState={{ selected: !!one.on }}>
      <View style={s.aboutWords}>
        <Text style={s.rowText} numberOfLines={1}>{one.label}</Text>
        {one.note ? <Text style={s.second} numberOfLines={1}>{one.note}</Text> : null}
      </View>
      {one.on ? <Text style={s.tick}>✓</Text> : null}
    </Pressable>
  );
  return (
    <Frame>
      {now.title ? (
        <View style={s.menuHead}>
          <Text style={s.title} numberOfLines={1}>{now.title}</Text>
          {now.note ? <Text style={s.second} numberOfLines={1}>{now.note}</Text> : null}
        </View>
      ) : null}
      {/* a Sort set lists its songs here: hundreds scroll, the sheet never grows past the top half */}
      {now.rows.length > 8 ? (
        <FlatList data={now.rows} keyExtractor={(one) => one.key} renderItem={({ item }) => row(item)} style={{ maxHeight: height * 0.55 }} initialNumToRender={12} />
      ) : (
        now.rows.map(row)
      )}
    </Frame>
  );
}

function SongSheet({ now }: { now: SongOpen }) {
  const rating = useRating(now.song.id);
  useVersions();
  const { marks } = usePlayerPick('marks'); // a verdict from the sheet or the player shows on its rows at once
  const cmp = useCompare();
  const { on: inSession } = useSession();
  const once = useOnce();
  const mark = marks[now.song.id] ?? now.song;
  const atPlayer = now.from === 'player';
  const ctx: SongContext = {
    rating: !mark.sorted ? null : mark.mine === 'mine' ? 'mine' : 'not_mine',
    favorite: rating === 'fire',
    archived: rating === 'shelved',
    familySize: Math.max(versions.members(now.song.id).length, 1),
    comparing: atPlayer && cmp.open,
    inSession: atPlayer && inSession,
    from: now.from,
  };
  // the sheet closes on the first tap: a second one can't flip it back
  const tap = (action: SongAction) => once(() => run(action, now));
  const second = now.second ?? (ctx.familySize > 1 ? `${ctx.familySize} versions` : null);
  return (
    <Frame>
        <View style={s.about}>
          <Tile title={now.song.title} date={versions.songInfo(now.song.id)?.date ?? null} size={S.rowTile} radius={R.rowTile} plain />
          <View style={s.aboutWords}>
            <Text style={s.title} numberOfLines={1}>{now.song.title}</Text>
            {second ? <Text style={s.second} numberOfLines={1}>{second}</Text> : null}
          </View>
        </View>
        {songActions(ctx).map((action) => (
          <Pressable key={action} style={(p) => [s.row, tint(p)]} onPress={() => tap(action)} accessibilityLabel={actionLabel(action, ctx)}>
            <Text style={s.rowText} numberOfLines={1}>{actionLabel(action, ctx)}</Text>
          </Pressable>
        ))}
    </Frame>
  );
}

const useVersions = () => versions.useVersions(); // family sizes and dates come in with the song list

const s = StyleSheet.create({
  // over the player sheet (zIndex 10) and every screen
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 11, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: C.raised, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet, paddingHorizontal: S.side, paddingBottom: S.homeBar + 8 },
  grab: { height: 20, alignItems: 'center', justifyContent: 'center' },
  grabMark: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.faint },
  about: { height: S.row, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: C.line, borderBottomWidth: 1 },
  aboutWords: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { ...T.row },
  second: { ...T.meta, marginTop: 2 },
  row: { height: ROW_HEIGHT, justifyContent: 'center' },
  rowText: { ...T.row },
  cancel: { color: C.dim },
  gap: { height: 1, backgroundColor: C.line, marginTop: 8, marginBottom: 8 },
  menuHead: { minHeight: S.row, justifyContent: 'center', borderBottomColor: C.line, borderBottomWidth: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: { color: C.text, fontSize: 17, fontWeight: '700' },
});
