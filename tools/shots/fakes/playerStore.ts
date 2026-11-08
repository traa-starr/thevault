// The player as the fixture says it is: no sound.
import { FIX, notify, noop, useFix } from './store';

export type PlayerSong = { id: string; title: string; mine: string; sorted: boolean };
export type Pool = 'unsorted' | 'mine';
export type Sheet = 'none' | 'player' | 'queue';
export const NOT_HERE = "Not on this phone, and the laptop isn't reachable";
const base = {
  order: null, song: null, sorting: false, wanted: true, time: 0, duration: 0, note: '', trouble: '', undo: null,
  message: '', sheet: 'player', queueFrom: 'none', timeLeft: false, buttonsHidden: false, marks: {}, pool: 'mine',
  comparing: false, session: null,
};
let state: any = { ...base, ...(FIX.player ?? {}) };
const out = new Set<string>();
const set = (next: any) => {
  state = { ...state, ...next };
  notify();
};
export const usePlayer = () => useFix(() => state);
export const onPlayerChange = (_: () => void) => () => {};
export const player = noop({
  positionNow: () => state.time,
  isMine: () => state.song?.mine === 'mine',
  isOut: () => out.has(state.song?.id),
  setOut: (id: string, on: boolean) => {
    if (on) out.add(id);
    else out.delete(id);
    notify();
  },
  now: () => state,
  upNext: () => [],
  titleOf: (id: string) => id,
  url: () => '',
  markOf: (song: PlayerSong) => ({ mine: song.mine, sorted: song.sorted }),
  seek: async (at: number) => set({ time: at }),
  setShuffleOn: (on: boolean, pool: Pool) => set({ order: { ...(state.order ?? {}), shuffle: on }, pool }),
  set,
});
