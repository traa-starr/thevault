// The overhaul's native pieces (ROADMAP O.5): Apple's own icons (SF Symbols) and Liquid Glass. They are only in builds
// made from 2026-11-10's rebuild on. The same app code reaches older builds by publish, so each piece is asked for
// carefully: missing, broken or not supported by this iOS, the answer is null and the app draws its own stand-in.
// Plain code with the two lookups passed in, so a test can play "old build" and "new build".

export type Lookup = {
  /** The native module by name, or null when this build doesn't have it. */
  find: (name: string) => unknown;
  /** The package's JS, only ever asked for once its native module was found. */
  load: (pkg: 'expo-symbols' | 'expo-glass-effect') => unknown;
};

/** Apple's icon view, or null. */
export function findSymbols<T>({ find, load }: Lookup): T | null {
  try {
    if (!find('SymbolModule')) return null;
    return ((load('expo-symbols') as { SymbolView?: T }).SymbolView ?? null) as T | null;
  } catch {
    return null;
  }
}

/** The Liquid Glass view, or null: needs the new build and iOS 26. */
export function findGlass<T>({ find, load }: Lookup): T | null {
  try {
    const native = find('ExpoGlassEffect') as { isLiquidGlassAvailable?: boolean } | null;
    if (!native || !native.isLiquidGlassAvailable) return null;
    return ((load('expo-glass-effect') as { GlassView?: T }).GlassView ?? null) as T | null;
  } catch {
    return null;
  }
}
