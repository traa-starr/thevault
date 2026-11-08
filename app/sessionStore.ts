// The tagging session (BLUEPRINT "Phase 2: tagging", ROADMAP 2.2, 2.5): the full player in session mode. One lap of Mine
// songs that can play now, untagged ones 3x as likely to come next, handed to the player as a plain list, so Next from the
// button, the lock screen or a song's end all walk it. Cards start about 30% in. Not mine marks the song and the music
// plays on until Next. Close: the sheet closes onto the screen I came from, the same song still playing.
import { useMemo, useSyncExternalStore } from 'react';
import { loadSongList, offline } from './offline';
import { addChange, pendingNow, takeBack } from './outbox';
import { onPlayerChange, player, type PlayerSong } from './playerStore';
import { sessionCount, sessionLap, sessionPool, withPending, type Change } from './playOrder';
import { allTagsNow, say, useAllTags } from './tagStore';
import { isVersion, members } from './versionStore';

const START_AT = 0.3;

type SessionSong = PlayerSong & { where: string };
type Session = { on: boolean; pool: string[]; out: string[] };
let state: Session = { on: false, pool: [], out: [] };
let startedFor = ''; // the song already moved to 30%, so a later duration update doesn't move it again
const listeners = new Set<() => void>();
const update = (next: Partial<Session>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

// each new song in the session starts about 30% in, once it says how long it is; the sheet closing ends the session
onPlayerChange(() => {
  if (!state.on) return;
  const p = player.now();
  if (p.sheet === 'none') return update({ on: false });
  if (p.song && p.duration > 0 && startedFor !== p.song.id) {
    startedFor = p.song.id;
    if (p.time < p.duration * START_AT) player.seek(p.duration * START_AT);
  }
});

const taggedSongs = () => new Set(allTagsNow().map((tag) => tag.song_id));

export const session = {
  /** From Library's "Tag songs" or the Sort tab. Songs: the last list the laptop sent, with my waiting choices on top. */
  start(url: string) {
    const saved = loadSongList<SessionSong>();
    if (!saved) return player.showMessage('Open Library once first, so the phone knows your songs.');
    const songs = withPending(saved.songs, pendingNow() as Change[]);
    const laptopOff = offline.reachable() === false;
    const pool = sessionPool(songs, (song) => offline.has(song.id) || (!laptopOff && song.where === 'laptop'), isVersion);
    if (!pool.length) return player.showMessage('No Mine songs can play right now.');
    const lap = sessionLap(pool, taggedSongs());
    const byId = new Map(songs.map((song) => [song.id, song]));
    startedFor = '';
    // the sheet opens first: a closed sheet ends the session, and the new list's first update would see it closed
    player.open('player');
    update({ on: true, pool, out: [] });
    player.playList(url, lap.map((id) => byId.get(id)!), lap[0], false, 'mine');
  },

  /** Close: back to where I came from, the same song playing. */
  close() {
    update({ on: false });
    player.open('none');
  },

  /** Not mine on this card: marked, out of the lap and the count, still playing until Next. "Not mine · Undo" for 6 s. */
  notMine() {
    const song = player.now().song;
    if (!song || state.out.includes(song.id)) return;
    if (members(song.id).length > 1) return player.showMessage('This song has versions: use Versions to take it out first.');
    const mark = player.markOf(song); // my latest call, this run included
    const wasManual = mark.mine === 'mine' && mark.sorted;
    const change = addChange('mine_set', song.id, 'not mine');
    player.setMark(song.id, { mine: 'not mine', sorted: true });
    player.setOut(song.id, true);
    update({ out: [...state.out, song.id] });
    say({
      text: 'Not mine: ',
      bold: song.title,
      undo: () => {
        // still unsent: taken back. Sent: Mine again if it was my own call, else back to the folder's guess
        if (!takeBack(change)) addChange(wasManual ? 'mine_set' : 'mine_restore', song.id, wasManual ? 'mine' : undefined);
        player.setMark(song.id, null);
        player.setOut(song.id, false);
        update({ out: state.out.filter((id) => id !== song.id) });
        if (state.on && player.now().song?.id !== song.id) player.jump(song.id); // after Next: back on that song
      },
    });
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useSession = () => useSyncExternalStore(subscribe, () => state);

/** "N of M tagged" for the session, live as tags are made, changed or deleted. */
export function useSessionCount() {
  const { pool, out } = useSession();
  const tags = useAllTags();
  return useMemo(() => sessionCount(pool, out, new Set(tags.map((tag) => tag.song_id))), [pool, out, tags]);
}
