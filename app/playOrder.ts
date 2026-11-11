// Which song comes next, as plain data so it can be tested without a phone. Songs are ids, so a list refresh can't point
// the queue at the wrong song: the order keeps its own copy of the list from the moment of the tap.
// Test: node --experimental-strip-types app/playOrder.test.mjs
export type Order = { list: string[]; sequence: string[]; at: number; furthest: number; shuffle: boolean; removed: string[] };

const shuffled = (ids: string[], random: () => number) => {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Songs a shuffle won't land on. A set, so a 1,400-song list skipping most of itself stays quick. */
export type Avoid = readonly string[] | ReadonlySet<string>;
const avoids = (avoid: Avoid, id: string) => ('has' in avoid ? avoid.has(id) : avoid.includes(id));

export function startOrder(list: string[], current: string, shuffle: boolean, random: () => number = Math.random, removed: string[] = []): Order {
  const sequence = shuffle ? [current, ...shuffled(list.filter((id) => id !== current), random)] : list;
  const at = shuffle ? 0 : list.indexOf(current);
  return { list, sequence, at, furthest: at, shuffle, removed };
}

export const currentId = (order: Order) => order.sequence[order.at];

export const setShuffle = (order: Order, shuffle: boolean, random: () => number = Math.random): Order =>
  startOrder(order.list, currentId(order), shuffle, random, order.removed);

/** The next song, or null when none is left. List order wraps round to the top and plays every song still in the list.
 * Shuffle plays each song once and never lands on a song in `avoid`, but one already played can be stepped back through. */
export function nextInOrder(order: Order, avoid: Avoid = []): Order | null {
  const count = order.sequence.length;
  for (let step = 1; step <= count; step++) {
    if (order.shuffle && order.at + step >= count) return null;
    const at = (order.at + step) % count;
    const id = order.sequence[at];
    if (order.removed.includes(id)) continue;
    if (order.shuffle && at > order.furthest && avoids(avoid, id)) continue;
    return { ...order, at, furthest: Math.max(order.furthest, at) };
  }
  return null;
}

/** The song before, or null when there isn't one. List order wraps round to the bottom. */
export function previousInOrder(order: Order): Order | null {
  const count = order.sequence.length;
  for (let step = 1; step <= count; step++) {
    if (order.shuffle && order.at - step < 0) return null;
    const at = (order.at - step + count) % count;
    if (!order.removed.includes(order.sequence[at])) return { ...order, at };
  }
  return null;
}

/** Takes the current song out of the order. It stays current until the caller moves on, and Next and Previous carry on
 * from where it was. To undo, go back to the order saved before this. */
export const removeFromOrder = (order: Order): Order => ({ ...order, removed: [...order.removed, currentId(order)] });

/** Jumps to a song, keeping what has been played and what has been removed. */
export function jumpTo(order: Order, id: string): Order {
  const at = order.sequence.indexOf(id);
  return at < 0 ? order : { ...order, at, furthest: Math.max(order.furthest, at) };
}

/** Moves a song to right after `afterId`, or right after the current song if that's null. Works by id, because Up next
 * rows wrap round and hide songs, so a row number isn't a place in the sequence. Keeps the same songs on the played side
 * of `furthest`, so the move can't let an avoided song into a shuffle. The same order back means nothing changed. */
export function moveInOrder(order: Order, id: string, afterId: string | null): Order {
  const current = currentId(order);
  const from = order.sequence.indexOf(id);
  if (id === current || id === afterId || from < 0 || order.removed.includes(id)) return order;
  const sequence = order.sequence.filter((one) => one !== id);
  const currentAt = sequence.indexOf(current);
  const afterAt = afterId === null ? -1 : sequence.indexOf(afterId);
  // a shuffle doesn't wrap: a song that has played by now is behind, so the move lands right after the current song
  const anchor = afterAt < 0 || (order.shuffle && afterAt < currentAt) ? currentAt : afterAt;
  sequence.splice(anchor + 1, 0, id);
  if (sequence.every((one, i) => one === order.sequence[i])) return order;
  const to = anchor + 1;
  const wasPlayed = from <= order.furthest;
  const furthest = wasPlayed ? order.furthest - (to > order.furthest ? 1 : 0) : order.furthest + (to <= order.furthest ? 1 : 0);
  return { ...order, sequence, at: sequence.indexOf(current), furthest };
}

/** The moves ahead of this song, for Up next and the player's window. Stops when none is left, or at `count`. */
export function walkAhead(order: Order, count: number, avoid: Avoid = []): Order[] {
  const out: Order[] = [];
  let from = order;
  while (out.length < count) {
    const moved = nextInOrder(from, avoid);
    if (!moved) break;
    out.push(moved);
    from = moved;
  }
  return out;
}

/** What Up next shows: each song once, stopping when list order comes back round to the current song. */
export function upNext(order: Order, count: number, avoid: Avoid = []): string[] {
  const out: string[] = [];
  for (const moved of walkAhead(order, count, avoid)) {
    if (moved.at === order.at) break;
    out.push(currentId(moved));
  }
  return out;
}

/** The moves behind this song, nearest last. */
export function walkBack(order: Order, count: number): Order[] {
  const out: Order[] = [];
  let from = order;
  while (out.length < count) {
    const moved = previousInOrder(from);
    if (!moved) break;
    out.unshift(moved);
    from = moved;
  }
  return out;
}

import type { PlayChange } from './playLog';

export type MineChange = { id: string; kind: 'mine_set' | 'mine_restore'; data: { song_id: string; value?: 'mine' | 'not mine' } };
export type FamilyChange = {
  id: string;
  kind: 'family_set';
  data: {
    song_id: string;
    songs: Record<string, string | null>;
    before: Record<string, string | null>;
    picked?: Record<string, boolean>;
    picked_before?: Record<string, boolean>;
    /** Marked Mine in the same go, before the family is made. */
    mine?: string[];
    /** Mine put back as it was, after the family is undone. */
    restore_mine?: string[];
  };
};
/** A whole tag, as the laptop keeps it (BLUEPRINT "Phase 2: tagging"). `version_id` is filled in by the laptop. */
export type Tag = { id: string; song_id: string; version_id?: string | null; text: string; at_sec: number; made_at: string };
export type TagLine = { tag_id: string; song_id: string; version_id?: string | null; text: string; at_sec: number; made_at: string };
export type TagChange =
  | { id: string; kind: 'tag_add'; data: TagLine }
  | { id: string; kind: 'tag_remove'; data: { tag_id: string; song_id: string } };
/** My rating (2.8). No rating: unrated. Shelved: mine but off-direction, out of anything the app picks for me. */
export type Rating = 'fire' | 'shelved';
export type RatingChange = { id: string; kind: 'rating_set'; data: { song_id: string; value: Rating | 'none' } };
export type Change = MineChange | FamilyChange | TagChange | RatingChange | PlayChange;

/** The ratings a song list carries. */
export const ratingsFrom = (songs: readonly { id: string; rating?: string | null }[]) =>
  new Map(songs.flatMap((song): [string, Rating][] => (song.rating === 'fire' || song.rating === 'shelved' ? [[song.id, song.rating]] : [])));

/** Ratings as they'll be once the laptop has these changes: each tap in order, the latest wins (Shelve then Undo while
 * offline ends unrated). */
export function ratingsWithPending(base: ReadonlyMap<string, Rating>, pending: readonly Change[]): Map<string, Rating> {
  const out = new Map(base);
  for (const change of pending) {
    if (change.kind !== 'rating_set') continue;
    if (change.data.value === 'none') out.delete(change.data.song_id);
    else out.set(change.data.song_id, change.data.value);
  }
  return out;
}

/** A tap on Fire or Shelve: on, or off again if the song already had it. Never a cycle, so a double tap on Fire can't
 * land on Shelved (board 2026-11-09). */
export const ratingAfterTap = (now: Rating | null, tapped: Rating): Rating | 'none' => (now === tapped ? 'none' : tapped);

/** What the app may pick by itself: never a Shelved song. Songs I pick myself (a tap, the queue) don't ask this. */
export const pickable = <S extends { id: string }>(songs: S[], isShelved: (id: string) => boolean) => songs.filter((song) => !isShelved(song.id));

/** The Mine side of what's waiting: a versions change carries its own Mine marks and restores. */
const mineOnly = (pending: Change[]): MineChange[] =>
  pending.flatMap((change): MineChange[] =>
    change.kind === 'mine_set' || change.kind === 'mine_restore'
      ? [change]
      : change.kind !== 'family_set'
      ? []
      : [
          ...(change.data.mine ?? []).map((id): MineChange => ({ id: change.id, kind: 'mine_set', data: { song_id: id, value: 'mine' } })),
          ...(change.data.restore_mine ?? []).map((id): MineChange => ({ id: change.id, kind: 'mine_restore', data: { song_id: id } })),
        ],
  );

/** Plays `id` now without touching what comes after: a song not in the order goes in right after the current one. */
export function playHere(order: Order, id: string): Order {
  if (order.sequence.includes(id)) return jumpTo({ ...order, removed: order.removed.filter((one) => one !== id) }, id);
  const insert = (ids: string[], after: string) => {
    const out = [...ids];
    out.splice(out.indexOf(after) + 1, 0, id);
    return out;
  };
  const current = currentId(order);
  const sequence = insert(order.sequence, current);
  const list = order.list === order.sequence ? sequence : insert(order.list, current);
  return jumpTo({ ...order, list, sequence, furthest: order.furthest + (order.at < order.furthest ? 1 : 0) }, id);
}

/** The Hidden list as it will be once the laptop has these changes: a song with a restore (or Mine) waiting is already back. */
export function withoutRestored<S extends { id: string }>(hidden: S[], pending: Change[]): S[] {
  const latest = new Map(mineOnly(pending).map((change) => [change.data.song_id, change]));
  return hidden.filter((song) => {
    const change = latest.get(song.id);
    return !change || (change.kind === 'mine_set' && change.data.value === 'not mine');
  });
}

/** The list as it will be once the laptop has these changes. A restore waits for the laptop's own answer. */
export function withPending<S extends { id: string; mine: string; sorted: boolean }>(songs: S[], pending: Change[]): S[] {
  const latest = new Map(mineOnly(pending).map((change) => [change.data.song_id, change]));
  return songs.flatMap((song) => {
    const value = latest.get(song.id)?.data.value;
    if (!value) return [song];
    return value === 'not mine' ? [] : [{ ...song, mine: value, sorted: true }];
  });
}

/** A tag shown on the phone: the laptop's copy with what's waiting laid on top. `onPhone` until the laptop has it. */
export type ShownTag = Tag & { onPhone: boolean };

/** Tags as they'll be once the laptop has these changes, in time order (ties: oldest made first). Only `songId`'s if given. */
export function tagsWithPending(copy: Tag[], pending: Change[], songId?: string): ShownTag[] {
  const tags = new Map<string, ShownTag>(copy.map((tag) => [tag.id, { ...tag, onPhone: false }]));
  for (const change of pending) {
    if (change.kind === 'tag_add') {
      const { tag_id, ...rest } = change.data;
      const was = tags.get(tag_id);
      // the laptop's song wins: it may have moved the tag to the song that stayed after a merge
      tags.set(tag_id, { ...was, id: tag_id, ...rest, song_id: was?.song_id ?? rest.song_id, made_at: was?.made_at ?? rest.made_at, onPhone: true });
    } else if (change.kind === 'tag_remove') tags.delete(change.data.tag_id);
  }
  return [...tags.values()]
    .filter((tag) => !songId || tag.song_id === songId)
    .sort((a, b) => a.at_sec - b.at_sec || a.made_at.localeCompare(b.made_at) || a.id.localeCompare(b.id));
}

/** Every song's tags at once, each list in time order: built once per change to the tags, so any song's tags (the next
 * one's too) are there before its tap, with nothing to work out when the song changes (NEXT 2026-11-09 A). */
export function tagIndex(copy: Tag[], pending: Change[]): Map<string, ShownTag[]> {
  const bySong = new Map<string, ShownTag[]>();
  for (const tag of tagsWithPending(copy, pending)) {
    const list = bySong.get(tag.song_id);
    if (list) list.push(tag);
    else bySong.set(tag.song_id, [tag]);
  }
  return bySong;
}

/** Compare's wheel: where a flick from row `from` that landed on row `landed` should rest. A flick travels: it rests
 * where it landed (6.6, like the iPhone picker). A row there that can't play is stepped over, on in the flick's
 * direction. None that way: it stays on the row it landed on, which shows why it can't play. */
export function dialTarget(from: number, landed: number, playable: boolean[]): number {
  const step = Math.sign(landed - from);
  if (!step) return from;
  for (let i = landed; i >= 0 && i < playable.length; i += step) if (playable[i]) return i;
  return landed;
}

/** The eye (hide buttons) keeps my last choice on every song and screen, and after a kill (owner, 2026-11-09): the
 * only things that change it are my tap and a restore after a reinstall. `file` is its flag on disk. */
export function eyeSetting(file: () => FlagFile) {
  let hidden = file().exists;
  return {
    hidden: () => hidden,
    /** My tap. The switch flips even if the file can't be written (it's only for the next launch). */
    toggle() {
      hidden = !hidden;
      try {
        setFlag(file(), hidden);
      } catch {
        // a full phone: the choice holds until the app closes
      }
      return hidden;
    },
    /** Read again from disk: a restore after a reinstall just wrote it. */
    reload: () => (hidden = file().exists),
  };
}

/** A setting kept as a file that exists or not (the eye, time left). */
export type FlagFile = { readonly exists: boolean; create(): void; delete(): void };
/** Sets it by what's on disk, not what the screen thought: the sorted-song eye rule changes the screen without the file. */
export function setFlag(file: FlagFile, on: boolean) {
  if (on && !file.exists) file.create();
  else if (!on && file.exists) file.delete();
}

/** Tags · N tapped on a song: its list opens, or closes if it was the open one. The open one is kept as a song id, so a
 *  song change closes it with no extra step. */
export const listAfterTap = (openFor: string | null, songId: string) => (openFor === songId ? null : songId);
export const listIsOpen = (openFor: string | null, songId: string | null | undefined) => !!songId && openFor === songId;

/** Shuffle's one button: each tap goes Off > Mine > Unsorted > Off. `on` is read from `order.shuffle`, the one place. */
export type ShufflePick = { on: boolean; pool: 'unsorted' | 'mine' };
export const shuffleAfterTap = ({ on, pool }: ShufflePick): ShufflePick =>
  !on ? { on: true, pool: 'mine' } : pool === 'mine' ? { on: true, pool: 'unsorted' } : { on: false, pool };
export const shuffleWords = ({ on, pool }: ShufflePick) => (!on ? 'off' : pool === 'mine' ? 'Mine' : 'Unsorted');

/** Tag words as playback passes a tick. One sample per time update; a step longer than this is a seek, not play.
 * Reports come once a second on screen (REPORT_MS.open), so a late one can be nearly 2 s on: the step allows 2.5. */
export const TICK_SHOW_MS = 4000;
export const PLAY_STEP = 2.5;
/** `from`: the last second heard while playing on its own; null after a drag, seek, pause or open field. */
export type TickWords = { from: number | null; tagId: string | null; until: number };
export const noTickWords: TickWords = { from: null, tagId: null, until: 0 };
/** A fresh song counts from just before 0:00, so a tag at 0:00 shows as it starts. */
export const songStartWords: TickWords = { from: -0.001, tagId: null, until: 0 };
/** `settled`: playing on its own (not dragged, not seeking, no tag field open). The newest tag passed replaces the
 *  last at once; words clear after 4 s or when the next tag is passed. */
export function tickWordsAfter(s: TickWords, tags: { id: string; at_sec: number }[], time: number, now: number, settled: boolean): TickWords {
  let { tagId, until } = s;
  if (tagId && now >= until) [tagId, until] = [null, 0];
  if (!settled) return { from: null, tagId, until };
  if (s.from !== null && time > s.from && time - s.from <= PLAY_STEP) {
    let passed: string | null = null;
    for (const tag of tags) if (tag.at_sec > s.from && tag.at_sec <= time) passed = tag.id;
    if (passed) [tagId, until] = [passed, now + TICK_SHOW_MS];
  }
  return { from: time, tagId, until };
}

/** The Tag icon: opens a draft, or with one open, cancels it (no tag saved), every tap, as fast as Cancel. Only a finger
 *  bounce (a tap under 150 ms after the last one that counted) is dropped, and a dropped tap never moves that window on. */
export const TAP_BOUNCE_MS = 150; // fast double taps land 150-250 ms apart: both must count
export type TagTap<D> = { draft: D | null; lastTap: number };
export function tagTapped<D>(s: TagTap<D>, now: number, fresh: () => D): TagTap<D> {
  if (now - s.lastTap < TAP_BOUNCE_MS) return s;
  return { draft: s.draft ? null : fresh(), lastTap: now };
}

/** Seek bar let go. A tick jump needs a quick, still tap near a tick; anything held or moved seeks to where the finger
 *  is, so a drag never snaps to a tick. */
export const TICK_TAP_MS = 600; // a careful press on a small tick; a drag also moves 6 px or more
const TICK_TAP_SLOP = 6;
const TICK_REACH = 22;
export function seekRelease<T extends { at_sec: number }>(r: { grabX: number; dx: number; heldMs: number; width: number; max: number; ticks: T[] }): { tick?: T; seek: number } {
  const x = Math.min(Math.max(r.grabX + r.dx, 0), r.width);
  const seek = r.width > 0 ? (x / r.width) * r.max : 0;
  if (r.heldMs >= TICK_TAP_MS || Math.abs(r.dx) >= TICK_TAP_SLOP || !r.max) return { seek };
  let tick: T | undefined;
  let gap = TICK_REACH;
  for (const one of r.ticks) {
    const d = Math.abs((one.at_sec / r.max) * r.width - r.grabX);
    if (d <= gap) [tick, gap] = [one, d];
  }
  return tick ? { tick, seek } : { seek };
}

// ---------- changing a tag (hold a row: Change words, Move to now, Delete) ----------------------------------------
type NewTagChange = { kind: 'tag_add'; data: TagLine } | { kind: 'tag_remove'; data: { tag_id: string; song_id: string } };

/** The whole tag again, with new words or a new second: same id, made_at and version (whole-tag lines, BLUEPRINT). */
export function tagEdit(tag: Tag, to: { text?: string; at?: number }): NewTagChange {
  const at = to.at ?? tag.at_sec;
  return {
    kind: 'tag_add',
    data: {
      tag_id: tag.id, song_id: tag.song_id, version_id: tag.version_id ?? null, text: (to.text ?? tag.text).trim().slice(0, 500),
      at_sec: Math.round(Math.max(0, at) * 1000) / 1000, made_at: tag.made_at,
    },
  };
}
export const tagRemoval = (tag: Tag): NewTagChange => ({ kind: 'tag_remove', data: { tag_id: tag.id, song_id: tag.song_id } });

/** Undo once the change has left the phone: the old whole tag goes back, or a new tag is removed. */
export const tagUndoLine = (change: TagChange, before: Tag | null): NewTagChange =>
  before ? tagEdit(before, {}) : { kind: 'tag_remove', data: { tag_id: change.data.tag_id, song_id: change.data.song_id } };

/** Tags list rows while it stays open: each row keeps its place (a moved tag too); a new tag goes at the bottom; a
 *  deleted one keeps its place (hidden by the caller), so Undo brings it back where it was. `prev` null (just opened,
 *  or another song): time order. */
export function rowOrder(prev: string[] | null, tags: { id: string; at_sec: number }[]): string[] {
  const now = [...tags].sort((a, b) => a.at_sec - b.at_sec).map((tag) => tag.id); // stable: ties keep the list's order
  if (!prev) return now;
  const had = new Set(prev);
  return [...prev, ...now.filter((id) => !had.has(id))];
}

// ---------- the tagging session (BLUEPRINT "Phase 2: tagging") --------------------------------------------------
/** Mine songs that can play right now, one per family (`isVersion`: a version, whose Main stands for it). */
export const sessionPool = <S extends { id: string; mine: string }>(songs: S[], canPlay: (song: S) => boolean, isVersion: (id: string) => boolean) =>
  songs.filter((song) => song.mine === 'mine' && !isVersion(song.id) && canPlay(song)).map((song) => song.id);

/** Untagged songs are this many times as likely to come next. */
export const UNTAGGED_WEIGHT = 3;
/** One lap of the pool: every song once, each next one picked at random with untagged ones 3x as likely (a weighted
 *  draw without putting back: each song's key is random^(1/weight), highest first). */
export function sessionLap(pool: string[], tagged: ReadonlySet<string>, random: () => number = Math.random): string[] {
  return pool
    .map((id) => ({ id, key: Math.pow(random(), 1 / (tagged.has(id) ? 1 : UNTAGGED_WEIGHT)) }))
    .sort((a, b) => b.key - a.key)
    .map((one) => one.id);
}

/** "N of M tagged": M is the pool less the songs called Not mine this session; N those of M with a live tag. */
export function sessionCount(pool: string[], out: readonly string[], tagged: ReadonlySet<string>) {
  const left = pool.filter((id) => !out.includes(id));
  return { tagged: left.filter((id) => tagged.has(id)).length, of: left.length };
}

/** A tag being typed when the song changes (Next, song end, a jump): it is saved, to the song it was tapped on. */
export const draftGoesOnChange = (draft: { songId: string } | null, from: string | null | undefined, to: string | null | undefined) =>
  !!draft && from === draft.songId && to !== draft.songId;

/** The line a new tag's draft is saved as: its own song, trimmed words, the second to 3 decimals. */
export const draftLine = (d: { tagId: string; songId: string; at: number; text: string; madeAt: string }): TagLine => ({
  tag_id: d.tagId, song_id: d.songId, text: d.text.trim().slice(0, 500), at_sec: Math.round(d.at * 1000) / 1000, made_at: d.madeAt,
});

/** Library's Shuffle: the player's cycle (shuffleAfterTap), stepping over a pool with no song that can play. */
export function libraryShuffleTap(pick: ShufflePick, hasMine: boolean, hasUnsorted: boolean): ShufflePick {
  let next = pick;
  for (let i = 0; i < 3; i++) {
    next = shuffleAfterTap(next);
    if (!next.on || (next.pool === 'mine' ? hasMine : hasUnsorted)) return next;
  }
  return { ...pick, on: false };
}

// Where a song starts (DECISIONS 2026-11-08, Phase 2 code-complete review): tagging session cards at 0:15, Sort cards at
// 0:30, fixed times handed to the player when the song loads, so nothing plays from 0:00 first. Everywhere else: 0:00.
const LENGTH_SLACK_SEC = 2; // the phone's own length replaces the laptop's only if they differ by more (nothing shifts)
/** The length the player shows (NEXT C): the laptop's measured one from the tap; the phone's own once loaded, only if it
 * differs by more than 2 s (a VBR MP3 estimate); the phone's if the laptop has none. 0: not known yet. */
export const shownLength = (stored: number, phone: number) =>
  phone > 0 && (stored <= 0 || Math.abs(phone - stored) > LENGTH_SLACK_SEC) ? phone : stored || phone;

export const SESSION_START_SEC = 15;
export const SORT_START_SEC = 30;
/** A spot asked for (an Undo, a saved place) wins; a fresh song gets the mode's start point. */
export const startSpot = (asked: number | undefined, startPoint: number) => asked ?? startPoint;
/** Next and Previous: the player's own queue whenever it holds the song, where it is already loaded (fast; a start
 * point goes silent and finds its spot on the way, engine skip). Only a song the queue doesn't hold is a fresh load.
 * 2026-11-08 review: the fresh load for every session Next held 3-5 s of silence. */
export const moveBy = (_startPoint: number, queueHasIt: boolean): 'queue' | 'load' => (queueHasIt ? 'queue' : 'load');

// The tagging session survives an app kill (2026-11-08 review): its pool, its Not mine songs and the lap it plays are
// saved to the phone. The player saves its own place (last-play.json); the session comes back only if the player came
// back on that same lap, so a Library song played after the session never wakes it.
export type SessionLine = { v: 1; pool: string[]; out: string[]; lap: string[] };
export const sessionLine = (pool: string[], out: string[], lap: string[]): SessionLine => ({ v: 1, pool, out, lap });
export function sessionBack(text: string | null | undefined, playing: { list: string[] } | null | undefined): { pool: string[]; out: string[] } | null {
  if (!text || !playing) return null;
  try {
    const line = JSON.parse(text) as SessionLine;
    if (line?.v !== 1 || !Array.isArray(line.pool) || !Array.isArray(line.out) || !Array.isArray(line.lap)) return null;
    const same = line.lap.length === playing.list.length && line.lap.every((id, i) => id === playing.list[i]);
    if (!same || !line.pool.length) return null;
    const pool = new Set(line.pool);
    return { pool: line.pool, out: line.out.filter((id) => pool.has(id)) };
  } catch {
    return null;
  }
}
