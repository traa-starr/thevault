// "+ Version" picker, the Versions view and their toast. Sheets over whatever screen is open, so the music
// never stops. The rules are in family.ts; sending and Undo are in versions.ts.
// Look (overhaul wave 4): the list row every screen uses (60 high, a tile), theme colours only, and a version's menu
// as a half sheet drawn inside the Versions sheet (the tag hold menu's style) instead of an iOS alert box. What each
// choice does is unchanged.
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Tile } from './Art';
import { compare } from './compareStore';
import { versionMenu, type VersionChoice } from './family';
import { hang } from './hangWatch';
import { useOutbox } from './outbox';
import { player, usePlayerPick, type PlayerSong } from './playerStore';
import { withPending } from './playOrder';
import { tint } from './Tagging';
import { C, coveredBelow, R, S, T } from './theme';
import * as versions from './versionStore';
import { useVersions, type LibSong } from './versionStore';

const SHORT_LIST = 40;
const ROW_HEIGHT = S.row;
const MENU_ROW = 52; // a row of the half-sheet menu, as in the tag hold menu
const AFTER_CLOSE_MS = 700;

/** These two are still iOS pop-up sheets. If iOS never shows one that was asked for, the hang watch says so. */
function useShownWatch(open: boolean, what: string) {
  const shown = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!open) return;
    shown.current = hang.expect(what);
    return () => shown.current?.();
  }, [open, what]);
  return () => shown.current?.();
}

/** The song on screen, as the picker needs it. */
export type LinkSong = PlayerSong & { folder?: string | null };

/** Tap 1: opens the picker for this song. Tap 2 (a pick) links it, Mine and linked if it wasn't Mine yet.
 * Cards pass `beforeLink` (their own Mine, with their own Undo) and `onLinked` (to fold the link into that Undo). */
export function startLink(url: string, song: LinkSong, onLinked?: (sent: versions.Sent) => void, beforeLink?: () => void) {
  versions.ensureLibrary(url);
  versions.openPicker({
    id: song.id,
    title: song.title,
    folder: song.folder ?? null,
    onPick: (target) => {
      const refusal = versions.linkRefusal(song.id, target);
      if (refusal) {
        versions.showToast({ text: refusal });
        return;
      }
      beforeLink?.();
      const needsMine = player.markOf(song).mine !== 'mine';
      const sent = versions.link(song.id, target, needsMine);
      if (typeof sent === 'string') {
        versions.showToast({ text: sent });
        return;
      }
      if (needsMine) player.setMark(song.id, { mine: 'mine', sorted: true });
      versions.closePicker();
      if (onLinked) {
        onLinked(sent);
        return;
      }
      versions.showToast({
        text: `Linked to ${versions.songTitle(target)}`,
        undo: () => {
          versions.undo(sent);
          if (needsMine) player.setMark(song.id, null);
        },
        action: { label: 'Make main', run: () => makeMainWithToast(song.id) },
      });
    },
  });
}

function makeMainWithToast(id: string) {
  const sent = versions.makeMain(id);
  if (!sent) return;
  versions.showToast({ text: `${versions.songTitle(id)} is Main now`, undo: () => versions.undo(sent) });
}

/** "Versions · 3", only when a song has versions. */
export function VersionsChip({ id, style, textStyle, onPress }: { id: string; style?: object; textStyle?: object; onPress?: () => void }) {
  const { families } = useVersions();
  const count = families.has(id) ? versions.members(id).length : 1;
  if (count < 2) return null;
  return (
    <Pressable onPress={onPress ?? (() => versions.openVersions(id))} hitSlop={style ? 8 : undefined} style={style}>
      <Text style={textStyle ?? s.chip}>Versions · {count}</Text>
    </Pressable>
  );
}

const ago = (date: string | null) => date ?? '';

function Picker({ url }: { url: string }) {
  const { picker, songs, families } = useVersions();
  const { pending } = useOutbox();
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(''), [picker?.id]);

  const all = useMemo(() => {
    if (!picker || !songs) return [];
    const ownMain = families.get(picker.id) ?? picker.id;
    const marked = withPending(songs, pending).map((song) => ({ ...song, mine: player.markOf(song).mine }));
    // only Main versions of Mine songs, never this song's own family
    return marked.filter((song) => song.mine === 'mine' && (families.get(song.id) ?? song.id) === song.id
      && song.id !== picker.id && song.id !== ownMain);
  }, [picker, songs, families, pending]);

  const shown = useMemo(() => {
    const wanted = query.trim().toLowerCase();
    if (wanted) return all.filter((song) => song.title.toLowerCase().includes(wanted));
    if (!picker) return [];
    // recently played first, then the same folder (nearest date first), then the rest
    const byId = new Map(all.map((song) => [song.id, song]));
    const out: LibSong[] = [];
    const add = (song: LibSong | undefined) => {
      if (song && !out.includes(song)) out.push(song);
    };
    player.recent().forEach((id) => add(byId.get(families.get(id) ?? id)));
    const folder = picker.folder ?? songs?.find((song) => song.id === picker.id)?.folder;
    const near = (song: LibSong) => song.date ?? '';
    all.filter((song) => folder && song.folder === folder).sort((a, b) => (near(a) < near(b) ? 1 : -1)).forEach(add);
    all.forEach(add);
    return out.slice(0, SHORT_LIST);
  }, [all, query, picker, families, songs]);

  const onShow = useShownWatch(!!picker, 'version picker');
  if (!picker) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={versions.closePicker} onShow={onShow}>
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Pressable style={(p) => [s.headWord, tint(p)]} onPress={versions.closePicker}>
            <Text style={s.link}>Cancel</Text>
          </Pressable>
          <Text style={s.sheetTitle} numberOfLines={1}>+ Version</Text>
        </View>
        <Text style={s.sheetNote} numberOfLines={2}>Linking “{picker.title}”. Pick its Main.</Text>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          placeholder="Search Mine songs"
          placeholderTextColor={C.faint}
          keyboardAppearance="dark"
          clearButtonMode="while-editing"
        />
        {!songs ? (
          <Text style={s.empty}>Loading songs…</Text>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(song) => song.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
            ListHeaderComponent={query.trim() ? undefined : <Text style={s.label}>Recently played, then the same folder</Text>}
            ListEmptyComponent={<Text style={s.empty}>{query.trim() ? 'No Mine song matches' : 'No Mine songs yet'}</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={(p) => [s.row, tint(p)]}
                onPress={() => {
                  Keyboard.dismiss();
                  picker.onPick?.(item.id);
                }}
              >
                <Tile title={item.title} date={item.date} size={S.rowTile} radius={R.rowTile} plain />
                <View style={s.rowWords}>
                  <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.rowDetail} numberOfLines={1}>{[item.folder, ago(item.date)].filter(Boolean).join(' · ') || ' '}</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
      <VersionsToast />
    </Modal>
  );
}

function VersionsView({ url }: { url: string }) {
  const { versionsOf, songs } = useVersions();
  const { song: playing } = usePlayerPick('song');
  const onShow = useShownWatch(!!versionsOf && versions.members(versionsOf).length > 1, 'versions');
  // the version whose menu is up (a half sheet inside this one: never a second iOS sheet)
  const [menuFor, setMenuFor] = useState<string | null>(null);
  useEffect(() => setMenuFor(null), [versionsOf]);
  if (!versionsOf) return null;
  const list = versions.members(versionsOf);
  const close = () => versions.openVersions(null);
  if (list.length < 2) {
    // the family is gone (the last version left): nothing to show
    setTimeout(close, 0);
    return null;
  }
  const info = (id: string) => songs?.find((song) => song.id === id);

  const run = (id: string, choice: VersionChoice) => {
    setMenuFor(null);
    const title = versions.songTitle(id);
    const lib = info(id);
    if (choice === 'Play') player.playNow(url, { id, title, mine: lib?.mine ?? 'mine', sorted: lib?.sorted ?? true });
    else if (choice === 'Make main' || choice === 'Keep as Main') makeMainWithToast(id);
    else if (choice === 'Remove from Versions') {
      const sent = versions.remove(id);
      if (sent) versions.showToast({ text: `Removed: ${title}`, undo: () => versions.undo(sent) });
    } else if (choice === 'Not mine') notMine(url, id);
  };

  const menuOpen = menuFor && list.includes(menuFor) ? menuFor : null;
  const menuIsMain = menuOpen === list[0];
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close} onShow={onShow}>
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Pressable style={(p) => [s.headWord, tint(p)]} onPress={close}>
            <Text style={s.link}>Done</Text>
          </Pressable>
          <Text style={s.sheetTitle}>Versions · {list.length}</Text>
          <View style={s.grow} />
          {/* one sheet at a time on iOS: this one goes first, then Compare opens */}
          <Pressable style={s.compareTap} onPress={() => { close(); setTimeout(() => compare.openFromLibrary(url, versionsOf), AFTER_CLOSE_MS); }}>
            {({ pressed }) => (
              <View style={[s.comparePill, pressed && s.comparePressed]}>
                <Text style={s.compareWord}>Compare</Text>
              </View>
            )}
          </Pressable>
        </View>
        {list.map((id, i) => {
          const title = versions.songTitle(id);
          return (
            <Pressable key={id} style={(p) => [s.row, menuOpen === id && s.rowHeld, tint(p)]} onPress={() => setMenuFor(id)}>
              <Tile title={title} date={info(id)?.date} size={S.rowTile} radius={R.rowTile} plain />
              <View style={s.rowWords}>
                {/* the version playing: its title in amber, as in every list */}
                <Text style={[s.rowTitle, playing?.id === id && s.rowPlaying]} numberOfLines={1}>{title}</Text>
                <Text style={s.rowDetail} numberOfLines={1}>
                  {[i === 0 ? (versions.isPicked(id) ? 'Your pick' : 'Newest') : null, info(id)?.folder, info(id)?.date].filter(Boolean).join(' · ') || ' '}
                </Text>
              </View>
              {/* the Main says so on its row: it plays in shuffle and holds the Library row */}
              {i === 0 ? (
                <View style={s.mainMark}>
                  <Text style={s.mainWord}>Main</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <VersionsToast />
      {menuOpen ? (
        <View style={s.menuLayer}>
          <Pressable style={s.menuScrim} onPress={() => setMenuFor(null)} accessibilityLabel="Cancel" />
          <View style={s.menuSheet}>
            <View style={s.menuAbout}>
              <Text style={s.menuTitle} numberOfLines={1}>{versions.songTitle(menuOpen)}</Text>
              {menuIsMain ? <Text style={s.menuNote} numberOfLines={1}>Main{versions.isPicked(menuOpen) ? ' (your pick)' : ' (newest)'}: plays in shuffle</Text> : null}
            </View>
            {versionMenu(menuIsMain, versions.isPicked(menuOpen)).map((choice) => (
              <View key={choice}>
                {choice === 'Cancel' ? <View style={s.menuGap} /> : null}
                <Pressable style={(p) => [s.menuItem, tint(p)]} onPress={() => run(menuOpen, choice)} accessibilityLabel={choice}>
                  <Text style={[s.menuText, choice === 'Cancel' && s.menuCancel]} numberOfLines={1}>{choice}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

/** Not mine on a version that isn't the Main: it leaves the family and is hidden. Undo puts both back. */
function notMine(url: string, id: string) {
  if (player.current()?.id === id) {
    versions.openVersions(null);
    player.tapNotMine();
    return;
  }
  const edit = versions.removeEditFor(id);
  if (!edit) return;
  const sent = versions.sendEdit(edit, id);
  const mine = versions.sendMine(id, 'not mine');
  player.setMark(id, { mine: 'not mine', sorted: true });
  versions.showToast({
    text: `Hidden: ${versions.songTitle(id)}`,
    undo: () => {
      versions.undoMine(mine, id);
      versions.undo(sent);
      player.setMark(id, null);
    },
  });
}

/** The versions toast. Also drawn inside the player sheet, which covers the screen's own copy. */
export function VersionsToast() {
  const { toast } = useVersions();
  if (!toast) return null;
  return (
    <View style={s.toast}>
      <Text style={s.toastText} numberOfLines={2}>{toast.text}</Text>
      {toast.action ? (
        <Pressable style={s.toastTap} onPress={() => { toast.action!.run(); }} hitSlop={8}>
          <Text style={s.toastAction}>{toast.action.label}</Text>
        </Pressable>
      ) : null}
      {toast.undo ? (
        <Pressable style={s.toastTap} onPress={() => { versions.showToast(null); toast.undo!(); }} hitSlop={8}>
          <Text style={s.toastAction}>Undo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Mounted once, above every screen and the player sheet. */
export function VersionsLayer({ url }: { url: string }) {
  // iOS shows one sheet at a time: these never open while the player sheet is up, or the screen stops taking touches
  const { sheet } = usePlayerPick('sheet');
  return (
    <>
      {sheet === 'none' ? <Picker url={url} /> : null}
      {sheet === 'none' ? <VersionsView url={url} /> : null}
      <VersionsToast />
    </>
  );
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  // "Versions · 3" in the player: a quiet word like "+ Version" and Compare beside it, 44 to touch
  chip: { color: C.dim, fontSize: 15, paddingHorizontal: 8, paddingVertical: 13 },
  sheet: { flex: 1, backgroundColor: C.surface, paddingTop: 12, paddingHorizontal: S.side },
  sheetHeader: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headWord: { height: S.tap, minWidth: S.tap, justifyContent: 'center', marginLeft: -8 },
  sheetTitle: { ...T.heading, flexShrink: 1 },
  sheetNote: { ...T.meta, fontSize: 15, marginBottom: 12 },
  link: { color: C.dim, fontSize: 15, paddingHorizontal: 8 },
  // Compare: a 36 pill in a 44 touch, quiet (white on raised), never amber
  compareTap: { height: S.tap, justifyContent: 'center' },
  comparePill: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: C.raised, justifyContent: 'center' },
  comparePressed: { backgroundColor: C.line },
  compareWord: { color: C.text, fontSize: 15, fontWeight: '600' },
  input: { height: 48, color: C.text, fontSize: 16, backgroundColor: C.raised, borderRadius: R.field, paddingHorizontal: 12, marginBottom: 8 },
  label: { ...T.meta, paddingVertical: 8 },
  empty: { ...T.meta, fontSize: 15, textAlign: 'center', paddingTop: 32 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  rowHeld: { backgroundColor: C.raised, borderRadius: R.rowTile },
  rowWords: { flex: 1, minWidth: 0, justifyContent: 'center' },
  rowTitle: { ...T.row },
  rowPlaying: { color: C.accent },
  rowDetail: { ...T.meta, marginTop: 2, fontVariant: ['tabular-nums'] },
  mainMark: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: C.raised, justifyContent: 'center' },
  mainWord: { color: C.text, fontSize: 12, fontWeight: '600' },
  // a version's menu: a half sheet at the bottom of the Versions sheet, the rest darkened (the tag hold menu's look)
  menuLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' },
  menuScrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuSheet: { backgroundColor: C.raised, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet, paddingHorizontal: S.side, paddingTop: 8, paddingBottom: S.homeBar + 8 },
  menuAbout: { height: MENU_ROW, justifyContent: 'center', borderBottomColor: C.line, borderBottomWidth: 1 },
  menuTitle: { ...T.meta, fontSize: 15, color: C.text },
  menuNote: { ...T.meta, marginTop: 2 },
  menuItem: { height: MENU_ROW, justifyContent: 'center' },
  menuText: { ...T.row },
  menuGap: { height: 1, backgroundColor: C.line, marginTop: 8, marginBottom: 8 },
  menuCancel: { color: C.dim },
  // the same toast as the player's Undo: above the tab bar and the mini player
  toast: {
    position: 'absolute', left: 16, right: 16, bottom: coveredBelow(true, true) + 4, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.toast, borderRadius: R.toast, paddingVertical: 10, paddingHorizontal: 14,
  },
  toastText: { flex: 1, ...T.toast },
  toastTap: { minHeight: 28, justifyContent: 'center' },
  toastAction: { color: C.accent, fontSize: 16, fontWeight: '700' },
});
