// Search (ROADMAP 3.1-3.3, 3.6), on the phone (DECISIONS 2026-11-08, option A): the spike's ladder (spike/search/rank.mjs)
// as plain code with no imports, so the phone, the tests and the laptop's acceptance runner all run this same file.
// It reads the phone's own tag copy (with unsent tags on top), so it works offline with the laptop asleep.
//
// The ladder, best first (3.1). It never excludes: any tag sharing one word with the search is a result.
//   4 exact phrase        "has to go"  in  "it has to go now"
//   3 words in order      "has go"     in  "it has to go now"        (gaps allowed)
//   2 all words           "go has"     in  "it has to go now"        (any order)
//   1 some words          ranked by how rare the matched words are
// Common words are down-weighted, never banned (3.2): "has to" still finds "has to". Slang endings fold together (3.3):
// drip / drips / dripped / drippin / drippin' / dripping all count as one word.
// Results come one row per song (board 2026-11-08): the song's best tag ranks it and is the one shown and played.

export type SearchTag = { id: string; song_id: string; text: string; at_sec: number };
type Item<T extends SearchTag> = { tag: T; stems: string[] };
export type Index<T extends SearchTag = SearchTag> = { items: Item<T>[]; holders: Map<string, number[]>; n: number };
export type TagHit<T extends SearchTag = SearchTag> = { tag: T; tier: number; score: number; len: number };
export type SongHit<T extends SearchTag = SearchTag> = TagHit<T> & { songId: string; more: number };

/** A search line longer than this is cut (a pasted verse can't stall typing). */
export const MAX_QUERY_CHARS = 200;
/** At most this many different words count from one search. */
export const MAX_QUERY_WORDS = 12;
export const SONGS_SHOWN = 50;

/** Lowercase words, apostrophes dropped (drippin' = drippin), anything else not a letter or digit splits words. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // café = cafe
    .replace(/['’`]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

const VOWEL = /[aeiouy]/;

/** One stem per word, so slang endings meet: drippin, dripping, dripped, drips, drip -> drip. Applied the same way to
 * tags and searches, so a stem only has to be consistent, not a dictionary word. */
export function stem(word: string): string {
  let w = word;
  if (w.length <= 3 || /^\d+$/.test(w)) return w;
  if (w.endsWith('ing') && w.length >= 5) w = w.slice(0, -3);
  else if (w.endsWith('in') && w.length >= 5 && VOWEL.test(w.slice(0, -2))) w = w.slice(0, -2); // drippin, flexin, ballin
  else if (w.endsWith('ed') && w.length >= 5) w = w.slice(0, -2);
  else if (w.endsWith('es') && w.length >= 5 && /(ss|sh|ch|x|z)es$/.test(w)) w = w.slice(0, -2);
  else if ((w.endsWith('s') || w.endsWith('z')) && !w.endsWith('ss') && w.length >= 4) w = w.slice(0, -1); // boyz = boys = boy
  if (w === word && w.endsWith('e') && !w.endsWith('ee') && w.length >= 4) w = w.slice(0, -1); // hustle, ride: meet hustlin, ridin
  // dripp -> drip, ball -> bal: the same on both sides, so "ballin" meets "ball"
  if (w.length >= 3 && w[w.length - 1] === w[w.length - 2] && !VOWEL.test(w[w.length - 1])) w = w.slice(0, -1);
  return w;
}

export const stems = (text: string) => words(text).map(stem);

/** The search's own stems: cut to MAX_QUERY_CHARS, and only the first MAX_QUERY_WORDS different words count. */
export function queryStems(text: string): string[] {
  const all = stems(text.slice(0, MAX_QUERY_CHARS));
  const kept = new Set<string>();
  return all.filter((s) => (kept.has(s) || kept.size < MAX_QUERY_WORDS) && (kept.add(s), true));
}

/** The search index: every tag's stems, which tags hold each stem, and how rare each stem is. Built once per tag list. */
export function buildIndex<T extends SearchTag>(tags: T[]): Index<T> {
  const items = tags.map((tag) => ({ tag, stems: stems(tag.text) }));
  const holders = new Map<string, number[]>(); // stem -> item numbers
  items.forEach((item, i) => {
    for (const s of new Set(item.stems)) {
      let list = holders.get(s);
      if (!list) holders.set(s, (list = []));
      list.push(i);
    }
  });
  return { items, holders, n: items.length };
}

/** Rarity: a word in few tags weighs a lot, a word in most tags weighs little but never nothing (3.2). */
export const weight = (index: Index<any>, s: string) => Math.log(1 + index.n / (1 + (index.holders.get(s)?.length ?? 0))) + 0.05;

const isRun = (hay: string[], needle: string[], from: number) => needle.every((s, k) => hay[from + k] === s);
export function hasPhrase(hay: string[], needle: string[]) {
  if (!needle.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) if (isRun(hay, needle, i)) return true;
  return false;
}
export function inOrder(hay: string[], needle: string[]) {
  let at = 0;
  for (const s of hay) if (s === needle[at] && ++at === needle.length) return true;
  return needle.length === 0;
}

export const TIER = { phrase: 4, inOrder: 3, all: 2, some: 1 };

/** One tag against one search: its tier on the ladder and its score inside the tier (0..1, share of the search's weight). */
export function judge(index: Index<any>, itemStems: string[], query: string[]) {
  const held = new Set(itemStems);
  const unique = [...new Set(query)];
  let got = 0;
  let total = 0;
  for (const s of unique) {
    const w = weight(index, s);
    total += w;
    if (held.has(s)) got += w;
  }
  const all = unique.every((s) => held.has(s));
  const tier = !all ? TIER.some : hasPhrase(itemStems, query) ? TIER.phrase : inOrder(itemStems, query) ? TIER.inOrder : TIER.all;
  return { tier, score: total ? got / total : 0 };
}

const better = (a: TagHit<any>, b: TagHit<any>) => b.tier - a.tier || b.score - a.score || a.len - b.len || a.tag.at_sec - b.tag.at_sec;

/** Every tag sharing a word with the search, best first (ties: higher score, the shorter tag, then the earlier second). */
function allHits<T extends SearchTag>(index: Index<T>, query: string[]): TagHit<T>[] {
  if (!query.length) return [];
  const seen = new Set<number>();
  for (const s of new Set(query)) for (const i of index.holders.get(s) ?? []) seen.add(i);
  const out: TagHit<T>[] = [];
  for (const i of seen) {
    const item = index.items[i];
    const { tier, score } = judge(index, item.stems, query);
    out.push({ tag: item.tag, tier, score, len: item.stems.length });
  }
  return out.sort(better);
}

/** The search by tag: best `limit` tags, best first (the spike's answer, kept for the acceptance runner and tests). */
export function search<T extends SearchTag>(index: Index<T>, text: string, limit = 20): TagHit<T>[] {
  return allHits(index, queryStems(text)).slice(0, limit);
}

/** The search by song: one row per song, its best tag first; `more` counts its other matching tags; `total` counts every
 * matching song, shown or past the cap. `keep` drops songs Library doesn't show (Not mine, hidden) before the cut, so the list is never short because of them. */
export function searchSongs<T extends SearchTag>(
  index: Index<T>,
  text: string,
  limit = SONGS_SHOWN,
  keep: (songId: string) => boolean = () => true,
  rowOf: (songId: string) => string = (id) => id, // a version's tag counts for its family's row (the Main)
) {
  const rows = new Map<string, SongHit<T>>();
  const seen = new Set<string>(); // every song met, shown or not: its later tags never start a second row
  for (const hit of allHits(index, queryStems(text))) {
    const songId = rowOf(hit.tag.song_id);
    const row = rows.get(songId);
    if (row) row.more++;
    else if (!seen.has(songId) && keep(songId)) {
      seen.add(songId);
      if (rows.size < limit) rows.set(songId, { ...hit, songId, more: 0 });
    }
  }
  return { rows: [...rows.values()], total: seen.size };
}

/** A tag's text in pieces, each marked if its word matches the search (for bold words in a result row). */
export function pieces(text: string, query: string[]): { text: string; hit: boolean }[] {
  const wanted = new Set(query);
  const out: { text: string; hit: boolean }[] = [];
  const re = /[\p{L}\p{N}\p{M}'’`]+/gu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), hit: false });
    const hit = words(m[0]).some((w) => wanted.has(stem(w)));
    out.push({ text: m[0], hit });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  // neighbours with the same mark join, so a row draws few pieces
  return out.reduce<{ text: string; hit: boolean }[]>((acc, p) => {
    const prev = acc[acc.length - 1];
    if (prev && prev.hit === p.hit) prev.text += p.text;
    else acc.push({ ...p });
    return acc;
  }, []);
}

/** The index for a tag list, built once per list: the tag store hands out a new list only when tags really change. */
let cached: { tags: SearchTag[]; index: Index<any> } | null = null;
export function indexFor<T extends SearchTag>(tags: T[]): Index<T> {
  if (cached?.tags !== tags) cached = { tags, index: buildIndex(tags) };
  return cached.index;
}
