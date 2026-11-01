// One screen: the title and whether the laptop answers. The laptop's address is typed here and stays on the phone, never in the repo.
import { File, Paths } from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Player from './Player';

const PORT = 8787;
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
  const [inPlayer, setInPlayer] = useState(false);

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
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
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

  if (inPlayer) {
    return (
      <>
        <StatusBar style="light" />
        <Player onBack={() => setInPlayer(false)} />
      </>
    );
  }

  return (
    <View style={s.page}>
      <StatusBar style="light" />
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
      <Pressable onPress={() => setInPlayer(true)}>
        <Text style={s.link}>Open player</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 34, fontWeight: '700' },
  line: { color: '#ddd', fontSize: 18 },
  input: { alignSelf: 'stretch', color: '#fff', fontSize: 16, borderColor: '#555', borderWidth: 1, borderRadius: 8, padding: 12 },
  link: { color: '#8ab4f8', fontSize: 15, padding: 8 },
});
