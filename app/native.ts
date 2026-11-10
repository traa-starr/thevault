// The native pieces as this build has them (rules and reasons: nativePieces.ts). Looked up once.
import { requireOptionalNativeModule } from 'expo';
import type { ComponentType } from 'react';
import { findGlass, findSymbols, type Lookup } from './nativePieces';

const lookup: Lookup = {
  find: (name) => requireOptionalNativeModule(name),
  // asked for only here, inside findX's try: in a build without the piece nothing may throw
  load: (pkg) => (pkg === 'expo-symbols' ? require('expo-symbols') : require('expo-glass-effect')),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyView = ComponentType<any>;
export const SymbolView = findSymbols<AnyView>(lookup);
export const GlassView = findGlass<AnyView>(lookup);
