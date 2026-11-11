// Play data (overhaul wave 1): what counts as a play, and what Home's two rows show. Plain code a test can run.
// The phone keeps no totals of its own: the laptop's log is the truth, its counts come with the song list, and the
// plays the laptop hasn't taken yet are laid on top (the same way ratings work), so nothing can drift or double.

/** A play counts once the song has been heard this long: real playing time, so pauses and seeking add nothing. */
export const PLAY_COUNTS_AFTER = 30;
/** A song shorter than this counts once three quarters of it has been heard (a 20 s idea can still be a play). */
const SHORT_SONG = 40;
/** The second line (the play's full length) is only worth sending if this much more was heard. */
const WORTH_UPDATING = 5;
/** A report this much further on than the clock allows was a seek, not listening. */
const SEEK_SLACK = 1.5;

export type PlayLine = { play_id: string; song_id: string; started_at: string; seconds: number; source: 'phone'; end?: true };
export type PlayChange = { id: string; kind: 'play_add'; data: PlayLine };

type Open = { playId: string; songId: string; startedAt: string; heard: number; sent: number; lastTime: number; lastAt: number; playing: boolean };

/** Follows the song that is sounding. `start` on every new song (null: a song that doesn't count, like a Sort card),
 * `report` on every report from the player. `emit` gets one line when the play counts, and one more with the full
 * length when the song is left. */
export function playTracker(io: { now: () => number; newId: () => string; emit: (line: PlayLine) => void }) {
  let open: Open | null = null;
  const line = (o: Open, end: boolean): PlayLine => ({
    play_id: o.playId, song_id: o.songId, started_at: o.startedAt, seconds: Math.round(o.heard * 10) / 10, source: 'phone', ...(end ? { end: true as const } : {}),
  });
  const close = () => {
    const o = open;
    open = null;
    if (o && o.sent > 0 && o.heard - o.sent >= WORTH_UPDATING) io.emit(line(o, true));
  };
  return {
    start(songId: string | null) {
      close();
      if (songId) open = { playId: io.newId(), songId, startedAt: '', heard: 0, sent: 0, lastTime: -1, lastAt: 0, playing: false };
    },
    /** `time`: the song's second now. `length`: the song's length if known, else 0. */
    report(playing: boolean, time: number, length: number) {
      const o = open;
      if (!o) return;
      const now = io.now();
      // it starts when the sound does: a song brought back paused at launch may wait hours for its Play
      if (playing && !o.startedAt) o.startedAt = new Date(now).toISOString();
      const moved = time - o.lastTime;
      // only time that passed while it played, at the clock's own pace: a seek forward or back adds nothing
      if (o.playing && playing && o.lastTime >= 0 && moved > 0 && moved <= (now - o.lastAt) / 1000 + SEEK_SLACK) o.heard += moved;
      o.lastTime = time;
      o.lastAt = now;
      o.playing = playing;
      const needed = length > 0 && length < SHORT_SONG ? length * 0.75 : PLAY_COUNTS_AFTER;
      if (!o.sent && o.heard >= needed) {
        o.sent = o.heard;
        io.emit(line(o, false));
      }
    },
    /** The song is over or left with nothing after it. */
    stop: close,
    /** Something else has the sound (Compare): what comes next is not this song being heard, until its own next
     * report says so. Without this, minutes of Compare would be credited to the song in one jump (review 2026-11-10). */
    hold() {
      if (open) {
        open.playing = false;
        open.lastTime = -1;
      }
    },
    now: () => (open ? { songId: open.songId, heard: open.heard, counted: open.sent > 0 } : null),
  };
}

/** Per song: how many plays, and when the last one started (ms since 1970; 0: never). */
export type Played = { n: number; last: number };
export type PlayMap = ReadonlyMap<string, Played>;

const ms = (iso: string | null | undefined) => {
  // the laptop writes six digits after the second; a phone's date reader is only sure to take three
  const at = iso ? Date.parse(iso.replace(/([.]\d{3})\d+/, '$1')) : NaN;
  return Number.isFinite(at) ? at : 0;
};

/** The counts a song list carries. */
export const playsFrom = (songs: readonly { id: string; plays?: number | null; last_heard?: string | null }[]): Map<string, Played> =>
  new Map(songs.flatMap((song): [string, Played][] => (song.plays ? [[song.id, { n: song.plays, last: ms(song.last_heard) }]] : [])));

/** Counts as they'll be once the laptop has these: each waiting play adds one. A play's second line (its full length)
 * adds nothing. `now`: a phone clock running ahead can't put "last heard" in the future. */
export function playsWithPending(base: PlayMap, pending: readonly { kind: string; data: unknown }[], now: number): Map<string, Played> {
  const out = new Map(base);
  for (const change of pending) {
    if (change.kind !== 'play_add') continue;
    const data = change.data as PlayLine;
    if (data.end) continue;
    const was = out.get(data.song_id) ?? { n: 0, last: 0 };
    out.set(data.song_id, { n: was.n + 1, last: Math.max(was.last, Math.min(ms(data.started_at), now)) });
  }
  return out;
}

/** A fresh song list, plus the plays the laptop took while that list was on its way (`taken`). The list may or may not
 * hold them already, so the phone's own count (`known`: the last list plus everything the laptop has taken since)
 * settles it: a taken play is added only while the list is still behind `known`. Never doubled, never dipping. */
export function listWithTaken(list: PlayMap, known: PlayMap, taken: readonly { kind: string; data: unknown }[], now: number): Map<string, Played> {
  const out = new Map(list);
  for (const change of taken) {
    if (change.kind !== 'play_add') continue;
    const data = change.data as PlayLine;
    if (data.end) continue;
    const was = out.get(data.song_id) ?? { n: 0, last: 0 };
    const behind = was.n < (known.get(data.song_id)?.n ?? 0); // false: the list already counted it
    // "last heard" is true either way (the laptop took this play), so it never goes back
    out.set(data.song_id, { n: was.n + (behind ? 1 : 0), last: Math.max(was.last, Math.min(ms(data.started_at), now)) });
  }
  return out;
}

export const ROW_SONGS = 12;
const DAY_MS = 24 * 3600 * 1000;
/** Heard within this many days: not "a while" yet. */
export const A_WHILE_DAYS = 30;

/** Recently played: the songs heard last, newest first. Only songs still in the list (a Hidden song drops out). */
export const recentlyPlayed = <S extends { id: string }>(songs: readonly S[], plays: PlayMap, limit = ROW_SONGS): S[] =>
  songs
    .filter((song) => (plays.get(song.id)?.last ?? 0) > 0)
    .sort((a, b) => plays.get(b.id)!.last - plays.get(a.id)!.last)
    .slice(0, limit);

const hash = (text: string) => {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0;
  // stirred well, so one changed letter (the day) reorders everything, not just shifts it
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};

/** The local day as YYYY-MM-DD: the row changes once a day, never while I look at it. */
export const dayOf = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Not played in a while. `songs`: the ones that may show (Mine, not Archived, a family's Main, playable now).
 * Half the row: songs heard, but not for 30 days or more, longest ago first. The rest: songs never played since
 * counting began, a different handful each day (the same all day). Either half fills the other's empty seats. */
export function notPlayedInAWhile<S extends { id: string }>(songs: readonly S[], plays: PlayMap, now: number, limit = ROW_SONGS): S[] {
  const day = dayOf(now);
  const longAgo = songs
    .filter((song) => {
      const last = plays.get(song.id)?.last ?? 0;
      return last > 0 && now - last >= A_WHILE_DAYS * DAY_MS;
    })
    .sort((a, b) => plays.get(a.id)!.last - plays.get(b.id)!.last);
  const never = songs
    .filter((song) => !(plays.get(song.id)?.last ?? 0))
    .map((song) => ({ song, key: hash(`${day}/${song.id}`) }))
    .sort((a, b) => a.key - b.key || (a.song.id < b.song.id ? -1 : 1))
    .map((one) => one.song);
  const half = Math.ceil(limit / 2);
  const fromLongAgo = longAgo.slice(0, Math.max(half, limit - never.length));
  return [...fromLongAgo, ...never.slice(0, limit - fromLongAgo.length)];
}

/** Where a song from "Not played in a while" starts: 0:30, or a third of the way into a short one. */
export const rediscoverStart = (length: number | null | undefined) => (length && length > 0 && length < 90 ? Math.floor(length / 3) : 30);
