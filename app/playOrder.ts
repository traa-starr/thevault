// Which song comes next, as plain data so it can be tested without a phone. Songs are positions in the list.
export type Order = { current: number; shuffle: boolean; played: number[]; at: number };

export const startOrder = (current: number, shuffle: boolean): Order => ({ current, shuffle, played: [current], at: 0 });

export const setShuffle = (order: Order, shuffle: boolean): Order => startOrder(order.current, shuffle);

/** The next song, or null when shuffle has played the whole list. List order wraps round to the top. */
export function nextInOrder(order: Order, count: number, random: () => number = Math.random): Order | null {
  if (!order.shuffle) return startOrder((order.current + 1) % count, false);
  const at = order.at + 1;
  if (at < order.played.length) return { ...order, current: order.played[at], at };
  const seen = new Set(order.played);
  const left = Array.from({ length: count }, (_, i) => i).filter((i) => !seen.has(i));
  if (!left.length) return null;
  const current = left[Math.floor(random() * left.length)];
  return { ...order, current, played: [...order.played, current], at };
}

/** The song before, or null when shuffle is back at the first one it played. List order wraps round to the bottom. */
export function previousInOrder(order: Order, count: number): Order | null {
  if (!order.shuffle) return startOrder((order.current - 1 + count) % count, false);
  if (order.at === 0) return null;
  const at = order.at - 1;
  return { ...order, current: order.played[at], at };
}
