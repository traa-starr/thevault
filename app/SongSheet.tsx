// The song sheet (ROADMAP O.6, WORLD-MAP rule 1): hold a song anywhere, or tap the player's "...", and this half sheet
// opens in place. One sheet, one set of rows (songActions.ts), every screen. Drawn by the app like the tag hold menu
// (Tagging.tsx), never an iOS dialog. It closes on the first tap, before any Undo toast shows (WORLD-MAP rule 5).
import { useRef, useSyncExternalStore, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Tile } from './Art';
import { compare, useCompare } from './compareStore';
import { player, usePlayerPick, type PlayerSong } from './playerStore';
import { ratingStore, useRating } from './ratingStore';
import { useSession } from './sessionStore';
import { SheetFrame, setBack } from './SheetFrame';
import { actionLabel, songActions, type SheetFrom, type SongAction, type SongContext } from './songActions';
import { ROW_HEIGHT, tint } from './Tagging';
import { C, R, S, T } from './theme';
import { startLink } from './Versions';
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

/** A page (Versions, Add as a version of…) gives way to the sheet: one sheet on screen at a time. */
const closePages = () => {
  setBack(null);
  versions.openVersions(null);
  versions.closePicker();
};
/** Opens the sheet on this song. `onSelect`: Library and Home's Select row (select mode starting on this song). */
export const openSongSheet = (song: PlayerSong, from: SheetFrom, more: More = {}) => (closePages(), set({ kind: 'song', song, from, ...more, n: ++opened }));
/** Opens a small menu drawn like the song sheet: a tap on a row closes it, then does the row. */
export const openMenu = (rows: MenuRow[], title?: string, note?: string) => (closePages(), set({ kind: 'menu', rows, title, note, n: ++opened }));
export const closeSongSheet = () => set(null);
export const useSongSheet = () => useSyncExternalStore(subscribe, () => open);

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
  // the two rows that open a page inside the sheet: its Back comes here again (a Sort card's too, with its own rows)
  if (action === 'versions' || action === 'add_version') setBack(() => openSongSheet(song, from, now));
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
      return versions.openVersions(song.id); // a page inside the sheet, over whatever is open, the player too
    case 'compare':
      return from === 'player' && playing ? compare.openFromPlayer(url) : compare.openFromLibrary(url, song.id);
    case 'add_version':
      // the Add as a version page (world map goal 4): search, rows, a tap links. In place, never leaves the player
      return startLink(url, song);
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

/** The half sheet's frame (SheetFrame.tsx): the dimmed screen behind, the grab mark, pull down or Cancel closes. */
const Frame = ({ children }: { children: ReactNode }) => <SheetFrame onClose={closeSongSheet}>{children}</SheetFrame>;

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
  about: { height: S.row, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: C.line, borderBottomWidth: 1 },
  aboutWords: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { ...T.row },
  second: { ...T.meta, marginTop: 2 },
  row: { height: ROW_HEIGHT, justifyContent: 'center' },
  rowText: { ...T.row },
  menuHead: { minHeight: S.row, justifyContent: 'center', borderBottomColor: C.line, borderBottomWidth: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: { color: C.text, fontSize: 17, fontWeight: '700' },
});
