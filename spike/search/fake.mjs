// Fake tags at my library's size: 1,395 songs, about 20 tags each (0 to 40), short rap-note lines with slang endings,
// misspellings and common filler words. Seeded, so every run makes the same library. Made-up words only.
const SONGS = 1395;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const COMMON = 'the a to it i in on and is my of you that this for with we me be it\'s just like so up all get got has have when now here go'.split(' ');
const STUDIO = 'hook verse bridge intro outro beat snare kick bass 808 hi-hat drop switch ad-lib adlibs double take punch breath mix vocal harmony melody sample loop bar bars flow cadence rhyme line chorus pre-hook reverb delay'.split(' ');
const SLANG = 'drip drippin flex flexin ball ballin stunt stuntin hustle hustlin grind grindin ice icy whip bands racks guap opps gang slide slidin vibe vibin cap no-cap bussin lit fire heat smoke smokin ride ridin run runnin sauce wave splash sippin trap trappin plug finesse dope fresh clean cold wild crazy real fake'.split(' ');
const NOTES = 'rewrite redo fix cut keep louder quieter later earlier tighter faster slower better worse here there again twice'.split(' ');
const EXTRA = Array.from({ length: 2400 }, (_, i) => {
  // a long tail of rarer words, made-up but word-shaped: names, places, one-off images
  const parts = ['ka', 'lo', 'mi', 'ra', 'ze', 'tu', 'vo', 'shi', 'qua', 'den', 'mar', 'bel', 'cor', 'nix', 'pal', 'gro'];
  return parts[i % 16] + parts[(i * 7 + 3) % 16] + (i % 5 === 0 ? parts[(i * 3) % 16] : '');
});

function misspell(word, r) {
  if (word.length < 4) return word;
  const i = 1 + Math.floor(r() * (word.length - 2));
  return r() < 0.5 ? word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2) : word.slice(0, i) + word.slice(i + 1);
}

export function fakeLibrary(seed = 7) {
  const r = rng(seed);
  const pick = (list) => list[Math.floor(r() * list.length)];
  // Zipf-ish: common words often, rare words seldom
  const word = () => {
    const x = r();
    const w = x < 0.38 ? pick(COMMON) : x < 0.58 ? pick(STUDIO) : x < 0.78 ? pick(SLANG) : x < 0.86 ? pick(NOTES) : pick(EXTRA);
    return r() < 0.03 ? misspell(w, r) : w;
  };
  const tags = [];
  for (let s = 0; s < SONGS; s++) {
    const count = Math.floor(r() * 41); // 0..40, about 20 on average
    const length = 180 + Math.floor(r() * 120);
    for (let t = 0; t < count; t++) {
      const n = 2 + Math.floor(r() * 9); // 2..10 words
      const text = Array.from({ length: n }, word).join(' ') + (r() < 0.1 ? ' 🔥' : '');
      tags.push({ id: `t${s}-${t}`, song_id: `s${s}`, text, at_sec: Math.round(r() * length * 1000) / 1000 });
    }
  }
  return tags;
}

/** Searches like mine: half-remembered lines from real tags (2-5 words, sometimes a slang form or a word dropped),
 * plus single words, common-word searches and a few that match nothing. */
export function fakeSearches(tags, count = 300, seed = 11) {
  const r = rng(seed);
  const out = [];
  while (out.length < count) {
    const kind = r();
    const tag = tags[Math.floor(r() * tags.length)];
    const ws = tag.text.split(' ').filter((w) => w !== '🔥');
    if (kind < 0.55 && ws.length >= 2) {
      const n = Math.min(ws.length, 2 + Math.floor(r() * 4));
      const from = Math.floor(r() * (ws.length - n + 1));
      let q = ws.slice(from, from + n);
      if (r() < 0.3 && q.length > 2) q.splice(1 + Math.floor(r() * (q.length - 2)), 1); // a word forgotten
      q = q.map((w) => (r() < 0.15 && !w.endsWith('in') ? w + 'in' : w)); // said it the slang way
      out.push(q.join(' '));
    } else if (kind < 0.75) out.push(ws[Math.floor(r() * ws.length)]);
    else if (kind < 0.9) out.push('it has to be the one');
    else out.push('zzq nothing like this');
  }
  return out;
}
