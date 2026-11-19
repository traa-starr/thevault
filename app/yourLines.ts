// Your lines are the song's face (ROADMAP O.6, WORLD-MAP rule 2). Pure: fixed by app/yourLines.test.mjs.
// A song's line is its earliest tag with words; a words-free mark never counts. Home opens on one line, picked by a
// seed so a redraw never jumps to another.

type LineTag = { id?: string; tag_id?: string; song_id: string; at_sec: number; text: string };

const hasWords = (tag: LineTag) => typeof tag.text === 'string' && tag.text.trim().length > 0;
const tagId = (tag: LineTag) => tag.id ?? tag.tag_id;

/** The line a song shows as its second line: the matched tag's words when given and found, else its earliest line
 * with words; null when it has none. */
export function lineFor(songId: string, tags: readonly LineTag[], matchedTagId?: string | null): string | null {
  let first: LineTag | null = null;
  for (const tag of tags) {
    if (tag.song_id !== songId || !hasWords(tag)) continue;
    if (matchedTagId && tagId(tag) === matchedTagId) return tag.text.trim();
    if (!first || tag.at_sec < first.at_sec) first = tag;
  }
  return first ? first.text.trim() : null;
}

/** Every row's line in one pass (a family's versions count for its row): 1,395 rows never scan the tags each. */
export function linesForRows(tags: readonly LineTag[], rowOf: (id: string) => string): Map<string, string> {
  const best = new Map<string, LineTag>();
  for (const tag of tags) {
    if (!hasWords(tag)) continue;
    const row = rowOf(tag.song_id);
    const was = best.get(row);
    if (!was || tag.at_sec < was.at_sec) best.set(row, tag);
  }
  return new Map([...best].map(([row, tag]) => [row, tag.text.trim()]));
}

/** The line Home opens on, or null with no lines yet ("Tag your first line"). The same seed gives the same line. */
export function homeLine(tags: readonly LineTag[], seed: number): { song_id: string; text: string; at_sec: number } | null {
  const lines = tags
    .filter(hasWords)
    .sort((a, b) => (a.song_id < b.song_id ? -1 : a.song_id > b.song_id ? 1 : a.at_sec - b.at_sec));
  if (!lines.length) return null;
  const at = Math.abs(Math.floor(seed)) % lines.length;
  const { song_id, text, at_sec } = lines[at];
  return { song_id, text, at_sec };
}

/** A row's second line: the line, else "3 versions", else null (the row shows its date and the rest as today). */
export function secondLine(line: string | null | undefined, familySize: number): string | null {
  if (line) return line;
  if (familySize > 1) return `${familySize} versions`;
  return null;
}
