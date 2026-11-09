// "+ Version" picker, the Versions view and their toast. Sheets over whatever screen is open, so the music
// never stops. The rules are in family.ts; sending and Undo are in versions.ts.
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { compare } from './compareStore';
import { useOutbox } from './outbox';
import { player, usePlayerPick, type PlayerSong } from './playerStore';
import { withPending } from './playOrder';
import * as versions from './versionStore';
import { useVersions, type LibSong } from './versionStore';

const SHORT_LIST = 40;
const ROW_HEIGHT = 60;
const AFTER_CLOSE_MS = 700;

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
export function VersionsChip({ id, style, onPress }: { id: string; style?: object; onPress?: () => void }) {
  const { families } = useVersions();
  const count = families.has(id) ? versions.members(id).length : 1;
  if (count < 2) return null;
  return (
    <Pressable onPress={onPress ?? (() => versions.openVersions(id))} hitSlop={8} style={style}>
      <Text style={s.chip}>Versions · {count}</Text>
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

  if (!picker) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={versions.closePicker}>
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Pressable onPress={versions.closePicker}>
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
          placeholderTextColor="#888"
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
                style={s.row}
                onPress={() => {
                  Keyboard.dismiss();
                  picker.onPick?.(item.id);
                }}
              >
                <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.rowDetail} numberOfLines={1}>{[item.folder, ago(item.date)].filter(Boolean).join(' · ')}</Text>
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
  if (!versionsOf) return null;
  const list = versions.members(versionsOf);
  const close = () => versions.openVersions(null);
  if (list.length < 2) {
    // the family is gone (the last version left): nothing to show
    setTimeout(close, 0);
    return null;
  }
  const info = (id: string) => songs?.find((song) => song.id === id);

  const menu = (id: string, isMain: boolean) => {
    const title = versions.songTitle(id);
    const lib = info(id);
    const options = [
      {
        text: 'Play',
        onPress: () => player.playNow(url, { id, title, mine: lib?.mine ?? 'mine', sorted: lib?.sorted ?? true }),
      },
      // the newest is Main by itself; Keep as Main makes it stay when a newer version joins
      ...(!isMain ? [{ text: 'Make main', onPress: () => makeMainWithToast(id) }]
        : versions.isPicked(id) ? [] : [{ text: 'Keep as Main', onPress: () => makeMainWithToast(id) }]),
      {
        text: 'Remove from Versions',
        onPress: () => {
          const sent = versions.remove(id);
          if (sent) versions.showToast({ text: `Removed: ${title}`, undo: () => versions.undo(sent) });
        },
      },
      ...(isMain ? [] : [{ text: 'Not mine', style: 'destructive' as const, onPress: () => notMine(url, id) }]),
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert(title, isMain ? `Main${versions.isPicked(id) ? ' (your pick)' : ' (newest)'}: plays in shuffle` : undefined, options);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Pressable onPress={close}>
            <Text style={s.link}>Done</Text>
          </Pressable>
          <Text style={s.sheetTitle}>Versions · {list.length}</Text>
          <View style={s.grow} />
          {/* one sheet at a time on iOS: this one goes first, then Compare opens */}
          <Pressable onPress={() => { close(); setTimeout(() => compare.openFromLibrary(url, versionsOf), AFTER_CLOSE_MS); }}>
            <Text style={s.link}>Compare</Text>
          </Pressable>
        </View>
        <Text style={s.sheetNote}>The Main plays in shuffle and holds the Library row. It's the newest version unless you pick one with Make main.</Text>
        {list.map((id, i) => (
          <Pressable key={id} style={s.row} onPress={() => menu(id, i === 0)}>
            <Text style={s.rowTitle} numberOfLines={1}>
              {versions.songTitle(id)}
              {playing?.id === id ? '  ♪' : ''}
            </Text>
            <Text style={s.rowDetail} numberOfLines={1}>
              {[i === 0 ? (versions.isPicked(id) ? 'Main, your pick' : 'Main') : null, info(id)?.folder, info(id)?.date].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        ))}
      </View>
      <VersionsToast />
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
        <Pressable onPress={() => { toast.action!.run(); }} hitSlop={8}>
          <Text style={s.toastAction}>{toast.action.label}</Text>
        </Pressable>
      ) : null}
      {toast.undo ? (
        <Pressable onPress={() => { versions.showToast(null); toast.undo!(); }} hitSlop={8}>
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
  chip: { color: '#8ab4f8', fontSize: 13, fontWeight: '600' },
  sheet: { flex: 1, backgroundColor: '#161616', paddingTop: 16, paddingHorizontal: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '700', flexShrink: 1 },
  sheetNote: { color: '#999', fontSize: 14, marginBottom: 10 },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8 },
  input: { color: '#fff', fontSize: 16, borderColor: '#555', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  label: { color: '#888', fontSize: 13, paddingVertical: 6 },
  empty: { color: '#888', fontSize: 15, textAlign: 'center', paddingTop: 32 },
  row: { height: ROW_HEIGHT, justifyContent: 'center', borderBottomColor: '#2a2a2a', borderBottomWidth: 1 },
  rowTitle: { color: '#fff', fontSize: 16 },
  rowDetail: { color: '#888', fontSize: 13, marginTop: 2 },
  toast: {
    position: 'absolute', left: 12, right: 12, bottom: 150, flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#333', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
  },
  toastText: { color: '#fff', fontSize: 15, flex: 1 },
  toastAction: { color: '#8ab4f8', fontSize: 15, fontWeight: '700' },
});
