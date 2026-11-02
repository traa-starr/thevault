// One screen: the title and whether the laptop answers. The laptop's address is typed here and stays on the phone, never in the repo.
import { File, Paths } from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Library from './Library';
import { flush, startOutbox } from './outbox';
import { NowPlayingBar, PlayerSheet, UndoToast } from './Player';
import Prototype from './Prototype';

const PORT = 8787;
const TIMEOUT_MS = 5000;
const addressFile = () => new File(Paths.document, 'laptop-address.txt');

// Written once and never changed: if this date changes, the phone wiped the app's data (ROADMAP 1.18).
const survivalStamp = () => {
  const file = new File(Paths.document, 'survival-stamp.txt');
  if (file.exists) return file.textSync().trim();
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
  file.create();
  file.writeSync(stamp);
  return stamp;
};

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
    const r = await fetch(`${serverUrl(address)}/songs`, { signal: abort.signal });
    if (!r.ok) throw new Error(`Server said ${r.status}`);
    const data: { songs: unknown[] } = await r.json();
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
  const [inPrototype, setInPrototype] = useState(false);
  const [stamp] = useState(survivalStamp);

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

  useEffect(() => {
    if (address) startOutbox(serverUrl(address));
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      flush();
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
    </View>
  );

  if (inPrototype) {
    return withPlayer(<Prototype url={address ? serverUrl(address) : ''} onBack={() => setInPrototype(false)} />);
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
        <Pressable onPress={() => setInLibrary(true)}>
          <Text style={s.link}>Open library</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => setInPrototype(true)}>
        <Text style={s.link}>Sorting prototype</Text>
      </Pressable>
      <Text style={s.stamp}>Data since {stamp}</Text>
    </View>,
  );
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
});
