// Home (overhaul wave 1, Wall): something to play within one tap. Search, Shuffle and Favorites, what I played
// lately, and songs I haven't played in a while. Wave 2 adds five rows under those: Recently added, Most played,
// Favorites, Needs tags, Versions to compare, each with a "See all" that opens Library on the matching chip or order.
// Sort and the tagging session are at the bottom under More: reachable in one tap, never in the way. The laptop's
// address and the build line moved to Settings (wave 4), behind the small gear beside the title. A row with nothing in it isn't drawn (a fresh install shows no blank headings).
// The rows' rules: playLog.ts (the first two) and libraryCore.ts (the five new ones).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Tile } from './Art';
import { Icon } from './Icon';
import { HOME_ROWS, homePage, homeRows, keepIfSame, linesByRow, taggedOnceKnown, type HomeRowKey } from './libraryCore';
import { openLibrary, openSearch, openSort } from './nav';
import { LaptopLine, RestoreNotice, WaitingLine } from './Notices';
import { loadSongList, offline, useOffline } from './offline';
import { useOutbox } from './outbox';
import { NOT_HERE, player, usePlayerPick } from './playerStore';
import { A_WHILE_DAYS, dayOf, notPlayedInAWhile, recentlyPlayed, rediscoverStart, ROW_SONGS, type PlayMap } from './playLog';
import { pickable, withPending } from './playOrder';
import { playStore } from './playStore';
import { ratingStore, useRatings } from './ratingStore';
import { session } from './sessionStore';
import { useAllTags, useTagsKnown } from './tagStore';
import { tint } from './Tagging';
import { Tap } from './Tap';
import { C, coveredBelow, R, S, T } from './theme';
import * as versions from './versionStore';
import { useVersions, type LibSong } from './versionStore';

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
  return (
    <Pressable style={{ width: size }} onPress={onPress} accessibilityLabel={label}>
      <Tile title={song.title} date={song.date} size={size} radius={R.cardTile} />
      <Text style={s.cardTitle} numberOfLines={1}>{song.title}</Text>
      <Text style={s.cardNote} numberOfLines={1}>{note || ' '}</Text>
    </Pressable>
  );
}

type RowProps = {
  title: string;
  songs: LibSong[];
  note: (song: LibSong) => string;
  onPlay: (song: LibSong) => void;
  /** "See all": the whole list in Library. The first two rows have none (they aren't a Library list). */
  seeAll?: () => void;
  /** The smaller card of the five lower rows, so seven rows aren't a wall of the same squares. */
  small?: boolean;
  /** What VoiceOver says a card does, before the title. */
  does?: string;
};

function Row({ title, songs, note, onPlay, seeAll, small, does = 'Play' }: RowProps) {
  if (!songs.length) return null;
  return (
    <>
      <View style={s.headRow}>
        <Text style={s.heading}>{title}</Text>
        {seeAll ? (
          <Pressable style={(p) => [s.seeAll, tint(p)]} onPress={seeAll} accessibilityLabel={`See all: ${title}`}>
            <Text style={s.seeAllWord}>See all</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rowScroll} contentContainerStyle={s.rowCards}>
        {songs.map((song) => <Card key={song.id} song={song} note={note(song)} size={small ? S.cardSmall : S.cardTile} label={`${does} ${song.title}`} onPress={() => onPlay(song)} />)}
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
  const versionsOf = (id: string) => (families.has(id) ? versions.members(id).length : 1);
  const more = useMemo(
    () => homeRows(playable.filter((song) => ratings.get(song.id) !== 'shelved'), {
      rating: (id) => ratings.get(id), grouped: (id) => families.has(id), tagged: taggedOnceKnown(tagsKnown, lines), plays, versions: versionsOf,
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
    versions: (song) => `${versionsOf(song.id)} versions`,
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
   * Archived song. `only`: just these (Favorites). */
  const shuffle = (only?: LibSong[]) => {
    const list = only ?? mine;
    const from = pickable(list, ratingStore.isShelved);
    const start = (from.length ? from : list)[Math.floor(Math.random() * (from.length || list.length))];
    if (!start) return player.showMessage(only ? 'No Favorites yet: tap Favorite in the player' : listed ? 'No Mine songs can play right now.' : 'Songs are still loading.');
    player.playList(url, only ? list : playable, start.id, true, 'mine');
  };
  const favorites = () => shuffle(mine.filter((song) => ratings.get(song.id) === 'fire'));

  const now = Date.now();
  const lastPlayed = (map: PlayMap) => (song: LibSong) => {
    const last = map.get(song.id)?.last ?? 0;
    return last ? ago(last, now) : year(song);
  };
  return (
    <ScrollView style={s.page} contentContainerStyle={[s.content, { paddingBottom: coveredBelow(true, !!playing) + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={s.titleRow}>
        <Text style={s.title}>The Vault</Text>
        {/* no gear until there's a laptop: first run shows the address box below instead */}
        {url ? (
          <Tap style={s.gear} radius={22} onPress={onSettings} accessibilityLabel="Settings">
            <Icon name="settings" size={22} color={C.dim} />
          </Tap>
        ) : null}
      </View>
      <RestoreNotice />
      <WaitingLine />
      <LaptopLine />
      {!url ? setup : (
        <>
          <Pressable style={s.search} onPress={() => openSearch('')} accessibilityRole="search" accessibilityLabel="Search">
            <Icon name="search" size={20} color={C.dim} />
            <Text style={s.searchWord}>Search</Text>
          </Pressable>
          <View style={s.pair}>
            <Tap filled style={[s.big, s.shuffle]} radius={24} onPress={() => shuffle()} accessibilityLabel="Shuffle my songs">
              <Icon name="shuffle" size={20} color={C.onAccent} />
              <Text style={s.shuffleWord}>Shuffle</Text>
            </Tap>
            <Tap style={[s.big, s.favorites]} radius={24} onPress={favorites} accessibilityLabel="Shuffle my Favorites">
              <Icon name="favoriteOn" size={18} color={C.text} />
              <Text style={s.favoritesWord}>Favorites</Text>
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
              // a group's card opens its versions (Compare is there); every other card plays
              does={row.key === 'versions' ? 'Versions of' : 'Play'}
              onPlay={(song) => (row.key === 'versions' ? versions.openVersions(song.id) : play(rows[row.key], song))}
              seeAll={() => openLibrary({ chip: row.chip, sort: row.sort })}
            />
          ))}
          <Text style={[s.heading, s.moreHeading]}>More</Text>
          <Tap style={s.more} onPress={openSort} accessibilityLabel="Sort songs">
            <Text style={s.moreWord}>Sort songs</Text>
            <Text style={s.moreNote}>Mine or not mine, one card at a time</Text>
          </Tap>
          <Tap style={s.more} onPress={() => session.start(url)} accessibilityLabel="Tag songs">
            <Text style={s.moreWord}>Tag songs</Text>
            <Text style={s.moreNote}>My songs one by one, to mark their lines</Text>
          </Tap>
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
  search: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: R.field, backgroundColor: C.raised },
  searchWord: { color: C.dim, fontSize: 17 },
  pair: { flexDirection: 'row', gap: 10, marginTop: 14 },
  big: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  shuffle: { backgroundColor: C.accent },
  shuffleWord: { color: C.onAccent, fontSize: 17, fontWeight: '700' },
  favorites: { backgroundColor: C.raised },
  favoritesWord: { color: C.text, fontSize: 17, fontWeight: '600' },
  // a heading keeps its place and height with or without See all
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: S.tap, marginTop: 18, marginBottom: 4 },
  heading: { ...T.heading },
  moreHeading: { marginTop: 28, marginBottom: 10 },
  seeAll: { height: S.tap, minWidth: 64, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 12 },
  seeAllWord: { color: C.dim, fontSize: 15 },
  // the row runs to both screen edges, its first card in line with everything else
  rowScroll: { marginHorizontal: -S.side, flexGrow: 0 },
  rowCards: { paddingHorizontal: S.side, gap: 12 },
  cardTitle: { color: C.text, fontSize: 14, marginTop: 6 },
  cardNote: { ...T.meta, marginTop: 1 },
  more: { minHeight: S.row, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  moreWord: { ...T.row },
  moreNote: { ...T.meta, marginTop: 2 },
});
