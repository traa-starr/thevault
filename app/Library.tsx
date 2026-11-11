// The song list from the laptop (overhaul wave 2, Wall's look): a tile on every row, my Favorite / Archived marks,
// chips to narrow it (All, Mine, Favorites, Archived, Needs tags, Versions), three orders (Newest, A to Z, Most
// played). Tap a row to play. Songs on the phone play from there; with the laptop off, the last list shows and only
// those play. Search has its own screen now (SearchScreen.tsx).
// Choices the laptop hasn't confirmed yet already show here. Hold a row for select mode: tick songs, then group them as
// versions, or call them Mine or Not mine, all at once with one Undo.
// What a chip keeps and how a list is ordered: libraryCore.ts (plain code, tested).
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Hidden from './Hidden';
import { Icon } from './Icon';
import { CHIPS, chipSongs, keepIfSame, linesByRow, nextSort, rowLayout, sortSongs, type Chip, type SortBy } from './libraryCore';
import { takeLibraryAsk, takeSeed, useLibraryAsk, useSeed } from './nav';
import { loadSongList, offline, saveSongList, useOffline } from './offline';
import { flush, useOutbox } from './outbox';
import { LaptopLine, RestoreNotice, WaitingLine } from './Notices';
import { NOT_HERE, player, usePlayerWith, type Pool } from './playerStore';
import { playStore } from './playStore';
import { ratingStore, useRatings } from './ratingStore';
import { session } from './sessionStore';
import { SongRow } from './SongRow';
import { useAllTags } from './tagStore';
import { tint } from './Tagging';
import { Tap } from './Tap';
import { C, S, T } from './theme';
import { libraryShuffleTap, pickable, shuffleWords, withPending } from './playOrder';
import { setLibrary, useVersions, type LibSong } from './versionStore';
import * as versions from './versionStore';

type Song = LibSong;
const CHIP_WORD: Record<Chip, string> = { all: 'All', mine: 'Mine', fire: 'Favorites', shelved: 'Archived', untagged: 'Needs tags', grouped: 'Versions', unsorted: 'Unsorted' };
/** After the count: "671 Mine", "12 to tag". */
const COUNT_WORD: Record<Chip, string> = { all: 'songs', mine: 'Mine', fire: 'Favorites', shelved: 'Archived', untagged: 'to tag', grouped: 'version groups', unsorted: 'unsorted' };
const CHIP_EMPTY: Record<Chip, string> = {
  all: 'No songs yet',
  mine: 'No Mine songs yet',
  fire: 'No Favorites yet: tap Favorite in the player',
  shelved: 'Nothing archived',
  untagged: 'Every Mine song has a line tagged',
  grouped: 'No version groups yet',
  unsorted: 'Nothing left unsorted',
};
const SORT_WORD: Record<SortBy, string> = { date: 'Newest', title: 'A to Z', plays: 'Most played' };

const TIMEOUT_MS = 10000;
/** The Shuffle pill is 36 high: 4 more above and below makes its touch the full 44. */
const SHUFFLE_SLOP = { top: 4, bottom: 4 };
const WHERE: Record<string, string> = { laptop: 'On the laptop', cloud: 'Cloud only', gone: 'File missing' };

const number = (n: number) => n.toLocaleString('en-US');
const size = (bytes: number) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`);

/** One quiet line: downloads running, done, or stopped at the limit. */
function SavedLine() {
  const o = useOffline();
  if (!o.wanted && !o.stored) return null;
  // every Mine song counts, the ones the laptop is still making a copy of too, so the line never says "all" too soon
  let text = `${number(o.stored)} of ${number(o.wanted)} Mine songs on this phone · ${size(o.bytes)} of 8 GB`;
  if (o.noCopy && !o.saving && !o.full) text += ` · ${number(o.noCopy)} waiting on the laptop`;
  if (o.saving) text = `Saving to phone: ${number(o.stored)} of ${number(o.wanted)}`;
  else if (o.full === 'limit') text = `8 GB limit reached: ${number(o.left)} Mine songs not on this phone`;
  else if (o.full === 'phone') text = `Phone storage full: ${number(o.left)} Mine songs not on this phone`;
  return <Text style={s.saved}>{text}</Text>;
}

export default function Library({ url }: { url: string }) {
  const [fetched, setFetched] = useState<Song[] | null>(null);
  const { pending: waitingAll, refused } = useOutbox();
  // my choices only: a play joining the outbox changes nothing Library draws, so it must not redraw 1,395 rows
  const choiceKey = waitingAll.filter((change) => change.kind !== 'play_add').map((change) => change.id).join();
  const pending = useMemo(() => waitingAll.filter((change) => change.kind !== 'play_add'), [choiceKey]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState<SortBy>('date'); // Newest every time the app opens
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenOnLaptop, setHiddenOnLaptop] = useState<number | null>(null); // null: an older laptop, or not asked yet
  const [only, setOnly] = useState<Chip>('all');
  const mineOnly = only === 'mine';
  // a chip tapped again goes back to All
  const toggle = (one: Chip) => setOnly(only === one ? 'all' : one);
  // Most played uses the counts as they were when I chose it: a song reaching 0:30 never moves a row under my thumb
  const [plays, setPlays] = useState(playStore.all);
  const changeSort = () => {
    setPlays(playStore.all());
    setSort(nextSort(sort));
  };
  // select mode: the ticked rows, first held first (that one becomes Main)
  const [selecting, setSelecting] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const rows = useRef<FlatList<Song>>(null);
  const seed = useSeed();
  const ask = useLibraryAsk();

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
        const data: { songs: Song[]; hidden?: number } = await r.json();
        if (!current) return;
        offline.setReachable(true);
        setHiddenOnLaptop(data.hidden ?? null);
        saveSongList(data.songs, asked);
        ratingStore.setBase(data.songs, asked);
        playStore.setBase(data.songs, asked);
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

  // the outbox has just emptied, so the laptop now holds what it held. A play isn't a choice: it never asks for the
  // list again (the list would come every song, and redraw Library under the music)
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

  const sorted = useMemo(() => sortSongs(songs ?? [], sort, plays), [songs, sort, plays]);

  // the laptop's count plus my Not mine taps still on their way (they're already out of the list)
  const hiddenCount = useMemo(
    () => (hiddenOnLaptop === null || !fetched ? null : hiddenOnLaptop + fetched.length - withPending(fetched, pending).length),
    [hiddenOnLaptop, fetched, pending],
  );
  const byId = useMemo(() => new Map((songs ?? []).map((song) => [song.id, song])), [songs]);
  const ratings = useRatings();
  // how many lines each row has tagged (its versions' lines count for it). The same Map until a count changes, so a
  // play or a rating joining the outbox redraws nothing here
  const allTags = useAllTags();
  const linesWas = useRef<Map<string, number> | null>(null);
  const lines = useMemo(() => (linesWas.current = keepIfSame(linesWas.current, linesByRow(allTags, (id) => families.get(id) ?? id))), [allTags, families]);
  const base = useMemo(
    () => chipSongs(sorted, only, { rating: (id) => ratings.get(id), grouped: (id) => families.has(id), tagged: (id) => lines.has(id) }),
    [sorted, only, families, ratings, lines],
  );
  // Unsorted is a chip only while something is still unsorted (sorting is done; it comes back if new songs arrive)
  const anyUnsorted = useMemo(() => (songs ?? []).some((song) => song.mine !== 'mine' && !song.sorted), [songs]);
  const chips = anyUnsorted || only === 'unsorted' ? [...CHIPS, 'unsorted' as const] : CHIPS;
  // the chips don't all fit across the screen: the one that's on is always brought into view (a "See all" on Home
  // may pick one that was off the right edge)
  const chipRow = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const chipAt = useRef<Partial<Record<Chip, number>>>({});
  useEffect(() => {
    const x = chipAt.current[only];
    if (x !== undefined) chipRow.current?.scrollTo({ x: Math.max(0, x - 56), animated: false });
  }, [only, !!songs]);

  const { reachable, stored } = useOffline();
  const laptopOff = reachable === false;
  const canPlay = (song: Song) => offline.has(song.id) || (!laptopOff && song.where === 'laptop');
  // what plays: the Library list as it stands (chips and sort)
  const playable = useMemo(() => base.filter(canPlay), [base, laptopOff, stored]);

  const open = (start: Song, shuffle: boolean, pool: Pool = mineOnly ? 'mine' : 'unsorted') => {
    if (!canPlay(start)) return player.showMessage(NOT_HERE);
    player.playList(url, playable, start.id, shuffle, pool);
    player.open('player');
  };

  // Shuffle cycles like the player's (Off > Mine > Unsorted > Off), in place, no box. Nothing playing: a song from that
  // pool starts in the bar. Something playing: it plays on, only what comes next changes. Unsorted lands only on songs
  // not yet called mine, Mine only on Mine; tapping any song still plays it
  // only what Library shows: the player's every tick (time) would redraw the whole list
  // Low priority too (useDeferredValue): a Next redraws Library after the sound has started, never in front of it
  const [playing, playingPool, playingSong] = useDeferredValue(usePlayerWith((now) => [now.order, now.pool, now.song, now.marks] as const));
  // the row that is playing (a version shows as its family's row)
  const playingRow = playingSong ? families.get(playingSong.id) ?? playingSong.id : null;
  const shuffleOn = !!playing?.shuffle;
  const poolOf = (pool: Pool) => playable.filter((song) => (song.mine === 'mine') === (pool === 'mine'));
  const tapShuffle = () => {
    // the player as it is right now (what's drawn may be a moment behind)
    const { order: playing, pool: playingPool, song: playingSong } = player.now();
    const pick = libraryShuffleTap({ on: !!playing?.shuffle, pool: playingPool }, poolOf('mine').length > 0, poolOf('unsorted').length > 0);
    if (!pick.on) return player.setShuffleOn(false);
    // playing from this list: only what comes next changes. From another list (a session, a Sort set): this list
    // takes over, the song carrying on from its second
    if (playingSong && playing && playable.some((song) => song.id === playingSong.id)) {
      if (playing.list.length === playable.length && playable.every((song) => playing.list.includes(song.id))) return player.setShuffleOn(true, pick.pool);
      return player.playList(url, playable, playingSong.id, true, pick.pool, player.positionNow());
    }
    // never starts on a Shelved song (unless that pool holds nothing else)
    const all = poolOf(pick.pool);
    const unshelved = pickable(all, ratingStore.isShelved);
    const from = unshelved.length ? unshelved : all;
    player.playList(url, playable, from[Math.floor(Math.random() * from.length)].id, true, pick.pool);
  };

  const cancelSelect = () => {
    setSelecting(false);
    setTicked([]);
  };

  const tick = (song: Song) =>
    setTicked((old) => (old.includes(song.id) ? old.filter((id) => id !== song.id) : [...old, song.id]));

  // hold a row: select mode, that row ticked first
  const hold = (song: Song) => {
    if (selecting) return tick(song);
    setSelecting(true);
    setTicked([song.id]);
  };

  // a "See all" on Home: this chip, in this order, from the top. Select mode and Hidden step aside first
  useEffect(() => {
    if (!ask) return;
    takeLibraryAsk();
    setSelecting(false);
    setTicked([]);
    setShowHidden(false);
    setPlays(playStore.all());
    setOnly(ask.chip);
    setSort(ask.sort);
    const timer = setTimeout(() => rows.current?.scrollToOffset({ offset: 0, animated: false }), 0);
    return () => clearTimeout(timer);
  }, [ask]);

  // the full player's "+ Version": select mode with the playing song (its family's row) ticked, scrolled to
  useEffect(() => {
    if (!seed || !songs) return;
    const id = families.get(seed) ?? seed;
    takeSeed();
    setSelecting(true);
    setTicked([id]);
    const at = base.findIndex((song) => song.id === id);
    if (at >= 0) setTimeout(() => rows.current?.scrollToIndex({ index: at, viewPosition: 0.3, animated: false }), 0);
  }, [seed, songs]);

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

  // a row's taps, the same two functions for every row and every draw, so a row redraws only when what it shows changes
  const taps = useRef({ tap: (_: Song) => {}, hold });
  taps.current = { tap: (song) => (selecting ? tick(song) : open(song, false)), hold };
  const tapRow = useCallback((song: Song) => taps.current.tap(song), []);
  const holdRow = useCallback((song: Song) => taps.current.hold(song), []);
  /** A row's second line: its date, how much is tagged, and where the file is. */
  const metaOf = (song: Song) => {
    const tagged = lines.get(song.id) ?? 0;
    const played = sort === 'plays' ? plays.get(song.id)?.n ?? 0 : 0;
    return [
      groupMain === song.id ? 'Main' : '',
      song.date,
      played ? (played === 1 ? '1 play' : `${number(played)} plays`) : '',
      tagged ? (tagged === 1 ? '1 line' : `${number(tagged)} lines`) : '',
      offline.has(song.id) ? 'On this phone' : WHERE[song.where],
    ].filter(Boolean).join(' · ');
  };
  // everything a row draws besides its song: rows redraw when one of these changes, and only then
  const rowsDependOn = useMemo(() => [ratings, lines, playingRow, selecting, ticked, groupMain, laptopOff, stored, sort === 'plays' ? plays : null], [ratings, lines, playingRow, selecting, ticked, groupMain, laptopOff, stored, sort, plays]);

  return (
    <View style={s.fill}>
    {showHidden ? <Hidden url={url} onBack={closeHidden} /> : null}
    <View style={[s.page, showHidden && s.hidden]}>
      <View style={s.header}>
        {/* a tab, so no Back: only select mode's Cancel */}
        {selecting ? (
          <Pressable style={(p) => [s.cancel, tint(p)]} onPress={cancelSelect}>
            <Text style={s.quiet}>Cancel</Text>
          </Pressable>
        ) : null}
        <Text style={s.title}>{selecting ? `${number(ticked.length)} ticked` : 'Library'}</Text>
        {selecting || !songs ? null : (
          <View style={s.headerRight}>
            {/* Shuffle grows to the left when it says its pool, so Tag songs never moves */}
            {playable.length ? (
              <Tap style={[s.shuffle, shuffleOn && s.shuffleOn]} filled={shuffleOn} radius={18} hitSlop={SHUFFLE_SLOP} onPress={tapShuffle} accessibilityLabel={shuffleOn ? `Shuffle on, ${shuffleWords({ on: true, pool: playingPool })}` : 'Shuffle off'}>
                <Icon name="shuffle" size={16} color={shuffleOn ? C.onAccent : C.text} />
                <Text style={[s.shuffleWord, shuffleOn && s.shuffleWordOn]}>{shuffleOn ? `Shuffle: ${shuffleWords({ on: true, pool: playingPool })}` : 'Shuffle'}</Text>
              </Tap>
            ) : null}
            {/* the tagging session: Mine songs that can play now, one card at a time */}
            <Pressable style={(p) => [s.tagSongs, tint(p)]} onPress={() => session.start(url)}>
              <Text style={s.quiet}>Tag songs</Text>
            </Pressable>
          </View>
        )}
      </View>
      {!selecting ? <SavedLine /> : null}
      {!selecting ? <RestoreNotice /> : null}
      <WaitingLine />
      <LaptopLine />
      {failed && songs ? (
        <Pressable onPress={() => setAttempt(attempt + 1)}>
          <Text style={s.offline}>Laptop not reachable: songs on this phone still play. Tap to try again.</Text>
        </Pressable>
      ) : null}
      {refused ? <Text style={s.refused}>The laptop refused {refused === 1 ? '1 change' : `${refused} changes`}, so {refused === 1 ? "it wasn't" : "they weren't"} saved</Text> : null}
      {failed && !songs ? (
        <View style={s.middle}>
          <Text style={s.line}>Laptop not reachable</Text>
          <Pressable style={(p) => [s.again, tint(p)]} onPress={() => setAttempt(attempt + 1)}>
            <Text style={s.againWord}>Try again</Text>
          </Pressable>
        </View>
      ) : !songs ? (
        <View style={s.middle}>
          <Text style={s.line}>Loading songs…</Text>
        </View>
      ) : (
        <>
          <ScrollView ref={chipRow} horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips}>
            {chips.map((one) => (
              <Pressable
                key={one}
                style={s.chipTap}
                onPress={() => toggle(one)}
                onLayout={(e) => {
                  chipAt.current[one] = e.nativeEvent.layout.x;
                  if (one === only && one !== 'all') chipRow.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - 56), animated: false });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: only === one }}
              >
                <View style={[s.chip, only === one && s.chipOn]}>
                  <Text style={[s.chipWord, only === one && s.chipWordOn]}>{CHIP_WORD[one]}</Text>
                </View>
              </Pressable>
            ))}
            {/* songs I called Not mine: a quiet word at the end, not a chip (it opens its own list) */}
            <Pressable style={(p) => [s.chipTap, s.hiddenTap, tint(p)]} onPress={() => setShowHidden(true)}>
              <Text style={s.quiet}>{hiddenCount === null ? 'Hidden' : `Hidden · ${number(hiddenCount)}`}</Text>
            </Pressable>
          </ScrollView>
          <View style={s.bar}>
            <Text style={s.count}>{`${number(base.length)} ${COUNT_WORD[only]}`}</Text>
            <Pressable style={(p) => [s.sort, tint(p)]} onPress={changeSort} accessibilityLabel={`Order: ${SORT_WORD[sort]}`}>
              <Text style={s.sortWord}>{SORT_WORD[sort]}</Text>
              <Icon name="down" size={12} color={C.dim} />
            </Pressable>
          </View>
          <FlatList
            ref={rows}
            key={`${sort}/${only}`}
            onScrollToIndexFailed={() => {}}
            data={base}
            extraData={rowsDependOn}
            keyExtractor={(song) => song.id}
            getItemLayout={(_, index) => rowLayout(index)}
            initialNumToRender={14}
            maxToRenderPerBatch={20}
            windowSize={15}
            ListEmptyComponent={<Text style={s.empty}>{CHIP_EMPTY[only]}</Text>}
            renderItem={({ item }) => (
              <SongRow
                song={item}
                meta={metaOf(item)}
                rating={ratings.get(item.id)}
                off={!canPlay(item)}
                disabled={!selecting && item.where !== 'laptop' && !offline.has(item.id)}
                playing={playingRow === item.id}
                ticked={selecting ? ticked.includes(item.id) : undefined}
                versions
                onPress={tapRow}
                onLongPress={holdRow}
              />
            )}
          />
          {selecting ? (
            <View style={s.selectBar}>
              <Pressable style={(p) => [s.groupButton, ticked.length < 2 && s.off, tint(p)]} disabled={ticked.length < 2} onPress={groupTicked}>
                <Text style={s.groupText}>Group as versions</Text>
              </Pressable>
              <Pressable style={(p) => [s.small, !ticked.length && s.off, tint(p)]} disabled={!ticked.length} onPress={() => judgeTicked('mine')}>
                <Text style={s.smallText}>Mine</Text>
              </Pressable>
              <Pressable style={(p) => [s.small, !ticked.length && s.off, tint(p)]} disabled={!ticked.length} onPress={() => judgeTicked('not mine')}>
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
  fill: { flex: 1, backgroundColor: C.bg },
  hidden: { display: 'none' },
  page: { flex: 1, backgroundColor: C.bg, paddingTop: 64, paddingHorizontal: S.side },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: S.tap, marginBottom: 8 },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { ...T.title },
  cancel: { height: S.tap, justifyContent: 'center', paddingRight: 8 },
  quiet: { color: C.dim, fontSize: 15 },
  tagSongs: { height: S.tap, justifyContent: 'center', paddingLeft: 10 },
  // a 36 pill inside a 44 touch
  shuffle: { height: 36, marginVertical: 4, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.raised, flexDirection: 'row', alignItems: 'center', gap: 6, overflow: 'hidden' },
  shuffleOn: { backgroundColor: C.accent },
  shuffleWord: { color: C.text, fontSize: 14, fontWeight: '600' },
  shuffleWordOn: { color: C.onAccent },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  line: { color: C.dim, fontSize: 17 },
  again: { height: S.tap, paddingHorizontal: 16, justifyContent: 'center' },
  againWord: { color: C.text, fontSize: 15, fontWeight: '600' },
  // the chips run to both screen edges, the first in line with everything else
  chipScroll: { flexGrow: 0, flexShrink: 0, height: S.tap, marginHorizontal: -S.side },
  chips: { paddingHorizontal: S.side, gap: 8, alignItems: 'center' },
  chipTap: { height: S.tap, justifyContent: 'center' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.raised, justifyContent: 'center' },
  // the chip that's on is white, not amber: amber is for what's playing
  chipOn: { backgroundColor: C.text },
  chipWord: { ...T.chip, color: C.dim, fontWeight: '600' },
  chipWordOn: { color: C.bg },
  hiddenTap: { paddingHorizontal: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: S.tap },
  count: { ...T.meta, fontVariant: ['tabular-nums'] },
  sort: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12 },
  sortWord: { color: C.text, fontSize: 14, fontWeight: '600' },
  refused: { color: C.danger, fontSize: 14, paddingBottom: 8 },
  empty: { color: C.dim, fontSize: 15, textAlign: 'center', paddingTop: 32 },
  selectBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  groupButton: { flex: 1, height: 48, backgroundColor: C.text, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  groupText: { color: C.bg, fontSize: 16, fontWeight: '700' },
  small: { height: 48, backgroundColor: C.raised, borderRadius: 24, paddingHorizontal: 16, justifyContent: 'center' },
  smallText: { color: C.text, fontSize: 15, fontWeight: '600' },
  off: { opacity: 0.4 },
  saved: { ...T.meta, paddingBottom: 6, fontVariant: ['tabular-nums'] },
  offline: { color: C.warnText, fontSize: 14, paddingBottom: 8 },
});
