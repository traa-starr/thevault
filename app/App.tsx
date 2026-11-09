// One screen: the title and whether the laptop answers. The laptop's address is typed here and stays on the phone, never in the repo.
import { File, Paths } from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, AppState, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import buildInfo from './build-info.json';
import Library from './Library';
import { setHome } from './nav';
import { offline } from './offline';
import { flush, startOutbox } from './outbox';
import { tagStore } from './tagStore';
import { NowPlayingBar, PlayerSheet, UndoToast } from './Player';
import { player } from './playerStore';
import { session } from './sessionStore';
import Sort from './Sort';
import { VersionsLayer } from './Versions';
import { RestoreNotice, WaitingLine } from './Notices';
import { phoneBackup, survivalStamp, usePhoneBackup } from './phoneBackup';
import { compare } from './compareStore';
import { codeVersion, pointUpdatesAt, updateLine, useReloadOnUpdate } from './updates';
import { logText } from './pressLog';
import { timing } from './timings';

timing.setVersion(codeVersion(buildInfo.build)); // so the laptop judges only the newest code's timings

const PORT = 8787;
// Stamped by the GitHub build; "dev" when run from the laptop.
const buildLine = buildInfo.build === 'dev'
  ? 'Build: dev'
  : `Build ${buildInfo.build}${buildInfo.commit ? ` · ${buildInfo.commit}` : ''}${buildInfo.date ? ` · ${buildInfo.date}` : ''}`;
const TIMEOUT_MS = 5000;
const addressFile = () => new File(Paths.document, 'laptop-address.txt');

const loadAddress = () => {
  const file = addressFile();
  return file.exists ? file.textSync().trim() : '';
};

const saveAddress = (address: string) => {
  const file = addressFile();
  if (!file.exists) file.create();
  file.writeSync(address);
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
  const [inLibrary, setInLibrary] = useState(false);
  const [inSort, setInSort] = useState(false);
  const [stamp] = useState(survivalStamp);
  const { waiting: fresh } = usePhoneBackup();
  useReloadOnUpdate(() => player.position().wanted || compare.busy(), () => player.saveNow());

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

  setHome(
    () => {
      setInLibrary(false);
      setInSort(false);
    },
    () => {
      setInSort(false);
      setInLibrary(true);
    },
  );

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
      if (state !== 'active') {
        player.saveNow();
        if (address) timing.send(serverUrl(address)); // best effort: numbers only, never blocks anything
        offline.pause();
        phoneBackup.pause();
        return;
      }
      flush();
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

  // The player lives outside the screens, so changing screen never touches it.
  const withPlayer = (screen: ReactNode) => (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.screen}>
        {screen}
        <UndoToast />
      </View>
      <NowPlayingBar />
      <PlayerSheet />
      {address ? <VersionsLayer url={serverUrl(address)} /> : null}
    </View>
  );

  if (inSort) {
    return withPlayer(<Sort url={serverUrl(address)} onBack={() => setInSort(false)} />);
  }

  if (inLibrary) {
    return withPlayer(
      <Library
        url={serverUrl(address)}
        onBack={() => {
          setInLibrary(false);
          check();
        }}
      />,
    );
  }

  return withPlayer(
    <View style={s.page}>
      <Text style={s.title}>The Vault</Text>
      {fresh && !address ? <Text style={s.line}>Fresh install: type your laptop address, with the laptop on, and everything comes back.</Text> : null}
      <RestoreNotice />
      <WaitingLine />
      {editing ? (
        <>
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
            placeholderTextColor="#888"
          />
          <Pressable onPress={save}>
            <Text style={s.link}>Save</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={s.line}>{line}</Text>
          <Pressable onPress={() => setEditing(true)}>
            <Text style={s.link}>Change laptop address</Text>
          </Pressable>
        </>
      )}
      {address ? (
        <>
          <Pressable onPress={() => setInLibrary(true)}>
            <Text style={s.link}>Open library</Text>
          </Pressable>
          <Pressable onPress={() => setInSort(true)}>
            <Text style={s.link}>Sort</Text>
          </Pressable>
        </>
      ) : null}
      <Text style={s.stamp}>Data since {stamp}</Text>
      {/* hidden: a long press shows the lock-screen log (6.7) */}
      <Pressable style={s.build} onLongPress={showPressLog}>
        <Text style={s.buildText}>{updateLine(buildLine)}</Text>
      </Pressable>
    </View>,
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
  root: { flex: 1, backgroundColor: '#111' },
  screen: { flex: 1 },
  page: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 34, fontWeight: '700' },
  line: { color: '#ddd', fontSize: 18 },
  input: { alignSelf: 'stretch', color: '#fff', fontSize: 16, borderColor: '#555', borderWidth: 1, borderRadius: 8, padding: 12 },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8 },
  stamp: { color: '#666', fontSize: 12, position: 'absolute', bottom: 40 },
  build: { position: 'absolute', bottom: 20 },
  buildText: { color: '#666', fontSize: 12 },
});
