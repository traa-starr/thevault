// Home (overhaul wave 1, Wall): something to play within one tap. On top, one of my lines (yourLines.ts homeLine). Shuffle (hold it for Favorites or Unsorted), what I
// played lately, and songs I haven't played in a while. Under those: Recently added, Most played, Favorites, Needs tags,
// each heading a "See all" that opens Library on the matching chip or order. Hold a card for the song sheet.
// The "..." top right holds Sort, Tag songs and Settings (WORLD-MAP, O.6). A row with nothing in it isn't drawn (a fresh install shows no blank headings).
// The rows' rules: playLog.ts (the first two) and libraryCore.ts (the five new ones).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Tile } from './Art';
import { Icon } from './Icon';
import { HOME_ROWS, homePage, homeRows, keepIfSame, linesByRow, taggedOnceKnown, type HomeRowKey } from './libraryCore';
import { openLibrary, openLibrarySelect, openSort } from './nav';
import { laptopNeedsLook } from './laptopCore';
import { RestoreNotice, WaitingLine } from './Notices';
import { loadSongList, offline, useOffline } from './offline';
import { usePhoneBackup } from './phoneBackup';
import { useOutbox } from './outbox';
import { NOT_HERE, player, usePlayerPick } from './playerStore';
import { A_WHILE_DAYS, dayOf, notPlayedInAWhile, recentlyPlayed, rediscoverStart, ROW_SONGS, type PlayMap } from './playLog';
import { pickable, withPending } from './playOrder';
import { playStore } from './playStore';
import { ratingStore, useRatings } from './ratingStore';
import { session } from './sessionStore';
import { HOLD_MS, HOME_MENU, SHUFFLE_POOLS } from './songActions';
import { openMenu, openSongSheet, type MenuRow } from './SongSheet';
import { clock, useAllTags, useTagsKnown } from './tagStore';
import { pickHomeLine } from './yourLines';
import { tint } from './Tagging';
import { Tap } from './Tap';
import { C, coveredBelow, R, S, T } from './theme';
import { useVersions, type LibSong } from './versionStore';

/** What Shuffle says when a pool has nothing that can play. */
const EMPTY_POOL: Record<(typeof SHUFFLE_POOLS)[number], string> = {
  mine: 'No Mine songs can play right now.',
  favorites: 'No Favorites yet: tap Favorite in the player',
  unsorted: 'Nothing left unsorted',
};

const DAY_MS = 24 * 3600 * 1000;
/** "3 months ago", in the plainest words. */
export const ago = (last: number, now: number) => {
  const days = Math.floor((now - last) / DAY_MS);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < A_WHILE_DAYS) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years <= 1 ? '1 year ago' : `${years} years ago`;
};
const year = (song: LibSong) => (song.date ? song.date.slice(0, 4) : '');

function Card({ song, note, size, label, onPress }: { song: LibSong; note: string; size: number; label: string; onPress: () => void }) {
  // hold: the song sheet, the same one as everywhere; its Select opens Library's select mode on this song
  const hold = () => openSongSheet(song, 'home', { onSelect: () => openLibrarySelect(song.id) });
  return (
    <Pressable style={{ width: size }} onPress={onPress} onLongPress={hold} delayLongPress={HOLD_MS} accessibilityLabel={label}>
      <Tile title={song.title} date={song.date} size={size} radius={R.cardTile} />
      <Text style={s.cardTitle} numberOfLines={1}>{song.title}</Text>
      <Text style={s.cardNote} numberOfLines={1}>{note || ' '}</Text>
    </Pressable>
  );
}

/** Home opens on one of my lines, big (WORLD-MAP rule 2): tap = that song from that second. No lines yet: what to do. */
function LineCard({ line, title, onPress }: { line: { text: string; at_sec: number } | null; title: string; onPress: () => void }) {
  return (
    <Pressable
      style={(p) => [s.lineCard, tint(p)]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={line ? `Play ${title} from ${clock(line.at_sec)}: ${line.text}` : 'Tag your first line'}
    >
      {line ? (
        <>
          <Text style={s.lineWords} numberOfLines={3}>“{line.text}”</Text>
          <Text style={s.lineSong} numberOfLines={1}>{title ? `${title} · ${clock(line.at_sec)}` : clock(line.at_sec)}</Text>
        </>
      ) : (
        <>
          <Text style={s.lineWords}>Tag your first line</Text>
          <Text style={s.lineSong} numberOfLines={2}>Tag songs: mark a line while it plays, and it shows up here</Text>
        </>
      )}
    </Pressable>
  );
}

type RowProps = {
  title: string;
  songs: LibSong[];
  note: (song: LibSong) => string;
  onPlay: (song: LibSong) => void;
  /** "See all": the whole list in Library, by tapping the heading. The first two rows have none (they aren't a
   * Library list). */
  seeAll?: () => void;
  /** The smaller card of the four lower rows, so six rows aren't a wall of the same squares. */
  small?: boolean;
};

function Row({ title, songs, note, onPlay, seeAll, small }: RowProps) {
  if (!songs.length) return null;
  return (
    <>
      {/* the heading is the See all (WORLD-MAP Home 7): no separate grey link */}
      {seeAll ? (
        <Pressable style={(p) => [s.headRow, tint(p)]} onPress={seeAll} accessibilityRole="button" accessibilityLabel={`See all: ${title}`}>
          <Text style={s.heading}>{title}</Text>
          <Text style={s.chevron}>›</Text>
        </Pressable>
      ) : (
        <View style={s.headRow}>
          <Text style={s.heading}>{title}</Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rowScroll} contentContainerStyle={s.rowCards}>
        {songs.map((song) => <Card key={song.id} song={song} note={note(song)} size={small ? S.cardSmall : S.cardTile} label={`Play ${song.title}`} onPress={() => onPlay(song)} />)}
      </ScrollView>
    </>
  );
}

type Props = {
  /** The laptop's address as a link, or '' before it has been typed. */
  url: string;
  /** First open, no address yet: the box to type it in. Shown in place of everything playable. */
  setup: ReactNode;
  /** The gear beside the title: opens Settings. */
  onSettings: () => void;
  /** Home is the screen in front (its tab, and Sort not over it). */
  showing: boolean;
};

export default function Home({ url, setup, onSettings, showing }: Props) {
  const { songs: fresh, families } = useVersions();
  // until the laptop answers (10 s if it's off): the list saved on the phone, so Home is never empty while it waits
  const [saved] = useState(() => loadSongList<LibSong>()?.songs ?? null);
  const listed = fresh ?? saved;
  const { pending: waitingAll } = useOutbox();
  // my choices only (a play joining the outbox isn't one): Home's lists are rebuilt only when a choice changes
  const choiceKey = waitingAll.filter((change) => change.kind !== 'play_add').map((change) => change.id).join();
  const all = useMemo(() => (listed ? withPending(listed, waitingAll.filter((change) => change.kind !== 'play_add')) : []), [listed, choiceKey]);
  const ratings = useRatings();
  const { reachable, stored } = useOffline();
  // a small dot on the "..." while Settings' Laptop status row needs a look (server out of date, backup didn't save)
  const { outOfDate, saveFailed } = usePhoneBackup();
  const needsLook = !!laptopNeedsLook({ outOfDate, saveFailed, reachable });
  const { song: playing, sheet } = usePlayerPick('song', 'sheet');
  // The rows never change under my thumb: a song reaching 0:30 while I look at Home moves nothing. They catch up
  // each time Home comes back into view (a tab tap, the player closing, the song list arriving).
  const inView = showing && sheet === 'none';
  const [plays, setPlays] = useState(playStore.all);
  // the day the shuffled rows go by: it turns over when Home comes back into view, never while I look at it
  const [day, setDay] = useState(() => dayOf(Date.now()));
  useEffect(() => {
    if (!inView) return;
    setPlays(playStore.all());
    setDay(dayOf(Date.now()));
  }, [inView, fresh]);
  const laptopOff = reachable === false;
  const canPlay = (song: LibSong) => offline.has(song.id) || (!laptopOff && song.where === 'laptop');

  // one row per family (its Main), like Library
  const mains = useMemo(() => all.filter((song) => (families.get(song.id) ?? (fresh ? null : song.main) ?? song.id) === song.id), [all, families, fresh]);
  const playable = useMemo(() => mains.filter(canPlay), [mains, laptopOff, stored]);
  const mine = useMemo(() => playable.filter((song) => song.mine === 'mine'), [playable]);
  // one card per family, like every other list: a played version shows as its Main
  const recent = useMemo(() => {
    const byId = new Map(all.map((song) => [song.id, song]));
    const seen = new Set<string>();
    return recentlyPlayed(all, plays, 40)
      .map((song) => byId.get(families.get(song.id) ?? (fresh ? null : song.main) ?? song.id) ?? song)
      .filter((song) => !seen.has(song.id) && seen.add(song.id))
      .slice(0, ROW_SONGS);
  }, [all, plays, families, fresh]);
  // Mine, not Archived, playable now: never a song I'd have to wait for
  const forgotten = useMemo(() => notPlayedInAWhile(mine.filter((song) => ratings.get(song.id) !== 'shelved'), plays, Date.now()), [mine, ratings, plays, day]);

  // the five new rows: a family's Main, not Archived, playable now. Every card is in the list its See all opens
  const allTags = useAllTags();
  const tagsKnown = useTagsKnown();
  const linesWas = useRef<Map<string, number> | null>(null);
  const lines = useMemo(() => (linesWas.current = keepIfSame(linesWas.current, linesByRow(allTags, (id) => families.get(id) ?? id))), [allTags, families]);
  const more = useMemo(
    () => homeRows(playable.filter((song) => ratings.get(song.id) !== 'shelved'), {
      rating: (id) => ratings.get(id), grouped: (id) => families.has(id), tagged: taggedOnceKnown(tagsKnown, lines), plays,
    }),
    [playable, ratings, families, lines, plays, tagsKnown],
  );
  // the page: no song opens two rows (the top row wins), and the rows with no order of their own change by day
  const rows = useMemo(() => homePage({ recent, forgotten, ...more }, day), [recent, forgotten, more, day]);
  const moreNote: Record<HomeRowKey, (song: LibSong) => string> = {
    added: (song) => song.date ?? '',
    most: (song) => `${(plays.get(song.id)?.n ?? 0).toLocaleString('en-US')} plays`,
    favorites: year,
    untagged: year,
  };

  /** A card: that song now, the rest of its row after it. Like a Library row: it plays whatever else is going on;
   * only a start point is dropped while Compare or Sort has the sound (as a search result's start is). */
  const play = (row: LibSong[], song: LibSong, at?: number) => {
    if (!canPlay(song)) return player.showMessage(NOT_HERE);
    const now = player.now();
    player.playList(url, row.filter(canPlay), song.id, false, song.mine === 'mine' ? 'mine' : 'unsorted', now.comparing || now.sorting ? undefined : at);
    player.open('player');
  };
  /** Shuffle: a Mine song starts, the mini player shows it, and every Mine song is up next. Never starts on an
   * Archived song. Hold it for the pools (SHUFFLE_POOLS): Mine, Favorites (just those), Unsorted (songs not called
   * mine yet, like Library's Shuffle: Unsorted). */
  const shuffle = (pool: (typeof SHUFFLE_POOLS)[number] = 'mine') => {
    const unsorted = pool === 'unsorted' ? playable.filter((song) => song.mine !== 'mine' && !song.sorted) : [];
    const list = pool === 'favorites' ? mine.filter((song) => ratings.get(song.id) === 'fire') : pool === 'unsorted' ? unsorted : mine;
    const from = pickable(list, ratingStore.isShelved);
    const start = (from.length ? from : list)[Math.floor(Math.random() * (from.length || list.length))];
    if (!start) return player.showMessage(!listed ? 'Songs are still loading.' : EMPTY_POOL[pool]);
    player.playList(url, pool === 'favorites' ? list : playable, start.id, true, pool === 'unsorted' ? 'unsorted' : 'mine');
  };
  const POOL_WORD: Record<(typeof SHUFFLE_POOLS)[number], string> = { mine: 'Mine', favorites: 'Favorites', unsorted: 'Unsorted' };
  const pools = () => openMenu(SHUFFLE_POOLS.map((pool) => ({ key: pool, label: POOL_WORD[pool], onPress: () => shuffle(pool) })), 'Shuffle');
  // the "..." top right (HOME_MENU): Sort with what's left, Tag songs, Settings. Only once a laptop is set
  const unsortedLeft = useMemo(() => all.filter((song) => song.mine !== 'mine' && !song.sorted).length, [all]);
  const MENU: Record<(typeof HOME_MENU)[number], MenuRow> = {
    sort: { key: 'sort', label: unsortedLeft ? `Sort · ${unsortedLeft.toLocaleString('en-US')} left` : 'Sort songs', note: 'Mine or not mine, one card at a time', onPress: openSort },
    tag_songs: { key: 'tag_songs', label: 'Tag songs', note: 'My songs one by one, to mark their lines', onPress: () => session.start(url) },
    settings: { key: 'settings', label: 'Settings', onPress: onSettings },
  };
  const homeMenu = () => openMenu(HOME_MENU.map((key) => MENU[key]));

  // the line card: a new line each time Home comes back into view, never a jump while I look at it
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const wasInView = useRef(inView);
  useEffect(() => {
    if (inView && !wasInView.current) setSeed((n) => n + 1);
    wasInView.current = inView;
  }, [inView]);
  // a line on a song that can play now and isn't Archived, held while I look (yourLines.ts pickHomeLine); with none
  // playable (laptop off) a listed song's line, whose tap says why. Nothing before the list: no swap when it lands.
  const heldLine = useRef<ReturnType<typeof pickHomeLine>>(null);
  const picked = useMemo(() => {
    if (!listed) return null;
    const ok = new Set(all.filter((song) => canPlay(song) && ratings.get(song.id) !== 'shelved').map((song) => song.id));
    const listedIds = new Set(all.map((song) => song.id));
    const line = pickHomeLine(allTags, seed, (id) => ok.has(id), heldLine.current) ?? pickHomeLine(allTags, seed, (id) => listedIds.has(id), heldLine.current);
    return (heldLine.current = line);
  }, [allTags, all, listed, seed, laptopOff, stored, ratings]);
  const lineSong = picked ? all.find((song) => song.id === picked.song_id) ?? null : null;
  const playLine = () => {
    if (!picked) return session.start(url);
    if (!lineSong) return player.showMessage('Songs are still loading.');
    // that song from that second, then the rest of Mine after it, like a Library tap
    play(mine.some((song) => song.id === lineSong.id) ? mine : [lineSong, ...mine], lineSong, picked.at_sec);
  };

  const now = Date.now();
  const lastPlayed = (map: PlayMap) => (song: LibSong) => {
    const last = map.get(song.id)?.last ?? 0;
    return last ? ago(last, now) : year(song);
  };
  return (
    <ScrollView style={s.page} contentContainerStyle={[s.content, { paddingBottom: coveredBelow(true, !!playing) + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={s.titleRow}>
        <Text style={s.title}>The Vault</Text>
        {/* no "..." until there's a laptop: first run shows the address box below instead */}
        {url ? (
          <Tap style={s.gear} radius={22} onPress={homeMenu} accessibilityLabel={needsLook ? 'More: Sort, Tag songs, Settings (the laptop needs a look)' : 'More: Sort, Tag songs, Settings'}>
            <Icon name="more" size={22} color={C.text} />
            {needsLook ? <View style={s.lookDot} pointerEvents="none" /> : null}
          </Tap>
        ) : null}
      </View>
      <RestoreNotice />
      <WaitingLine />
      {!url ? setup : (
        <>
          {/* waits for the laptop's tags on a fresh install, so "Tag your first line" never shows over lines still on their way */}
          {/* until then a blank card the same size holds its place, so Shuffle never jumps down when it lands */}
          {picked || (listed && tagsKnown) ? <LineCard line={picked} title={lineSong?.title ?? ''} onPress={playLine} /> : <View style={s.lineCard} accessible={false} />}
          {/* Search is the round button by the tabs; Favorites is a hold on Shuffle (WORLD-MAP Home 2, 4) */}
          <View style={s.pair}>
            <Tap filled style={[s.big, s.shuffle]} radius={24} onPress={() => shuffle()} onLongPress={pools} delayLongPress={HOLD_MS} accessibilityLabel="Shuffle my songs" accessibilityHint="Hold for Favorites or Unsorted">
              <Icon name="shuffle" size={20} color={C.onAccent} />
              <Text style={s.shuffleWord}>Shuffle</Text>
            </Tap>
          </View>
          <Row title="Recently played" songs={rows.recent} note={lastPlayed(plays)} onPlay={(song) => play(rows.recent, song)} />
          <Row
            title="Not played in a while"
            songs={rows.forgotten}
            note={(song) => [year(song), plays.get(song.id)?.last ? ago(plays.get(song.id)!.last, now) : ''].filter(Boolean).join(' · ')}
            onPlay={(song) => play(rows.forgotten, song, rediscoverStart(song.length) || undefined)}
          />
          {HOME_ROWS.map((row) => (
            <Row
              key={row.key}
              small
              title={row.title}
              songs={rows[row.key]}
              note={moreNote[row.key]}
              onPlay={(song) => play(rows[row.key], song)}
              seeAll={() => openLibrary({ chip: row.chip, sort: row.sort })}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 64, paddingHorizontal: S.side },
  // the row is exactly as high as the title was, so nothing under it moved when the gear arrived
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 34, marginBottom: 16 },
  title: { ...T.title },
  gear: { width: S.tap, height: S.tap, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  // drawn over the icon's corner, so the "..." never moves when it comes and goes
  lookDot: { position: 'absolute', top: 9, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: C.warnText },
  lineCard: { backgroundColor: C.raised, borderRadius: R.cardTile, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 14, minHeight: 96, justifyContent: 'center' },
  lineWords: { color: C.text, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  lineSong: { ...T.meta, marginTop: 8 },
  pair: { flexDirection: 'row', gap: 10 },
  big: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  shuffle: { backgroundColor: C.accent },
  shuffleWord: { color: C.onAccent, fontSize: 17, fontWeight: '700' },
  // a heading keeps its place and height whether or not it opens its list
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, height: S.tap, marginTop: 18, marginBottom: 4, alignSelf: 'flex-start' },
  heading: { ...T.heading },
  chevron: { color: C.dim, fontSize: 22, fontWeight: '600', marginTop: -2 },
  // the row runs to both screen edges, its first card in line with everything else
  rowScroll: { marginHorizontal: -S.side, flexGrow: 0 },
  rowCards: { paddingHorizontal: S.side, gap: 12 },
  cardTitle: { color: C.text, fontSize: 14, marginTop: 6 },
  cardNote: { ...T.meta, marginTop: 1 },
});
