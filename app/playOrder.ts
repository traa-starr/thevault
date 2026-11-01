// Which song comes next, as plain data so it can be tested without a phone. Songs are positions in the list.
// Test: node --experimental-strip-types app/playOrder.test.mjs
export type Order = { current: number; shuffle: boolean; played: number[]; at: number; removed: number[] };

export const startOrder = (current: number, shuffle: boolean, removed: number[] = []): Order => ({
  current,
  shuffle,
  played: [current],
  at: 0,
  removed,
});

export const setShuffle = (order: Order, shuffle: boolean): Order => startOrder(order.current, shuffle, order.removed);

/** The next song, or null when none is left. List order wraps round to the top and plays every song still in the list.
 * Shuffle never lands on a position in `avoid`, but a song already played can still be stepped back through. */
export function nextInOrder(order: Order, count: number, random: () => number = Math.random, avoid: number[] = []): Order | null {
  if (!order.shuffle) {
    for (let step = 1; step <= count; step++) {
      const current = (order.current + step) % count;
      if (!order.removed.includes(current)) return startOrder(current, false, order.removed);
    }
    return null;
  }
  const at = order.at + 1;
  if (at < order.played.length) return { ...order, current: order.played[at], at };
  const seen = new Set([...order.played, ...order.removed, ...avoid]);
  const left = Array.from({ length: count }, (_, i) => i).filter((i) => !seen.has(i));
  if (!left.length) return null;
  const current = left[Math.floor(random() * left.length)];
  return { ...order, current, played: [...order.played, current], at };
}

/** The song before, or null when there isn't one. List order wraps round to the bottom. */
export function previousInOrder(order: Order, count: number): Order | null {
  if (!order.shuffle) {
    for (let step = 1; step <= count; step++) {
      const current = (order.current - step + count) % count;
      if (!order.removed.includes(current)) return startOrder(current, false, order.removed);
    }
    return null;
  }
  // a removed song stopped on with nothing after it: `at` already points at the one before it
  const at = order.removed.includes(order.current) ? order.at : order.at - 1;
  if (at < 0) return null;
  return { ...order, current: order.played[at], at };
}

/** Takes the current song out of the order. It stays current until the caller moves on, and Next and Previous carry on
 * from where it was. To undo, go back to the order saved before this. */
export function removeFromOrder(order: Order): Order {
  return {
    ...order,
    removed: [...order.removed, order.current],
    played: order.played.filter((position) => position !== order.current),
    at: order.at - 1,
  };
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
