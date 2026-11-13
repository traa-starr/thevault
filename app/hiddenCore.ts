// What the Hidden songs screen shows (calm part 1, 2026-11-12), as plain code a test can run: the folder chips, what a
// search and a folder keep, the count line, and the words when nothing is left. No React Native here.
// Search is plain text, any case, in the title or the folder: "(" or "[" are just letters.

export type HiddenSong = { id: string; title: string; where: string; date: string | null; folder?: string };
export type Folder = { name: string; count: number };

const fold = (text: string) => text.toLocaleLowerCase('en-US');
const number = (n: number) => n.toLocaleString('en-US');

/** Every folder a hidden song sits in, with how many: biggest first, then A to Z. */
export function hiddenFolders(songs: readonly HiddenSong[]): Folder[] {
  const counts = new Map<string, number>();
  for (const song of songs) {
    const name = song.folder || 'Loose files';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** The songs a search and a folder keep, in the list's own order. An empty search keeps everything. */
export function hiddenShown<S extends HiddenSong>(songs: readonly S[], search: string, folder: string | null): S[] {
  const words = fold(search.trim());
  return songs.filter(
    (song) =>
      (folder === null || (song.folder || 'Loose files') === folder) &&
      // the folder as its chip says it: a song with no folder is found by "loose files" (review catch 7)
      (!words || fold(song.title).includes(words) || fold(song.folder || 'Loose files').includes(words)),
  );
}

/** The line above the list: "815 hidden songs", "1 hidden song", or "12 of 815" while a search or folder narrows it.
 * `total` and `shown` count only songs still hidden (a restored row stays drawn, but no longer counts). */
export function hiddenCountLine(shown: number, total: number, narrowed: boolean): string {
  if (narrowed) return `${number(shown)} of ${number(total)}`;
  return total === 1 ? '1 hidden song' : `${number(total)} hidden songs`;
}

/** The words when the list is empty: nothing hidden at all, or nothing matches. */
export function hiddenEmptyLine(total: number, search: string, folder: string | null): string {
  if (!total && !search.trim() && folder === null) return 'Nothing hidden';
  const what = search.trim() ? ` match "${search.trim()}"` : '';
  return `No hidden songs${what}${folder !== null ? ` in ${folder}` : ''}`;
}

/** Settings' row: the count after the words, or nothing while it isn't known (never 0, never NaN). Restores still on
 * their way to the laptop are taken off at once (review catch 1): the laptop's count only drops once it has them. */
export function hiddenRowCount(hidden: number | null | undefined, onTheirWay = 0): string {
  return typeof hidden === 'number' && Number.isFinite(hidden) ? number(Math.max(0, hidden - onTheirWay)) : '';
}

type MineChangeLike = { id: string; kind: string; data: { song_id?: string } };

/** How many songs have a restore as their latest change still waiting in the outbox. */
export function restoresOnTheirWay(pending: readonly MineChangeLike[]): number {
  const latest = new Map<string, string>();
  for (const change of pending) if ((change.kind === 'mine_restore' || change.kind === 'mine_set') && change.data.song_id) latest.set(change.data.song_id, change.kind);
  return [...latest.values()].filter((kind) => kind === 'mine_restore').length;
}

/** Restores the laptop refused (review catch 2): the change left the outbox but the laptop never took it. Those rows
 * get their Restore back. `restored`: song id to the change id sent for it. */
export function refusedRestores(restored: ReadonlyMap<string, string>, pendingIds: ReadonlySet<string>, taken: ReadonlySet<string>): string[] {
  return [...restored].filter(([, change]) => !pendingIds.has(change) && !taken.has(change)).map(([song]) => song);
}
