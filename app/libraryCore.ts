// What Library, the search screen and Home's rows show, as plain code a test can run (overhaul wave 2): which songs a
// chip keeps, the three sort orders, the rows' fixed height, Home's five new rows and where each one's "See all" lands.
// No React Native here.

export type Chip = 'all' | 'mine' | 'fire' | 'shelved' | 'untagged' | 'grouped' | 'unsorted';
export type SortBy = 'date' | 'title' | 'plays';
/** The chips Library always draws, in order (calm part 1, 2026-11-12: most used first, Archived last). */
export const CHIPS: readonly Chip[] = ['all', 'fire', 'untagged', 'grouped', 'shelved'];
/** The chip row: while a song is still unsorted, Unsorted and Mine join after All (with nothing unsorted, All and Mine
 * are the same list). The chip that's on always stays, so a "See all" or a last sort never leaves it without its chip. */
export function chipsFor(anyUnsorted: boolean, on: Chip): Chip[] {
  const extra: Chip[] = anyUnsorted ? ['unsorted', 'mine'] : (['unsorted', 'mine'] as Chip[]).filter((one) => one === on);
  return [CHIPS[0], ...extra, ...CHIPS.slice(1)];
}
export const SORTS: readonly SortBy[] = ['date', 'title', 'plays'];
export const nextSort = (sort: SortBy): SortBy => SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length];

/** Every Library row is this high, whatever its title: the list knows where each row is without measuring it. */
export const ROW_HEIGHT = 60;
export const rowLayout = (index: number) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index });
/** The rows a screen this tall shows at this scroll offset: first and last row numbers (for the scroll test). */
export const rowsInView = (offset: number, height: number, count: number) => {
  const first = Math.min(Math.max(Math.floor(offset / ROW_HEIGHT), 0), Math.max(count - 1, 0));
  const last = Math.min(Math.max(Math.ceil((offset + height) / ROW_HEIGHT) - 1, first), Math.max(count - 1, 0));
  return { first, last };
};

type Dated = { id: string; title: string; date?: string | null };
type Listed = Dated & { mine: string; sorted?: boolean };
type Played = { n: number; last: number };

const byTitle = (a: Dated, b: Dated) => a.title.localeCompare(b.title) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/** Newest first, no date last. A year-only date sorts just after the full dates of that year. Same date: A to Z. */
const byNewest = (a: Dated, b: Dated) => ((a.date ?? '') < (b.date ?? '') ? 1 : (a.date ?? '') > (b.date ?? '') ? -1 : byTitle(a, b));

/** A list in one of Library's orders. Most played: most plays first, then heard latest, then A to Z; songs never
 * played come after, newest first. */
export function sortSongs<S extends Dated>(songs: readonly S[], sort: SortBy, plays?: ReadonlyMap<string, Played>): S[] {
  const out = [...songs];
  if (sort === 'title') return out.sort(byTitle);
  if (sort === 'date' || !plays) return out.sort(byNewest);
  const n = (song: S) => plays.get(song.id)?.n ?? 0;
  const last = (song: S) => plays.get(song.id)?.last ?? 0;
  return out.sort((a, b) => n(b) - n(a) || last(b) - last(a) || (n(a) ? byTitle(a, b) : byNewest(a, b)));
}

export type ChipFacts = {
  /** My rating of a song: 'fire' (Favorite), 'shelved' (Archived), or none. */
  rating: (id: string) => string | null | undefined;
  /** The song is in a version group. */
  grouped: (id: string) => boolean;
  /** The song, or one of its versions, has a tagged line. */
  tagged: (id: string) => boolean;
};

/** The songs a chip keeps, in the order given. Needs tags: Mine, and no line tagged on it or any of its versions. */
export function chipSongs<S extends Listed>(songs: readonly S[], chip: Chip, facts: ChipFacts): S[] {
  if (chip === 'mine') return songs.filter((song) => song.mine === 'mine');
  if (chip === 'fire') return songs.filter((song) => facts.rating(song.id) === 'fire');
  if (chip === 'shelved') return songs.filter((song) => facts.rating(song.id) === 'shelved');
  if (chip === 'untagged') return songs.filter((song) => song.mine === 'mine' && !facts.tagged(song.id));
  if (chip === 'grouped') return songs.filter((song) => facts.grouped(song.id));
  if (chip === 'unsorted') return songs.filter((song) => song.mine !== 'mine' && !song.sorted);
  return [...songs];
}

/** Which rows (a family's Main) have a tagged line, counting lines on any version. `rowOf`: a song's row. */
export function linesByRow(tags: readonly { song_id: string }[], rowOf: (id: string) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const tag of tags) {
    const row = rowOf(tag.song_id);
    out.set(row, (out.get(row) ?? 0) + 1);
  }
  return out;
}
/** The same Map as last time if nothing in it changed, so a list drawn from it doesn't redraw for nothing. */
export function keepIfSame<K, V>(was: Map<K, V> | null, now: Map<K, V>): Map<K, V> {
  if (!was || was.size !== now.size) return now;
  for (const [key, value] of now) if (was.get(key) !== value) return now;
  return was;
}

/** A search result's row, by the file of the song a tap would play (a line on a version plays that version, not its
 * Main). `off`: can't play right now (dimmed). `disabled`: can't be tapped at all (cloud only or missing, and not on
 * this phone). `where`: where the laptop has the file ('laptop', 'cloud', 'gone'); unknown counts as on the laptop. */
export const resultState = (where: string | null | undefined, onPhone: boolean, laptopOff: boolean) => ({
  off: !onPhone && (laptopOff || (where ?? 'laptop') !== 'laptop'),
  disabled: !onPhone && (where ?? 'laptop') !== 'laptop',
});

// ---------- Home's new rows (NEXT 2026-11-10 C) ------------------------------------------------------------------------
export const HOME_ROW = 12;
/** A song counts as "most played" from this many plays: one play is only "recently played". */
export const MOST_PLAYED_FROM = 2;

export type HomeRowKey = 'added' | 'most' | 'favorites' | 'untagged' | 'versions';
export const HOME_ROWS: readonly { key: HomeRowKey; title: string; chip: Chip; sort: SortBy }[] = [
  { key: 'added', title: 'Recently added', chip: 'all', sort: 'date' },
  { key: 'most', title: 'Most played', chip: 'all', sort: 'plays' },
  { key: 'favorites', title: 'Favorites', chip: 'fire', sort: 'date' },
  { key: 'untagged', title: 'Needs tags', chip: 'untagged', sort: 'date' },
  { key: 'versions', title: 'Versions to compare', chip: 'grouped', sort: 'date' },
];

export type HomeFacts = ChipFacts & {
  plays: ReadonlyMap<string, Played>;
  /** How many versions a song's group holds (1: no group). */
  versions: (id: string) => number;
};

/** Every song that could sit in each of Home's five new rows, before the page is laid out (`homePage` picks the
 * cards). `songs`: the ones that may show (one row per family, not Archived, playable right now), so a card never
 * leads to a wait. Every card is in the list its "See all" opens in Library.
 * Recently added goes by the song's own date (the only date there is); a song with no date is left out. */
export function homeRows<S extends Listed>(songs: readonly S[], facts: HomeFacts): Record<HomeRowKey, S[]> {
  const newest = sortSongs(songs, 'date');
  return {
    added: newest.filter((song) => !!song.date),
    most: sortSongs(songs.filter((song) => (facts.plays.get(song.id)?.n ?? 0) >= MOST_PLAYED_FROM), 'plays', facts.plays),
    favorites: chipSongs(newest, 'fire', facts),
    untagged: chipSongs(newest, 'untagged', facts),
    versions: newest.filter((song) => facts.versions(song.id) >= 2),
  };
}

/** Before the phone has ever had the laptop's tags (a fresh install, first open) nothing is known to need tags: every
 * Mine song would count as untagged and the row would lie (review 2026-11-10, catch 3). */
export const taggedOnceKnown = (known: boolean, lines: ReadonlyMap<string, number>) => (id: string) => !known || lines.has(id);

// ---------- Home's rows open on different songs (owner, 2026-11-11) -----------------------------------------------------
/** How many cards of a row show before I scroll it: a song sits among these in one row only. */
export const HOME_FRONT = 5;
export type HomePageKey = 'recent' | 'forgotten' | HomeRowKey;
/** Home's rows from the top. Ordered: the order means something (when I heard it, its date, its plays) and is kept.
 * The others have no order of their own and are shuffled once a day. */
export const HOME_PAGE: readonly { key: HomePageKey; ordered: boolean }[] = [
  { key: 'recent', ordered: true },
  { key: 'forgotten', ordered: false },
  { key: 'added', ordered: true },
  { key: 'most', ordered: true },
  { key: 'favorites', ordered: false },
  { key: 'untagged', ordered: false },
  { key: 'versions', ordered: false },
];

const mix = (text: string) => {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
/** The same order all day, another one tomorrow, and a different one for each row. */
export function dailyShuffle<S extends { id: string }>(songs: readonly S[], day: string, row: string): S[] {
  return songs
    .map((song) => ({ song, key: mix(`${day}/${row}/${song.id}`) }))
    .sort((a, b) => a.key - b.key || (a.song.id < b.song.id ? -1 : 1))
    .map((one) => one.song);
}

/** The cards of every Home row. Going down the page, a song already among the first 5 cards of a row above is "up
 * front". An ordered row leaves those songs out and keeps its order; a shuffled row puts them after its other songs.
 * So no song opens two rows, unless a row has nothing else to show (then it shows what it has, not a blank).
 * `day`: the local day (YYYY-MM-DD); the page is the same all day. */
export function homePage<S extends { id: string }>(lists: Partial<Record<HomePageKey, readonly S[]>>, day: string, limit = HOME_ROW, front = HOME_FRONT): Record<HomePageKey, S[]> {
  const upFront = new Set<string>();
  const out = {} as Record<HomePageKey, S[]>;
  for (const { key, ordered } of HOME_PAGE) {
    const all = ordered ? [...(lists[key] ?? [])] : dailyShuffle(lists[key] ?? [], day, key);
    const others = all.filter((song) => !upFront.has(song.id));
    const cards = (!others.length ? all : ordered ? others : [...others, ...all.filter((song) => upFront.has(song.id))]).slice(0, limit);
    cards.slice(0, front).forEach((song) => upFront.add(song.id));
    out[key] = cards;
  }
  return out;
}
