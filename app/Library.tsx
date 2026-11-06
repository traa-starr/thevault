// The song list from the laptop: scroll, sort, filter by title, tap to play. Songs on the phone play from there; with the
// laptop off, the last list shows and only those play.
// Choices the laptop hasn't confirmed yet already show here. Hold a row for select mode: tick songs, then group them as
// versions, or call them Mine or Not mine, all at once with one Undo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Hidden from './Hidden';
import { HomeButton, takeSeed, useSeed } from './nav';
import { loadSongList, offline, saveSongList, useOffline } from './offline';
import { flush, useOutbox } from './outbox';
import { askShuffle } from './Player';
import { NOT_HERE, player, type Pool } from './playerStore';
import { withPending } from './playOrder';
import { setLibrary, useVersions, type LibSong } from './versionStore';
import { VersionsChip } from './Versions';
import * as versions from './versionStore';

type Song = LibSong;
type Sort = 'title' | 'date';
/** One filter at a time; tap it again for all songs. Unsorted: not called Mine and not judged yet. */
type Filter = 'all' | 'mine' | 'unsorted' | 'grouped';
const FILTER_WORD: Record<Filter, string> = { all: 'songs', mine: 'Mine', unsorted: 'unsorted', grouped: 'version groups' };
const FILTER_EMPTY: Record<Filter, string> = {
  all: 'No titles match',
  mine: 'No Mine songs yet',
  unsorted: 'Nothing left unsorted',
  grouped: 'No version groups yet',
};

const TIMEOUT_MS = 10000;
const ROW_HEIGHT = 60;
const WHERE: Record<string, string> = { laptop: 'On the laptop', cloud: 'Cloud only', gone: 'File missing' };

const number = (n: number) => n.toLocaleString('en-US');
const detail = (song: Song) => [song.date, offline.has(song.id) ? 'On this phone' : WHERE[song.where]].filter(Boolean).join(' · ');
const size = (bytes: number) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`);

/** One quiet line: downloads running, done, or stopped at the limit. */
function SavedLine() {
  const o = useOffline();
  if (!o.wanted && !o.stored) return null;
  let text = `On this phone: ${number(o.stored)} of ${number(o.wanted)} Mine songs · ${size(o.bytes)} of 8 GB`;
  if (o.saving) text = `Saving to phone: ${number(o.stored)} of ${number(o.wanted)}`;
  else if (o.full === 'limit') text = `8 GB limit reached: ${number(o.left)} Mine songs not on this phone`;
  else if (o.full === 'phone') text = `Phone storage full: ${number(o.left)} Mine songs not on this phone`;
  return <Text style={s.saved}>{text}</Text>;
}

export default function Library({ url, onBack }: { url: string; onBack: () => void }) {
  const [fetched, setFetched] = useState<Song[] | null>(null);
  const { pending, refused } = useOutbox();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState<Sort>('date'); // Newest every time the app opens
  const [filter, setFilter] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [only, setOnly] = useState<Filter>('all');
  const mineOnly = only === 'mine';
  const toggle = (one: Filter) => setOnly(only === one ? 'all' : one);
  // select mode: the ticked rows, first held first (that one becomes Main)
  const [selecting, setSelecting] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const rows = useRef<FlatList<Song>>(null);
  const seed = useSeed();

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
    let current = true;
    setFailed(false);
    (async () => {
      try {
        await flush(); // so the list comes back with my latest choices in it
        const asked = Date.now();
        const r = await fetch(`${url}/songs`, { signal: abort.signal });
        if (!r.ok) throw new Error(`Server said ${r.status}`);
        const data: { songs: Song[] } = await r.json();
        if (!current) return;
        offline.setReachable(true);
        saveSongList(data.songs, asked);
        setLibrary(data.songs, asked);
        setFetched(data.songs);
      } catch {
        if (!current) return;
        setFailed(true);
        offline.setReachable(false);
        // the last list, so songs on the phone still play
        const last = loadSongList<Song>();
        if (last && !fetched) {
          setLibrary(last.songs, last.asked);
          setFetched(last.songs);
        }
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

  // the outbox has just emptied, so the laptop now holds what it held
  const waiting = pending.length > 0;
  const wasWaiting = useRef(waiting);
  useEffect(() => {
    if (wasWaiting.current && !waiting) setAttempt((n) => n + 1);
    wasWaiting.current = waiting;
  }, [waiting]);

  const { families } = useVersions();
  // one row per family: the Main stands for its versions
  const songs = useMemo(
    () => fetched && withPending(fetched, pending).filter((song) => (families.get(song.id) ?? song.id) === song.id),
    [fetched, pending, families],
  );

  const sorted = useMemo(() => {
    const byTitle = [...(songs ?? [])].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'title') return byTitle;
    // Newest first, no date last. A year-only date sorts just after the full dates of that year.
    return byTitle.sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : (a.date ?? '') > (b.date ?? '') ? -1 : 0));
  }, [songs, sort]);

  const base = useMemo(() => {
    if (only === 'mine') return sorted.filter((song) => song.mine === 'mine');
    if (only === 'unsorted') return sorted.filter((song) => song.mine !== 'mine' && !song.sorted);
    if (only === 'grouped') return sorted.filter((song) => families.has(song.id));
    return sorted;
  }, [sorted, only, families]);

  const shown = useMemo(() => {
    const wanted = filter.trim().toLowerCase();
    return wanted ? base.filter((song) => song.title.toLowerCase().includes(wanted)) : base;
  }, [base, filter]);

  const { reachable, stored } = useOffline();
  const laptopOff = reachable === false;
  const canPlay = (song: Song) => offline.has(song.id) || (!laptopOff && song.where === 'laptop');
  const playable = useMemo(() => shown.filter(canPlay), [shown, laptopOff, stored]);

  const open = (start: Song, shuffle: boolean, pool: Pool = mineOnly ? 'mine' : 'unsorted') => {
    Keyboard.dismiss();
    if (!canPlay(start)) return player.showMessage(NOT_HERE);
    player.playList(url, playable, start.id, shuffle, pool);
    player.open('player');
  };

  // unsorted lands only on songs not yet called mine, Mine only on Mine; tapping any song still plays it
  const shuffle = (pool: Pool) => {
    const from = playable.filter((song) => (song.mine === 'mine') === (pool === 'mine'));
    if (from.length) open(from[Math.floor(Math.random() * from.length)], true, pool);
  };

  const cancelSelect = () => {
    setSelecting(false);
    setTicked([]);
  };

  const tick = (song: Song) =>
    setTicked((old) => (old.includes(song.id) ? old.filter((id) => id !== song.id) : [...old, song.id]));

  // hold a row: select mode, that row ticked first
  const hold = (song: Song) => {
    Keyboard.dismiss();
    if (selecting) return tick(song);
    setSelecting(true);
    setTicked([song.id]);
  };

  // the full player's "Another version of…": select mode with the playing song (its family's row) ticked, scrolled to
  useEffect(() => {
    if (!seed || !songs) return;
    const id = families.get(seed) ?? seed;
    takeSeed();
    setFilter('');
    setSelecting(true);
    setTicked([id]);
    const at = base.findIndex((song) => song.id === id);
    if (at >= 0) setTimeout(() => rows.current?.scrollToIndex({ index: at, viewPosition: 0.3, animated: false }), 0);
  }, [seed, songs]);

  const byId = useMemo(() => new Map((songs ?? []).map((song) => [song.id, song])), [songs]);
  const tickedSongs = ticked.map((id) => byId.get(id)).filter((song): song is Song => !!song);
  const isMineNow = (song: Song) => player.markOf(song).mine === 'mine';
  // the Main the ticked rows would get: my pick if one has it, else the newest
  const groupMain = useMemo(() => (selecting && ticked.length > 1 ? versions.groupMainOf(ticked) : null), [selecting, ticked, families]);

  const groupTicked = () => {
    const mined = tickedSongs.filter((song) => !isMineNow(song) && !families.has(song.id)).map((song) => song.id);
    const sent = versions.group(ticked, mined);
    cancelSelect();
    if (!sent) return versions.showToast({ text: 'Already one family' });
    mined.forEach((id) => player.setMark(id, { mine: 'mine', sorted: true }));
    const main = Object.values(sent.edit.songs)[0] ?? ticked[0];
    versions.showToast({
      text: `Versions · ${versions.members(main).length}, Main: ${versions.songTitle(main)}${mined.length ? ` · ${mined.length} now Mine` : ''}`,
      undo: () => {
        versions.undo(sent);
        mined.forEach((id) => player.setMark(id, null));
      },
    });
  };

  // a family row stays as it is: its songs are Mine already, and Not mine on one needs Versions first
  const judgeTicked = (value: 'mine' | 'not mine') => {
    const grouped = tickedSongs.filter((song) => families.has(song.id));
    const chosen = tickedSongs.filter((song) => !families.has(song.id) && (value === 'not mine' || !isMineNow(song)));
    cancelSelect();
    const skipped = value === 'not mine' && grouped.length
      ? `${grouped.length} version ${grouped.length === 1 ? 'group' : 'groups'} skipped: use Versions`
      : '';
    if (!chosen.length) return versions.showToast({ text: skipped || 'Already Mine' });
    player.judge(chosen, value);
    const what = chosen.length === 1 ? chosen[0].title : `${chosen.length} songs`;
    versions.showToast({
      text: `${value === 'mine' ? 'Mine' : 'Hidden'}: ${what}${skipped ? ` · ${skipped}` : ''}`,
      undo: () => player.unjudge(chosen),
    });
  };

  const closeHidden = () => {
    setShowHidden(false);
    setAttempt(attempt + 1); // a restored song is back in the list, and the count with it
  };

  return (
    <View style={s.fill}>
    {showHidden ? <Hidden url={url} onBack={closeHidden} /> : null}
    <View style={[s.page, showHidden && s.hidden]}>
      <View style={s.header}>
        <Pressable onPress={selecting ? cancelSelect : onBack}>
          <Text style={s.link}>{selecting ? 'Cancel' : 'Back'}</Text>
        </Pressable>
        <Text style={s.title}>{selecting ? `${number(ticked.length)} ticked` : 'Library'}</Text>
        <HomeButton />
      </View>
      {!selecting ? <SavedLine /> : null}
      {failed && songs ? (
        <Pressable onPress={() => setAttempt(attempt + 1)}>
          <Text style={s.offline}>Laptop not reachable: songs on this phone still play. Tap to try again.</Text>
        </Pressable>
      ) : null}
      {refused ? <Text style={s.refused}>The laptop refused {refused === 1 ? '1 change' : `${refused} changes`}, so {refused === 1 ? "it wasn't" : "they weren't"} saved</Text> : null}
      {failed && !songs ? (
        <View style={s.middle}>
          <Text style={s.line}>Laptop not reachable</Text>
          <Pressable onPress={() => setAttempt(attempt + 1)}>
            <Text style={s.link}>Try again</Text>
          </Pressable>
        </View>
      ) : !songs ? (
        <View style={s.middle}>
          <Text style={s.line}>Loading songs…</Text>
        </View>
      ) : (
        <>
          <TextInput
            style={s.input}
            value={filter}
            onChangeText={setFilter}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            placeholder="Filter by title"
            placeholderTextColor="#888"
            clearButtonMode="while-editing"
          />
          <View style={s.bar}>
            <Text style={s.count}>
              {filter.trim() ? `${number(shown.length)} of ${number(base.length)}` : `${number(base.length)} ${FILTER_WORD[only]}`}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sortScroll} contentContainerStyle={s.sorts}>
              {playable.length ? (
                <Pressable onPress={() => (mineOnly ? shuffle('mine') : askShuffle(shuffle))}>
                  <Text style={s.sort}>Shuffle</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => toggle('mine')}>
                <Text style={[s.sort, only === 'mine' && s.sortOn]}>Mine</Text>
              </Pressable>
              <Pressable onPress={() => toggle('unsorted')}>
                <Text style={[s.sort, only === 'unsorted' && s.sortOn]}>Unsorted</Text>
              </Pressable>
              <Pressable onPress={() => toggle('grouped')}>
                <Text style={[s.sort, only === 'grouped' && s.sortOn]}>Grouped</Text>
              </Pressable>
              <Pressable onPress={() => setSort('title')}>
                <Text style={[s.sort, sort === 'title' && s.sortOn]}>A-Z</Text>
              </Pressable>
              <Pressable onPress={() => setSort('date')}>
                <Text style={[s.sort, sort === 'date' && s.sortOn]}>Newest</Text>
              </Pressable>
              <Pressable onPress={() => setShowHidden(true)}>
                <Text style={s.sort}>Hidden</Text>
              </Pressable>
            </ScrollView>
          </View>
          <FlatList
            ref={rows}
            key={sort}
            onScrollToIndexFailed={() => {}}
            data={shown}
            keyExtractor={(song) => song.id}
            getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={s.empty}>{filter.trim() ? 'No titles match' : FILTER_EMPTY[only]}</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={[s.row, selecting && s.rowSelecting]}
                disabled={!selecting && item.where !== 'laptop' && !offline.has(item.id)}
                onPress={() => (selecting ? tick(item) : open(item, false))}
                onLongPress={() => hold(item)}
                delayLongPress={400}
              >
                {selecting ? (
                  <View style={[s.tick, ticked.includes(item.id) && s.tickOn]}>
                    <Text style={s.tickMark}>{ticked.includes(item.id) ? '✓' : ' '}</Text>
                  </View>
                ) : null}
                <View style={s.rowText}>
                <View style={s.rowTop}>
                  <Text style={[s.rowTitle, !canPlay(item) && s.rowOff]} numberOfLines={1}>{item.title}</Text>
                  <VersionsChip id={item.id} />
                </View>
                <Text style={s.rowDetail} numberOfLines={1}>
                  {groupMain === item.id ? 'Main · ' : ''}
                  {detail(item)}
                </Text>
                </View>
              </Pressable>
            )}
          />
          {selecting ? (
            <View style={s.selectBar}>
              <Pressable
                style={[s.groupButton, ticked.length < 2 && s.off]}
                disabled={ticked.length < 2}
                onPress={groupTicked}
              >
                <Text style={s.groupText}>Group as versions</Text>
              </Pressable>
              <Pressable style={[s.small, !ticked.length && s.off]} disabled={!ticked.length} onPress={() => judgeTicked('mine')}>
                <Text style={s.smallText}>Mine</Text>
              </Pressable>
              <Pressable style={[s.small, !ticked.length && s.off]} disabled={!ticked.length} onPress={() => judgeTicked('not mine')}>
                <Text style={s.smallText}>Not mine</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#111' },
  hidden: { display: 'none' },
  page: { flex: 1, backgroundColor: '#111', paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  line: { color: '#ddd', fontSize: 18 },
  input: { color: '#fff', fontSize: 16, borderColor: '#555', borderWidth: 1, borderRadius: 8, padding: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  count: { color: '#ddd', fontSize: 14, fontVariant: ['tabular-nums'] },
  refused: { color: '#f28b82', fontSize: 14, paddingBottom: 8 },
  sortScroll: { flexGrow: 0, flexShrink: 1, marginLeft: 8 },
  sorts: { flexDirection: 'row', gap: 4 },
  sort: { color: '#8ab4f8', fontSize: 15, paddingVertical: 8, paddingHorizontal: 10 },
  sortOn: { color: '#fff', fontWeight: '700' },
  empty: { color: '#888', fontSize: 15, textAlign: 'center', paddingTop: 32 },
  row: { height: ROW_HEIGHT, justifyContent: 'center', borderBottomColor: '#2a2a2a', borderBottomWidth: 1 },
  rowSelecting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 12 },
  rowText: { flex: 1, justifyContent: 'center' },
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#666', alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: '#8ab4f8', borderColor: '#8ab4f8' },
  tickMark: { color: '#111', fontSize: 14, fontWeight: '800' },
  selectBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  groupButton: { flex: 1, backgroundColor: '#1e5b34', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  groupText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  small: { borderWidth: 1, borderColor: '#555', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  smallText: { color: '#ddd', fontSize: 15 },
  off: { opacity: 0.4 },
  saved: { color: '#888', fontSize: 13, paddingBottom: 6, fontVariant: ['tabular-nums'] },
  offline: { color: '#f2c97d', fontSize: 14, paddingBottom: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { color: '#fff', fontSize: 16, flexShrink: 1 },
  rowOff: { color: '#777' },
  rowDetail: { color: '#888', fontSize: 13, marginTop: 2 },
});
