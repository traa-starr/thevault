// The search screen (overhaul wave 2, Wall): the round search button, Home's Search box and the lock-screen link all
// land here, the box in focus with the keyboard up. Results come as I type: the lines I tagged (matched words bold,
// the second on the right) and titles. Tap one and it plays, from the line's second. With the box empty: the last
// searches that led to a tap.
// The search itself is the one Library had (search.ts), over every listed song, on the phone's own
// copy of the tags, so it works with the laptop off. It stays drawn like Home and Library (hidden when I'm elsewhere).
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Tile } from './Art';
import { Icon } from './Icon';
import { useKeyboardHeight } from './keyboard';
import { sortSongs } from './libraryCore';
import { closeSearch, takeSearchAsk, useSearchAsk } from './nav';
import { loadSongList, offline, useOffline } from './offline';
import { useOutbox } from './outbox';
import { NOT_HERE, player, usePlayerPick } from './playerStore';
import { withPending, type ShownTag } from './playOrder';
import { useRatings } from './ratingStore';
import { recents, useRecents } from './recentSearches';
import { findSongs, pieces, type SongHit } from './search';
import { RatingMark, SongRow } from './SongRow';
import { clock, useAllTags } from './tagStore';
import { tint } from './Tagging';
import { C, coveredBelow, R, S, T } from './theme';
import { timing } from './timings';
import * as versions from './versionStore';
import { useVersions, type LibSong } from './versionStore';

type Song = LibSong;
const WHERE: Record<string, string> = { laptop: 'On the laptop', cloud: 'Cloud only', gone: 'File missing' };
const detail = (song: Song) => [song.date, offline.has(song.id) ? 'On this phone' : WHERE[song.where]].filter(Boolean).join(' · ');

/** A result whose tagged line matched: the line (its matching words bold) over the song's title, the second on the
 * right. Up to two lines of the tag show; the row grows for the second. */
function LineRow({ song, hit, stems, typed, rating, off, disabled, onPress }: {
  song: Song; hit: SongHit<ShownTag>; stems: string[]; typed: string; rating: string | null | undefined; off: boolean; disabled: boolean; onPress: () => void;
}) {
  return (
    <Pressable style={(p) => [s.lineRow, tint(p)]} disabled={disabled} onPress={onPress}>
      <View style={off ? s.off : undefined}>
        <Tile title={song.title} date={song.date} size={S.rowTile} radius={R.rowTile} plain />
      </View>
      <View style={s.words}>
        <Text style={[s.line, off && s.off]} numberOfLines={2}>
          {pieces(hit.tag.text, stems, typed).map((piece, i) => (
            <Text key={i} style={piece.hit ? s.hitWord : undefined}>{piece.text}</Text>
          ))}
        </Text>
        <Text style={s.meta} numberOfLines={1}>{song.title}{hit.more ? `  +${hit.more}` : ''}</Text>
      </View>
      <RatingMark rating={rating} />
      <Text style={s.time}>{clock(hit.tag.at_sec)}</Text>
    </Pressable>
  );
}

export default function SearchScreen({ url, showing }: { url: string; showing: boolean }) {
  const [text, setText] = useState('');
  const box = useRef<React.ComponentRef<typeof TextInput>>(null);
  const ask = useSearchAsk();
  const recent = useRecents();
  const keyboard = useKeyboardHeight();
  const { song: playingSong } = usePlayerPick('song');

  // the songs: the laptop's list once it's in, the list saved on the phone until then (or with the laptop off)
  const { songs: fresh, families } = useVersions();
  const [saved] = useState(() => loadSongList<Song>()?.songs ?? null);
  const listed = fresh ?? saved;
  const { pending: waitingAll } = useOutbox();
  const choiceKey = waitingAll.filter((change) => change.kind !== 'play_add').map((change) => change.id).join();
  // one row per family (its Main), newest first: what Library's All shows
  const base = useMemo(() => {
    if (!listed) return null;
    const all = withPending(listed, waitingAll.filter((change) => change.kind !== 'play_add'));
    return sortSongs(all.filter((song) => (families.get(song.id) ?? (fresh ? null : song.main) ?? song.id) === song.id), 'date');
  }, [listed, choiceKey, families, fresh]);
  const ratings = useRatings();

  // The latest keystroke wins: typing never waits for a search (the results are a step behind, the box never is).
  const allTags = useAllTags();
  const query = useDeferredValue(text);
  const searching = query.trim().length > 0;
  const found = useMemo(
    () => (searching && base ? findSongs(base, allTags, (id) => families.get(id) ?? id, query) : null),
    [searching, query, base, allTags, families],
  );
  // the phone's own search time, sent to the laptop with the other timings (numbers only)
  useEffect(() => {
    if (found) timing.search(found.ms, found.tags);
  }, [found]);

  const { reachable, stored } = useOffline();
  const laptopOff = reachable === false;
  const canPlay = (song: Song) => offline.has(song.id) || (!laptopOff && song.where === 'laptop');
  // what plays after a result: every song that can play, newest first (Library's list as it opens)
  const playable = useMemo(() => (base ?? []).filter(canPlay), [base, laptopOff, stored]);

  /** A result tapped: the song the row shows (the row carries it, so results still changing can't swap it), from its
   * line's second. A version's line plays that version, in its Main's place in the list. */
  const play = (row: Song, hit: SongHit<ShownTag> | undefined, words: string) => {
    Keyboard.dismiss();
    const id = hit ? hit.tag.song_id : row.id;
    const now = player.now();
    if (hit && (now.comparing || now.sorting)) return; // Compare or Sort has the sound
    if (id === row.id ? !canPlay(row) : !offline.has(id) && laptopOff) return player.showMessage(NOT_HERE);
    recents.add(words);
    if (id === row.id) {
      player.playList(url, playable, row.id, false, 'unsorted', hit?.tag.at_sec);
    } else {
      const version = { id, title: versions.songTitle(id), mine: 'mine', sorted: true };
      const list = playable.flatMap((song) => (song.id === row.id ? [version] : [song]));
      player.playList(url, list.some((song) => song.id === id) ? list : [...list, version], id, false, 'unsorted', hit!.tag.at_sec, 'search');
    }
    player.open('player');
  };

  // asked for (the button, Home's box, a link): the box in focus, filled if the ask brought words
  useEffect(() => {
    if (!ask) return;
    takeSearchAsk();
    if (ask.q) setText(ask.q);
    const timer = setTimeout(() => box.current?.focus(), 50); // once the screen is showing
    return () => clearTimeout(timer);
  }, [ask]);
  // left by Cancel or a tab: the next visit starts with an empty box. Coming back from the player isn't leaving.
  useEffect(() => {
    if (showing) return;
    setText('');
    box.current?.blur();
  }, [showing]);

  const below = keyboard ? keyboard + 8 : coveredBelow(true, !!playingSong) + 8;
  return (
    <View style={s.page}>
      <View style={s.top}>
        <View style={s.field}>
          <Icon name="search" size={20} color={C.dim} />
          <TextInput
            ref={box}
            style={s.input}
            value={text}
            onChangeText={setText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            keyboardAppearance="dark"
            maxLength={200}
            placeholder="Search lines and titles"
            placeholderTextColor={C.faint}
            clearButtonMode="while-editing"
            accessibilityLabel="Search"
          />
        </View>
        <Pressable style={(p) => [s.cancel, tint(p)]} onPress={() => (Keyboard.dismiss(), closeSearch())}>
          <Text style={s.cancelWord}>Cancel</Text>
        </Pressable>
      </View>
      {!base ? (
        <Text style={s.empty}>Loading songs…</Text>
      ) : !found ? (
        <View style={s.recent}>
          {recent.length ? (
            <>
              <View style={s.recentTop}>
                <Text style={s.heading}>Recent</Text>
                <Pressable style={(p) => [s.clear, tint(p)]} onPress={recents.clear} accessibilityLabel="Clear recent searches">
                  <Text style={s.clearWord}>Clear</Text>
                </Pressable>
              </View>
              {recent.map((words) => (
                <Pressable key={words} style={(p) => [s.recentRow, tint(p)]} onPress={() => setText(words)}>
                  <Icon name="search" size={16} color={C.faint} />
                  <Text style={s.recentWords} numberOfLines={1}>{words}</Text>
                </Pressable>
              ))}
            </>
          ) : (
            <Text style={s.empty}>No recent searches</Text>
          )}
          <Text style={s.hint}>Finds the lines you tagged, then titles. Works with the laptop off.</Text>
        </View>
      ) : (
        <FlatList
          data={found.list}
          extraData={found}
          keyExtractor={(song) => song.id}
          style={{ marginBottom: keyboard }}
          contentContainerStyle={{ paddingBottom: keyboard ? 8 : below }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={s.empty}>{found.stems.length ? `No song or line has “${query.trim().slice(0, 40)}”` : 'Type a word to search'}</Text>}
          ListFooterComponent={found.more ? <Text style={s.empty}>{found.more.toLocaleString('en-US')} more songs match: type more words to narrow</Text> : undefined}
          renderItem={({ item }) => {
            const hit = found.hitOf.get(item.id);
            const disabled = item.where !== 'laptop' && !offline.has(item.id);
            return hit ? (
              <LineRow song={item} hit={hit} stems={found.stems} typed={found.typed} rating={ratings.get(item.id)} off={!canPlay(item)} disabled={disabled} onPress={() => play(item, hit, query)} />
            ) : (
              <SongRow song={item} meta={detail(item)} rating={ratings.get(item.id)} off={!canPlay(item)} disabled={disabled} playing={playingSong?.id === item.id} onPress={(song) => play(song, undefined, query)} />
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg, paddingTop: 64, paddingHorizontal: S.side },
  top: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  field: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: R.field, backgroundColor: C.raised },
  input: { flex: 1, minWidth: 0, height: 48, color: C.text, fontSize: 17, padding: 0 },
  cancel: { height: S.tap, minWidth: 64, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  cancelWord: { color: C.dim, fontSize: 15 },
  recent: { flex: 1 },
  recentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  heading: { ...T.heading },
  clear: { height: S.tap, minWidth: 64, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 4 },
  clearWord: { color: C.dim, fontSize: 15 },
  recentRow: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentWords: { ...T.row, flex: 1 },
  hint: { ...T.meta, marginTop: 16 },
  empty: { color: C.dim, fontSize: 15, textAlign: 'center', paddingTop: 32, paddingBottom: 8 },
  lineRow: { minHeight: 60, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  words: { flex: 1, minWidth: 0 },
  line: { color: C.dim, fontSize: 17, lineHeight: 22 },
  hitWord: { color: C.text, fontWeight: '700' },
  meta: { ...T.meta, marginTop: 2 },
  time: { ...T.meta, fontVariant: ['tabular-nums'] },
  off: { opacity: 0.4 },
});
