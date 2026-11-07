// Over-the-air updates from the laptop (DECISIONS 2026-11-07). The build holds a harmless placeholder address; the real
// one is the laptop address typed on the phone, so no laptop name ever goes in the repo. The phone remembers it, and it
// counts from the next time the app is opened. On open, the phone asks the laptop for newer app code (expo-updates does
// that by itself); when one arrives and nothing is playing, the app reloads into it at once. Otherwise it's used next open.
import { File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';

const RELOAD_WINDOW_MS = 60_000; // only reload this soon after opening, before I'm busy with something
const openedAt = Date.now();
const urlFile = () => new File(Paths.document, 'update-url.txt');

/** Point updates at the laptop the phone already talks to. Only writes when the address changed. */
export function pointUpdatesAt(serverUrl: string) {
  if (!Updates.isEnabled || !serverUrl) return;
  const wanted = `${serverUrl}/update`;
  const file = urlFile();
  try {
    if (file.exists && file.textSync().trim() === wanted) return;
    Updates.setUpdateURLAndRequestHeadersOverride({ updateUrl: wanted, requestHeaders: {} });
    if (!file.exists) file.create();
    file.writeSync(wanted);
  } catch {
    // not available (dev run): the build keeps its own address
  }
}

/** Reload into newly arrived app code right after opening, if nothing is playing. `busy` says whether I'm listening. */
export function useReloadOnUpdate(busy: () => boolean, beforeReload: () => void) {
  const { isUpdatePending } = Updates.useUpdates();
  useEffect(() => {
    if (!isUpdatePending || busy() || Date.now() - openedAt > RELOAD_WINDOW_MS) return;
    beforeReload();
    Updates.reloadAsync().catch(() => {});
  }, [isUpdatePending]);
}

/** The bottom line on the home screen: which app code is running. */
export function updateLine(buildLine: string) {
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return buildLine;
  const d = Updates.createdAt;
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `Update ${day}, ${time}`;
}
