// The app's frame (overhaul wave 1): the tab screens (Home, Library, and wave 2's Search) with Sort opened over them, then the tab bar, the
// mini player and the player sheet above, as siblings, so changing screen never touches the player. Home and Library
// both stay drawn (the one not showing is only hidden): a tab change never loads the songs again.
// The laptop's address is typed on Home and stays on the phone, never in the repo.
import { File, Paths } from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import buildInfo from './build-info.json';
import Library from './Library';
import { keychain } from './keychain';
import { closeSort, openSearch, placeNow, usePlace } from './nav';
import { TabBar } from './Frame';
import Home from './Home';
import SearchScreen from './SearchScreen';
import { C, coveredBelow, T } from './theme';
import { searchFromLink } from './search';
import { offline } from './offline';
import { pauseOutbox, startOutbox } from './outbox';
import { tagStore } from './tagStore';
import { MiniPlayer, PlayerSheet, UndoToast } from './Player';
import { player, usePlayerPick } from './playerStore';
import { session } from './sessionStore';
import Sort from './Sort';
import { VersionsLayer } from './Versions';
import { phoneBackup, survivalStamp, usePhoneBackup } from './phoneBackup';
import { compare } from './compareStore';
import { codeVersion, pointUpdatesAt, updateLine, useReloadOnUpdate } from './updates';
import { logText } from './pressLog';
import { meter } from './meter';
import { hang } from './hangWatch';
import { timing } from './timings';

// every network call counts toward the energy numbers (how many a minute while a song plays)
const plainFetch = globalThis.fetch;
globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
  meter.count('net');
  return plainFetch(...args);
}) as typeof fetch;

timing.setVersion(codeVersion(buildInfo.build)); // so the laptop judges only the newest code's timings

const PORT = 8787;
// Stamped by the GitHub build; "dev" when run from the laptop.
const buildLine = buildInfo.build === 'dev'
  ? 'Build: dev'
  : `Build ${buildInfo.build}${buildInfo.commit ? ` · ${buildInfo.commit}` : ''}${buildInfo.date ? ` · ${buildInfo.date}` : ''}`;
const TIMEOUT_MS = 5000;
const addressFile = () => new File(Paths.document, 'laptop-address.txt');

const ADDRESS_KEY = 'laptop-address';

const writeAddressFile = (address: string) => {
  const file = addressFile();
  if (!file.exists) file.create();
  file.writeSync(address);
};

// The address lives in a file, and in the Keychain too: a reinstall wipes the file, the Keychain gives it back.
const loadAddress = () => {
  const file = addressFile();
  const onFile = file.exists ? file.textSync().trim() : '';
  if (onFile) {
    keychain.keep(ADDRESS_KEY, onFile);
    return onFile;
  }
  const kept = keychain.read(ADDRESS_KEY);
  if (kept) {
    try {
      writeAddressFile(kept);
    } catch {
      // a full phone: the Keychain still has it next time
    }
  }
  return kept;
};

const saveAddress = (address: string) => {
  writeAddressFile(address);
  keychain.keep(ADDRESS_KEY, address);
};

const serverUrl = (address: string) => {
  const withScheme = /^https?:\/\//i.test(address) ? address : `http://${address}`;
  const url = withScheme.replace(/\/+$/, '');
  return /:\d+$/.test(url) ? url : `${url}:${PORT}`;
};

async function songCount(address: string) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    // just the count; a laptop too old to know /status sends the whole list to count instead
    const r = await fetch(`${serverUrl(address)}/status`, { signal: abort.signal });
    if (r.ok) return ((await r.json()) as { songs: number }).songs;
    if (r.status !== 404) throw new Error(`Server said ${r.status}`);
    const old = await fetch(`${serverUrl(address)}/songs`, { signal: abort.signal });
    if (!old.ok) throw new Error(`Server said ${old.status}`);
    const data: { songs: unknown[] } = await old.json();
    return data.songs.length;
  } finally {
    clearTimeout(timer);
  }
}

export default function App() {
  const [address, setAddress] = useState(loadAddress);
  const [draft, setDraft] = useState(address);
  const [editing, setEditing] = useState(!address);
  const [line, setLine] = useState('');
  const { tab, sort } = usePlace();
  const { song } = usePlayerPick('song');
  const [stamp] = useState(survivalStamp);
  const { waiting: fresh } = usePhoneBackup();
  // a reload into new app code is not a hang: the watch stands down first
  useReloadOnUpdate(() => player.position().wanted || compare.busy(), () => (hang.setActive(false), player.saveNow()));

  const check = useCallback(async () => {
    if (!address) return;
    setLine('Checking the laptop…');
    try {
      const count = await songCount(address);
      setLine(`${count.toLocaleString('en-US')} songs on the laptop`);
    } catch {
      setLine('Laptop not reachable');
    }
  }, [address]);

  // the hang watch names the screen in fixed words: which screen, and whether the player or Queue is over it
  useEffect(() => {
    hang.start(() => {
      const { sheet } = player.now();
      const at = placeNow();
      const where = at.sort ? 'Sort' : at.tab === 'library' ? 'Library' : at.tab === 'search' ? 'Search' : 'Home';
      return sheet === 'none' ? where : `${where}+${sheet}`;
    }, AppState.currentState === 'active');
    return () => hang.setActive(false);
  }, []);

  // a lock-screen Shortcut's link (thevault://search): straight to the search screen, from a cold start or from the back
  const addressNow = useRef(address);
  addressNow.current = address;
  useEffect(() => {
    const go = (link: string | null | undefined) => {
      const ask = searchFromLink(link);
      if (ask && addressNow.current) openSearch(ask.q);
    };
    Linking.getInitialURL().then(go).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => go(url));
    return () => sub.remove();
  }, []);

  // the last song back in the bar, paused where it was, as soon as the app opens
  useEffect(() => {
    if (address) player.restore(serverUrl(address));
    if (address) session.restore(); // the tagging session, if the player came back on its lap
    if (address) pointUpdatesAt(serverUrl(address));
  }, [address]);

  useEffect(() => {
    if (address) startOutbox(serverUrl(address));
    if (address) offline.start(serverUrl(address));
    if (address) phoneBackup.start(serverUrl(address));
    if (address) tagStore.start(serverUrl(address));
    check();
    const sub = AppState.addEventListener('change', (state) => {
      // 'inactive' is a passing state (a call banner, the app switcher): only a real move to the back counts as away
      // (the spot is still saved: a swipe-away from the app switcher kills the app with no other warning)
      hang.setActive(state === 'active'); // only time on screen is watched
      if (state === 'inactive') return player.saveNow();
      player.setOpen(state === 'active');
      if (state !== 'active') {
        pauseOutbox(true);
        player.saveNow();
        if (address) timing.send(serverUrl(address)); // best effort: numbers only, never blocks anything
        offline.pause();
        phoneBackup.pause();
        return;
      }
      pauseOutbox(false);
      if (address) timing.send(serverUrl(address));
      if (address) offline.start(serverUrl(address));
      if (address) phoneBackup.start(serverUrl(address));
      if (address) tagStore.start(serverUrl(address));
      check();
    });
    return () => sub.remove();
  }, [check]);

  const save = () => {
    const next = draft.trim();
    if (!next) return;
    saveAddress(next);
    setAddress(next);
    setEditing(false);
  };

  // back on Home: the laptop's line is asked again (the old Back from Library did this)
  useEffect(() => {
    if (tab === 'home' && !sort) check();
  }, [tab, sort]);

  const url = address ? serverUrl(address) : '';
  // first open (or Change laptop address): the box to type it in
  const addressBox = (
    <View style={s.setup}>
      {fresh && !address ? <Text style={s.line}>Fresh install: type your laptop address, with the laptop on, and everything comes back.</Text> : null}
      <TextInput
        style={s.input}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={save}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
        placeholder="Laptop address"
        placeholderTextColor={C.faint}
      />
      <Pressable onPress={save}>
        <Text style={s.link}>Save</Text>
      </Pressable>
    </View>
  );
  // the bottom of Home: the laptop, and the quiet build line (a long press shows the lock-screen log, 6.7)
  const about = (
    <View style={s.about}>
      {address && editing ? addressBox : address ? (
        <>
          <Text style={s.line}>{line}</Text>
          <Pressable onPress={() => setEditing(true)}>
            <Text style={s.link}>Change laptop address</Text>
          </Pressable>
        </>
      ) : null}
      <Text style={s.small}>Data since {stamp}</Text>
      <Pressable onLongPress={showPressLog}>
        <Text style={s.small}>{updateLine(buildLine)}</Text>
      </Pressable>
    </View>
  );

  // Only the tab content swaps. The tab bar, mini player, player sheet and Versions sit above it and never reload.
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.screen}>
        <View style={[s.screen, (tab !== 'home' || sort) && s.away]}>
          <Home url={url} setup={addressBox} about={about} showing={tab === 'home' && !sort} />
        </View>
        {/* Library: drawn once there's a laptop to ask, then kept, so its songs load once. Its list ends above the
            tab bar and the mini player */}
        {url ? (
          <View style={[s.screen, { paddingBottom: coveredBelow(true, !!song) }, (tab !== 'library' || sort) && s.away]}>
            <Library url={url} />
          </View>
        ) : null}
        {/* Search: its own screen under the same tab bar, kept drawn like the other two. Its list makes its own room
            above the keyboard, or above the tab bar and mini player */}
        {url ? (
          <View style={[s.screen, (tab !== 'search' || sort) && s.away]}>
            <SearchScreen url={url} showing={tab === 'search' && !sort} />
          </View>
        ) : null}
        {sort && url ? (
          <View style={[s.screen, { paddingBottom: coveredBelow(false, !!song) }]}>
            <Sort url={url} onBack={closeSort} />
          </View>
        ) : null}
        <UndoToast />
      </View>
      {/* no tabs until there's a laptop to show songs from: Library isn't drawn yet */}
      {url ? <TabBar /> : null}
      <MiniPlayer />
      <PlayerSheet />
      {url ? <VersionsLayer url={url} /> : null}
    </View>
  );
}

/** The lock-screen log: the last lines here, all of it through the share sheet (Copy is there). */
function showPressLog() {
  const text = logText();
  const tail = text.split('\n').slice(-20).join('\n');
  Alert.alert('Lock-screen log', tail, [
    { text: 'Close', style: 'cancel' },
    { text: 'Copy all', onPress: () => Share.share({ message: text }).catch(() => {}) },
  ]);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.bg },
  away: { display: 'none' },
  setup: { gap: 12, marginTop: 8 },
  about: { marginTop: 28, gap: 8, alignItems: 'flex-start' },
  line: { ...T.meta, fontSize: 15 },
  input: { alignSelf: 'stretch', color: C.text, fontSize: 16, backgroundColor: C.raised, borderRadius: 12, padding: 12 },
  link: { color: C.text, fontSize: 15, paddingVertical: 10 },
  small: { color: C.faint, fontSize: 12 },
});
