// The picture every song has until real art exists (DESIGN-SYSTEM "The tile"), and the player's tint taken from it.
// Colour from the title, so a song's tile never changes; older songs darker, newer brighter. Plain maths a test can run.

const hash = (text: string) => {
  let h = 7;
  for (const ch of text) h = (Math.imul(h, 31) + ch.codePointAt(0)!) >>> 0;
  return h;
};

const FIRST_YEAR = 2014;
const LAST_YEAR = 2026;
const NO_DATE_YEAR = 2020; // a song with no date sits in the middle

export type Tile = {
  /** No letter or digit in the title: a grey tile with "?" and no tint. */
  grey: boolean;
  letters: string;
  base: string;
  /** A lighter patch of a nearby colour, so the tile isn't flat: red, green, blue. */
  glow: [number, number, number];
  /** Where the patch sits, as shares of the tile (0 to 1). */
  glowX: number;
  glowY: number;
  /** The player's background at its top; black by the buttons. */
  tint: string;
  /** For the contrast test. */
  tintRgb: [number, number, number];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as [number, number, number];
};
const hex = (rgb: [number, number, number]) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** How strongly the player takes the tile's colour at most (the rest is black). A bright tile gives less, so the
 * quiet grey words on the player (times, Not mine) still read: see QUIET_TEXT. */
export const TINT_SHARE = 0.4;
/** The player's quiet text colour (theme.ts dim) and the least contrast it must keep on the tint. */
const QUIET_TEXT: [number, number, number] = [0xa0, 0xa0, 0xaa];
const QUIET_CONTRAST = 4.6;

const yearOf = (date: string | null | undefined) => {
  const year = date ? Number(String(date).slice(0, 4)) : NaN;
  return Number.isFinite(year) ? Math.min(Math.max(year, FIRST_YEAR), LAST_YEAR) : NO_DATE_YEAR;
};

export function tileOf(title: string | null | undefined, date?: string | null): Tile {
  const name = (title ?? '').trim();
  const found = name.match(/[\p{L}\p{N}]/gu);
  if (!found) {
    const grey: [number, number, number] = [44, 44, 50];
    return { grey: true, letters: '?', base: hex(grey), glow: [70, 70, 78], glowX: 0.3, glowY: 0.25, tint: '#000000', tintRgb: [0, 0, 0] };
  }
  const h = hash(name) % 360;
  const angle = hash(`${name}a`) % 360;
  const light = (22 + (yearOf(date) - FIRST_YEAR) * 2.2) / 100;
  const base = hslToRgb((h + 12) % 360, 0.6, Math.min(light + 0.06, 0.5)); // capped: nothing glows in a dark room
  const glow = hslToRgb((h + 50) % 360, 0.7, Math.min(light + 0.22, 0.7));
  let share = TINT_SHARE;
  let tintRgb = base.map((v) => Math.round(v * share)) as [number, number, number];
  while (contrast(QUIET_TEXT, tintRgb) < QUIET_CONTRAST && share > 0.1) {
    share -= 0.02;
    tintRgb = base.map((v) => Math.round(v * share)) as [number, number, number];
  }
  return {
    grey: false,
    letters: found.slice(0, 2).join(''),
    base: hex(base),
    glow,
    glowX: (20 + (h % 60)) / 100,
    glowY: (15 + (angle % 50)) / 100,
    tint: hex(tintRgb),
    tintRgb,
  };
}

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
/** The contrast of two colours, 1 to 21 (WCAG): 7 or more reads easily. */
export const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
