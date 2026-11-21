// The Add as a version page (the old "+ Version" picker), the Versions page and their toast. World map goal 4: both
// are pages inside the song sheet (SheetFrame.tsx), drawn by the app over whatever is open, the player too, so the
// music never stops. Back returns to the song sheet; a pull down closes it all. The rules are in family.ts; sending
// and Undo are in versionStore.ts.
// Versions page: a tap plays the version, a hold shows its choices in place (Make main, Remove, Not mine, Cancel).
// Look (overhaul wave 4): the list row every screen uses (60 high, a tile), theme colours only.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Tile } from './Art';
import { versionHoldMenu, type VersionChoice } from './family';
import { Icon } from './Icon';
import { useOutbox } from './outbox';
import { player, usePlayerPick, type PlayerSong } from './playerStore';
import { withPending } from './playOrder';
import { pageBack, SheetFrame } from './SheetFrame';
import { HOLD_MS } from './songActions';
import { tint } from './Tagging';
import { C, coveredBelow, R, S, T } from './theme';
import * as versions from './versionStore';
import { useVersions, type LibSong } from './versionStore';

const SHORT_LIST = 40;
const ROW_HEIGHT = S.row;
const MENU_ROW = 52; // a row of a version's menu, as in the tag hold menu
const PICKER_TALL = 0.85; // of the screen: the list has room, the dimmed screen above still shows where I was

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

/** A page's head: the Back arrow top left (44 to touch), then its name. */
function PageHead({ title, onBack, note }: { title: string; onBack: () => void; note?: string }) {
  return (
    <View style={s.sheetHeader}>
      <Pressable style={(p) => [s.headWord, tint(p)]} onPress={onBack} accessibilityLabel="Back">
        <Icon name="back" size={20} color={C.dim} />
      </Pressable>
      <View style={s.headWords}>
        <Text style={s.sheetTitle} numberOfLines={1}>{title}</Text>
        {note ? <Text style={s.headNote} numberOfLines={1}>{note}</Text> : null}
      </View>
    </View>
  );
}

/** Back: this page goes, and the song sheet it was opened from comes again (none: it just closes). */
const backFrom = (closePage: () => void) => () => {
  closePage();
  pageBack()?.();
};
/** Pull down, a tap on the dimmed screen: the whole sheet closes to where it opened. */
const closeAll = (closePage: () => void) => () => {
  pageBack();
  closePage();
};

function Picker() {
  const { picker, songs, families } = useVersions();
  const { pending } = useOutbox();
  const [query, setQuery] = useState('');
  const { height } = useWindowDimensions();
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

  if (!picker) return null;
  return (
    // a page inside the sheet (world map goal 4): tall enough for the list, the keyboard pushes the list up, not off
    <SheetFrame onClose={closeAll(versions.closePicker)} cancel={false} style={{ height: Math.round(height * PICKER_TALL) }}>
        <PageHead title="Add as a version of…" note={`“${picker.title}”: pick its Main`} onBack={backFrom(versions.closePicker)} />
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
            style={s.grow}
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
    </SheetFrame>
  );
}

function VersionsView({ url }: { url: string }) {
  const { versionsOf, songs } = useVersions();
  const { song: playing } = usePlayerPick('song');
  // the version whose menu is up: the page shows its choices in place of the list, Back returns to the list
  const [menuFor, setMenuFor] = useState<string | null>(null);
  useEffect(() => setMenuFor(null), [versionsOf]);
  if (!versionsOf) return null;
  const list = versions.members(versionsOf);
  const shut = () => versions.openVersions(null);
  const close = closeAll(shut);
  if (list.length < 2) {
    // the family is gone (the last version left): nothing to show
    setTimeout(close, 0);
    return null;
  }
  const info = (id: string) => songs?.find((song) => song.id === id);

  // a tap plays the version (world map: it was a menu); the one already playing goes on as it is
  const play = (id: string) => {
    if (playing?.id === id) return;
    const lib = info(id);
    player.playNow(url, { id, title: versions.songTitle(id), mine: lib?.mine ?? 'mine', sorted: lib?.sorted ?? true });
  };
  const run = (id: string, choice: VersionChoice) => {
    setMenuFor(null);
    const title = versions.songTitle(id);
    if (choice === 'Make main' || choice === 'Keep as Main') makeMainWithToast(id);
    else if (choice === 'Remove from Versions') {
      const sent = versions.remove(id);
      if (sent) versions.showToast({ text: `Removed: ${title}`, undo: () => versions.undo(sent) });
    } else if (choice === 'Not mine') notMine(url, id);
  };

  const menuOpen = menuFor && list.includes(menuFor) ? menuFor : null;
  const menuIsMain = menuOpen === list[0];
  if (menuOpen) {
    // a held version's choices, in place of the list (no second sheet); Cancel under a gap, where a slip does nothing
    return (
      <SheetFrame onClose={close} cancel={false}>
        <PageHead
          title={versions.songTitle(menuOpen)}
          note={menuIsMain ? `Main${versions.isPicked(menuOpen) ? ' (your pick)' : ' (newest)'}: plays in shuffle` : undefined}
          onBack={() => setMenuFor(null)}
        />
        {versionHoldMenu(menuIsMain, versions.isPicked(menuOpen)).map((choice) => (
          <View key={choice}>
            {choice === 'Cancel' ? <View style={s.menuGap} /> : null}
            <Pressable style={(p) => [s.menuItem, tint(p)]} onPress={() => run(menuOpen, choice)} accessibilityLabel={choice}>
              <Text style={[s.menuText, choice === 'Cancel' && s.menuCancel]} numberOfLines={1}>{choice}</Text>
            </Pressable>
          </View>
        ))}
      </SheetFrame>
    );
  }
  return (
    // a page inside the song sheet (world map goal 4); Compare is the song sheet's own row now
    <SheetFrame onClose={close} cancel={false}>
        <PageHead title={`Versions · ${list.length}`} note="Tap to play, hold for more" onBack={backFrom(shut)} />
        {list.map((id, i) => {
          const title = versions.songTitle(id);
          return (
            <Pressable key={id} style={(p) => [s.row, tint(p)]} onPress={() => play(id)} onLongPress={() => setMenuFor(id)} delayLongPress={HOLD_MS} accessibilityLabel={title} accessibilityHint="Hold for Make main, Remove, Not mine">
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
    </SheetFrame>
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

/** Mounted once, above every screen and the player sheet: both pages are drawn by the app (world map goal 4), so they
 * open over the player in place and the music never stops. */
export function VersionsLayer({ url }: { url: string }) {
  return (
    <>
      <Picker />
      <VersionsView url={url} />
      <VersionsToast />
    </>
  );
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  // "Versions · 3" in the player: a quiet word like "+ Version" and Compare beside it, 44 to touch
  chip: { color: C.dim, fontSize: 15, paddingHorizontal: 8, paddingVertical: 13 },
  // a page's head inside the sheet: Back (44 to touch), its name, a quiet note under it
  sheetHeader: { minHeight: S.row, flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomColor: C.line, borderBottomWidth: 1, marginBottom: 4 },
  headWord: { height: S.tap, minWidth: S.tap, alignItems: 'center', justifyContent: 'center', marginLeft: -10, borderRadius: 22 },
  headWords: { flex: 1, minWidth: 0, justifyContent: 'center' },
  sheetTitle: { ...T.row, fontWeight: '600' },
  headNote: { ...T.meta, marginTop: 2 },
  // the sheet is the raised colour: the field and the Main mark sit a step darker, so they still show
  input: { height: 48, color: C.text, fontSize: 16, backgroundColor: C.surface, borderRadius: R.field, paddingHorizontal: 12, marginTop: 8, marginBottom: 8 },
  label: { ...T.meta, paddingVertical: 8 },
  empty: { ...T.meta, fontSize: 15, textAlign: 'center', paddingTop: 32 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  rowWords: { flex: 1, minWidth: 0, justifyContent: 'center' },
  rowTitle: { ...T.row },
  rowPlaying: { color: C.accent },
  rowDetail: { ...T.meta, marginTop: 2, fontVariant: ['tabular-nums'] },
  mainMark: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: C.surface, justifyContent: 'center' },
  mainWord: { color: C.text, fontSize: 12, fontWeight: '600' },
  // a held version's choices, in place of the list (the tag hold menu's rows)
  menuItem: { height: MENU_ROW, justifyContent: 'center' },
  menuText: { ...T.row },
  menuGap: { height: 1, backgroundColor: C.line, marginTop: 8, marginBottom: 8 },
  menuCancel: { color: C.dim },
  // the same toast as the player's Undo: above the tab bar and the mini player, and over the sheet's pages
  toast: {
    position: 'absolute', left: 16, right: 16, bottom: coveredBelow(true, true) + 4, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.toast, borderRadius: R.toast, paddingVertical: 10, paddingHorizontal: 14, zIndex: 12,
  },
  toastText: { flex: 1, ...T.toast },
  toastTap: { minHeight: 28, justifyContent: 'center' },
  toastAction: { color: C.accent, fontSize: 16, fontWeight: '700' },
});
