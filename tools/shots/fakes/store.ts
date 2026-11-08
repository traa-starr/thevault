// A tiny store for the fakes: the fixture, a way to say it changed, and a hook.
import { useSyncExternalStore } from 'react';

export const FIX: any = (globalThis as any).FIX;
const listeners = new Set<() => void>();
export const notify = () => listeners.forEach((l) => l());
export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useFix = <T,>(pick: () => T) => useSyncExternalStore(subscribe, pick);
/** Any method not listed does nothing, so a screen can call what it likes. */
export const noop = (known: Record<string, any> = {}): any =>
  new Proxy(known, { get: (t, k) => (k in t ? t[k as string] : () => undefined) });
