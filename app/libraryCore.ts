// What Library, the search screen and Home's rows show, as plain code a test can run (overhaul wave 2): which songs a
// chip keeps, the three sort orders, the rows' fixed height, Home's five new rows and where each one's "See all" lands.
// No React Native here.

export type Chip = 'all' | 'mine' | 'fire' | 'shelved' | 'untagged' | 'grouped' | 'unsorted';
export type SortBy = 'date' | 'title' | 'plays';
/** The chips Library always draws, in order. Unsorted joins them only while a song is still unsorted. */
export const CHIPS: readonly Chip[] = ['all', 'mine', 'fire', 'shelved', 'untagged', 'grouped'];
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

/** Home's five new rows. `songs`: the ones that may show (one row per family, not Archived, playable right now), so a
 * card never leads to a wait. Each row is the top of what its "See all" opens in Library, in the same order.
 * Recently added goes by the song's own date (the only date there is); a song with no date is left out. */
export function homeRows<S extends Listed>(songs: readonly S[], facts: HomeFacts, limit = HOME_ROW): Record<HomeRowKey, S[]> {
  const newest = sortSongs(songs, 'date');
  const size = (song: S) => facts.versions(song.id);
  return {
    added: newest.filter((song) => !!song.date).slice(0, limit),
    most: sortSongs(songs.filter((song) => (facts.plays.get(song.id)?.n ?? 0) >= MOST_PLAYED_FROM), 'plays', facts.plays).slice(0, limit),
    favorites: chipSongs(newest, 'fire', facts).slice(0, limit),
    untagged: chipSongs(newest, 'untagged', facts).slice(0, limit),
    // the biggest group first: the one with most to compare
    versions: newest.filter((song) => size(song) >= 2).sort((a, b) => size(b) - size(a)).slice(0, limit),
  };
}
