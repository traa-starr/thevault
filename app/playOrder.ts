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

export type Change = { id: string; kind: 'mine_set' | 'mine_restore'; data: { song_id: string; value?: 'mine' | 'not mine' } };

/** The Hidden list as it will be once the laptop has these changes: a song with a restore (or Mine) waiting is already back. */
export function withoutRestored<S extends { id: string }>(hidden: S[], pending: Change[]): S[] {
  const latest = new Map(pending.map((change) => [change.data.song_id, change]));
  return hidden.filter((song) => {
    const change = latest.get(song.id);
    return !change || (change.kind === 'mine_set' && change.data.value === 'not mine');
  });
}

/** The list as it will be once the laptop has these changes. A restore waits for the laptop's own answer. */
export function withPending<S extends { id: string; mine: string; sorted: boolean }>(songs: S[], pending: Change[]): S[] {
  const latest = new Map(pending.map((change) => [change.data.song_id, change]));
  return songs.flatMap((song) => {
    const value = latest.get(song.id)?.data.value;
    if (!value) return [song];
    return value === 'not mine' ? [] : [{ ...song, mine: value, sorted: true }];
  });
}
