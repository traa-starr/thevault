// Phase 3 search groundwork (ROADMAP 3.1-3.3), spike only: the ranking ladder as pure functions, no app code.
// Plain JavaScript with no imports, so the same file could run on the phone (Hermes) or the laptop (Node).
//
// The ladder, best first (3.1). It never excludes: any tag sharing one word with the search is a result.
//   4 exact phrase        "has to go"  in  "it has to go now"
//   3 words in order      "has go"     in  "it has to go now"        (gaps allowed)
//   2 all words           "go has"     in  "it has to go now"        (any order)
//   1 some words          ranked by how rare the matched words are
// Common words are down-weighted, never banned (3.2): "has to" still finds "has to". Slang endings fold together (3.3):
// drip / drips / dripped / drippin / drippin' / dripping all count as one word.

/** Lowercase words, apostrophes dropped (drippin' = drippin), anything else not a letter or digit splits words. */
export function words(text) {
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
export function stem(word) {
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

export const stems = (text) => words(text).map(stem);

/** The search index: every tag's stems, which tags hold each stem, and how rare each stem is. Built once per tag list. */
export function buildIndex(tags) {
  const items = tags.map((tag) => ({ tag, stems: stems(tag.text) }));
  const holders = new Map(); // stem -> item numbers
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
export const weight = (index, s) => Math.log(1 + index.n / (1 + (index.holders.get(s)?.length ?? 0))) + 0.05;

const isRun = (hay, needle, from) => needle.every((s, k) => hay[from + k] === s);
export function hasPhrase(hay, needle) {
  if (!needle.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) if (isRun(hay, needle, i)) return true;
  return false;
}
export function inOrder(hay, needle) {
  let at = 0;
  for (const s of hay) if (s === needle[at] && ++at === needle.length) return true;
  return needle.length === 0;
}

export const TIER = { phrase: 4, inOrder: 3, all: 2, some: 1 };

/** One tag against one search: its tier on the ladder and its score inside the tier (0..1, share of the search's weight). */
export function judge(index, itemStems, query) {
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

/** The search: best `limit` tags, best first. Ties: higher score, then the shorter tag (a closer match), then time order. */
export function search(index, text, limit = 20) {
  const query = stems(text);
  if (!query.length) return [];
  const seen = new Set();
  for (const s of new Set(query)) for (const i of index.holders.get(s) ?? []) seen.add(i);
  const out = [];
  for (const i of seen) {
    const item = index.items[i];
    const { tier, score } = judge(index, item.stems, query);
    out.push({ tag: item.tag, tier, score, len: item.stems.length });
  }
  out.sort((a, b) => b.tier - a.tier || b.score - a.score || a.len - b.len || a.tag.at_sec - b.tag.at_sec);
  return out.slice(0, limit);
}
