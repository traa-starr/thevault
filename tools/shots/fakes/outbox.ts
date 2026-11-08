// The outbox in memory: changes go in, nothing is ever sent.
import { FIX, notify, useFix } from './store';

let state: any = { pending: FIX.pending ?? [], refused: 0 };
let n = 0;
export const newId = () => `id-${++n}`;
const put = (pending: any[]) => {
  state = { ...state, pending };
  notify();
};
export function addTagChange(change: any) {
  const made = { id: newId(), ...change };
  put([...state.pending, made]);
  return made;
}
export function addChanges(list: any[]) {
  const made = list.map((c) => ({ id: newId(), kind: c.kind, data: { song_id: c.songId, value: c.value } }));
  put([...state.pending, ...made]);
  return made;
}
export const addChange = (kind: string, songId: string, value?: string) => addChanges([{ kind, songId, value }]);
export function takeBack(changes: any[]) {
  const ids = new Set(changes.map((c) => c.id));
  if (!state.pending.some((c: any) => ids.has(c.id))) return false;
  put(state.pending.filter((c: any) => !ids.has(c.id)));
  return true;
}
export const flush = async () => {};
export const useOutbox = () => useFix(() => state);
export const pendingNow = () => state.pending;
export const onSent = (_: any) => () => {};
export const onOutbox = (_: any) => () => {};
export const restoreChanges = () => 0;
export const startOutbox = () => {};
