// Hidden songs (calm part 1, 2026-11-12): the songs I called Not mine, opened from Settings, not from Library any more.
// A search (title or folder), one sideways row of folder chips, the count, and the list. Tap a row: it plays, streamed
// from the laptop like Sort did (nothing saved on the phone). Restore goes through the outbox like Undo, so it works
// when the laptop is away. A restored row stays where it is (its pill says "In Library") so nothing under the thumb
// moves; it's gone next time the screen opens. What a search and a folder keep: hiddenCore.ts (plain code, tested).
// Look: the list row every screen uses (60 high, a tile), theme colours only.
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Tile } from './Art';
import { hiddenCountLine, hiddenEmptyLine, hiddenFolders, hiddenShown, refusedRestores } from './hiddenCore';
import { addChange, flush, onSent, useOutbox } from './outbox';
import { withoutRestored } from './playOrder';
import { player, usePlayerPick } from './playerStore';
import { Tap } from './Tap';
import { C, coveredBelow, R, S, T } from './theme';

type Song = { id: string; title: string; where: string; date: string | null; folder?: string; mine: string; sorted: boolean; length?: number | null };

const TIMEOUT_MS = 10000;
const ROW_HEIGHT = S.row;
const WHERE: Record<string, string> = { laptop: '', cloud: 'Cloud only', gone: 'File missing' };
const rowLayout = (_: unknown, index: number) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index });

// date and "Cloud only" first: a long folder name is what gets cut, never them
const detail = (song: Song) => [song.date, WHERE[song.where], song.folder].filter(Boolean).join(' · ');

export default function Hidden({ url, mini, onBack }: { url: string; mini: boolean; onBack: () => void }) {
  const [fetched, setFetched] = useState<Song[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  // song id to the change sent for it: a refused change gives the row its Restore back (review catch 2)
  const [restored, setRestored] = useState<ReadonlyMap<string, string>>(new Map());
  const taken = useRef(new Set<string>());
  const { pending } = useOutbox();
  const pendingNow = useRef(pending);
  pendingNow.current = pending;
  const { song: playing } = usePlayerPick('song');
  useEffect(() => onSent((accepted) => accepted.forEach((change) => taken.current.add(change.id))), []);
  useEffect(() => {
    const refused = refusedRestores(restored, new Set(pending.map((change) => change.id)), taken.current);
    if (refused.length) setRestored((was) => new Map([...was].filter(([song]) => !refused.includes(song))));
  }, [pending, restored]);

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
    let current = true;
    setFailed(false);
    (async () => {
      try {
        await flush(); // so a song I just hid is in the list, and one I just restored isn't
        const r = await fetch(`${url}/songs?hidden=1`, { signal: abort.signal });
        if (!r.ok) throw new Error(`Server said ${r.status}`);
        const data: { songs: Song[] } = await r.json();
        // restores still on their way are left out once, here: after that a row only leaves when the screen opens again
        if (current) setFetched(withoutRestored(data.songs, pendingNow.current));
      } catch {
        if (current) setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      current = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [url, attempt]);

  const typed = useDeferredValue(search);
  const songs = fetched ?? [];
  const folders = useMemo(() => hiddenFolders(songs), [fetched]);
  const shown = useMemo(() => hiddenShown(songs, typed, folder), [fetched, typed, folder]);
  const total = songs.length - restored.size;
  const narrowed = !!typed.trim() || folder !== null;
  const shownLeft = narrowed ? shown.filter((song) => !restored.has(song.id)).length : total;
  const playable = useMemo(() => shown.filter((song) => song.where === 'laptop'), [shown]);

  const play = (song: Song) => {
    if (song.where !== 'laptop') return;
    player.playList(url, playable, song.id, false);
  };
  const restore = (song: Song) => {
    if (restored.has(song.id)) return; // a second tap on the same pill does nothing: the row never moved
    const [change] = addChange('mine_restore', song.id);
    setRestored((was) => new Map(was).set(song.id, change.id));
  };
  const pickFolder = (name: string | null) => setFolder(folder === name ? null : name);

  const header = (
    <View style={s.header}>
      <Tap style={s.back} radius={22} onPress={onBack} accessibilityLabel="Back">
        <Text style={s.backWord}>Back</Text>
      </Tap>
      <Text style={s.title}>Hidden songs</Text>
    </View>
  );

  if (!fetched) {
    return (
      <View style={s.page}>
        {header}
        <View style={s.middle}>
          {failed ? (
            <>
              <Text style={[s.line, s.warn]}>Laptop not reachable</Text>
              <Tap style={s.again} radius={22} onPress={() => setAttempt(attempt + 1)}>
                <Text style={s.againWord}>Try again</Text>
              </Tap>
            </>
          ) : (
            <Text style={s.line}>Loading…</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    // the list ends above the tab bar and the mini player, as Library's does: no row is ever under them
    <View style={[s.page, { paddingBottom: coveredBelow(true, mini) }]}>
      {header}
      {songs.length ? (
        <>
          <View style={s.searchRow}>
            <TextInput
              style={s.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search title or folder"
              placeholderTextColor={C.faint}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              keyboardAppearance="dark"
              clearButtonMode="always"
              accessibilityLabel="Search hidden songs"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
            <FolderChip word="All folders" on={folder === null} onPress={() => setFolder(null)} />
            {folders.map((one) => (
              <FolderChip key={one.name} word={`${one.name} · ${one.count.toLocaleString('en-US')}`} on={folder === one.name} onPress={() => pickFolder(one.name)} />
            ))}
          </ScrollView>
        </>
      ) : null}
      <FlatList
        data={shown}
        extraData={[restored, playing?.id]}
        keyExtractor={(song) => song.id}
        getItemLayout={rowLayout}
        initialNumToRender={14}
        maxToRenderPerBatch={20}
        windowSize={11}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.listEnd}
        ListHeaderComponent={songs.length ? <Text style={s.count}>{hiddenCountLine(shownLeft, total, narrowed)}</Text> : undefined}
        ListEmptyComponent={<Text style={s.empty}>{hiddenEmptyLine(songs.length, typed, folder)}</Text>}
        renderItem={({ item }) => {
          const back = restored.has(item.id);
          const off = item.where !== 'laptop';
          return (
            <View style={s.row}>
              <Tap style={[s.rowTap, off && s.off]} radius={R.rowTile} onPress={() => play(item)} disabled={off} accessibilityLabel={`Play ${item.title}`}>
                <Tile title={item.title} date={item.date} size={S.rowTile} radius={R.rowTile} plain />
                <View style={s.text}>
                  <Text style={[s.rowTitle, playing?.id === item.id && s.playing]} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.rowDetail} numberOfLines={1}>{detail(item) || ' '}</Text>
                </View>
              </Tap>
              {back ? (
                <View style={s.restore}>
                  <Text style={s.backWordDone}>In Library</Text>
                </View>
              ) : (
                <Tap style={[s.restore, s.restoreOn]} radius={18} onPress={() => restore(item)} hitSlop={4} accessibilityLabel={`Restore ${item.title}`}>
                  <Text style={s.restoreWord}>Restore</Text>
                </Tap>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function FolderChip({ word, on, onPress }: { word: string; on: boolean; onPress: () => void }) {
  return (
    <Tap style={s.chipTap} radius={18} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <View style={[s.chip, on && s.chipOn]}>
        <Text style={[s.chipWord, on && s.chipWordOn]} numberOfLines={1}>{word}</Text>
      </View>
    </Tap>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg, paddingTop: S.statusBar + 6, paddingHorizontal: S.side },
  header: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { height: S.tap, minWidth: S.tap, justifyContent: 'center', marginLeft: -8 },
  backWord: { color: C.dim, fontSize: 15, paddingHorizontal: 8 },
  title: { ...T.title, flex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  line: { ...T.meta, fontSize: 15 },
  warn: { color: C.warnText },
  again: { minHeight: S.tap, borderRadius: 22, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.raised, overflow: 'hidden' },
  againWord: { color: C.text, fontSize: 15, fontWeight: '600' },
  searchRow: { marginBottom: 4 },
  search: { height: 48, color: C.text, fontSize: 16, backgroundColor: C.raised, borderRadius: R.field, paddingHorizontal: 12 },
  // the chips run to both screen edges, the first in line with everything else
  chipScroll: { flexGrow: 0, flexShrink: 0, height: S.tap, marginHorizontal: -S.side },
  chips: { paddingHorizontal: S.side, gap: 8, alignItems: 'center' },
  chipTap: { height: S.tap, justifyContent: 'center' },
  chip: { height: 36, maxWidth: 240, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.raised, justifyContent: 'center' },
  chipOn: { backgroundColor: C.text },
  chipWord: { ...T.chip, color: C.dim, fontWeight: '600' },
  chipWordOn: { color: C.bg },
  count: { ...T.meta, paddingVertical: 8, fontVariant: ['tabular-nums'] },
  listEnd: { paddingBottom: 8 },
  empty: { ...T.meta, fontSize: 15, textAlign: 'center', paddingTop: 32 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTap: { flex: 1, minWidth: 0, height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12 },
  off: { opacity: 0.4 },
  text: { flex: 1, minWidth: 0 },
  rowTitle: { ...T.row },
  playing: { color: C.accent },
  rowDetail: { ...T.meta, marginTop: 2 },
  // a quiet pill, 36 high with its touch reaching 44; the same width either way so nothing beside it moves
  restore: { height: 36, width: 96, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  restoreOn: { backgroundColor: C.raised },
  restoreWord: { color: C.text, fontSize: 14, fontWeight: '600' },
  backWordDone: { color: C.faint, fontSize: 14 },
});
