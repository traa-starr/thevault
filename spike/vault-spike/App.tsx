// Throwaway spike: lists songs from the laptop, plays one, saves timestamped tags in memory.
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Button, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Song = { id: number; title: string; url: string };
type Tag = { song: string; at: number; line: string };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function App() {
  const [base, setBase] = useState('https://');
  const [songs, setSongs] = useState<Song[]>([]);
  const [current, setCurrent] = useState<Song | null>(null);
  const [error, setError] = useState('');
  const [line, setLine] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
  }, []);

  const connect = async () => {
    try {
      setError('');
      const r = await fetch(`${base.replace(/\/$/, '')}/api/songs`);
      setSongs(await r.json());
    } catch (e) {
      setError(String(e));
    }
  };

  const play = (s: Song) => {
    setCurrent(s);
    player.replace({ uri: `${base.replace(/\/$/, '')}${s.url}` });
    player.setActiveForLockScreen(true, { title: s.title, artist: 'The Vault' }, { showSeekBackward: true, showSeekForward: true });
    player.play();
  };

  const addTag = () => {
    if (!current || !line.trim()) return;
    setTags([{ song: current.title, at: status.currentTime, line: line.trim() }, ...tags]);
    setLine('');
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={s.page}>
      <Text style={s.h}>Vault spike</Text>
      <View style={s.row}>
        <TextInput style={[s.input, s.grow]} value={base} onChangeText={setBase} autoCapitalize="none" autoCorrect={false} placeholder="Laptop address" />
        <Button title="Connect" onPress={connect} />
      </View>
      {!!error && <Text style={s.err}>{error}</Text>}
      <FlatList
        style={s.grow}
        data={songs}
        keyExtractor={(x) => String(x.id)}
        renderItem={({ item }) => (
          <Pressable onPress={() => play(item)} style={s.song}>
            <Text style={current?.id === item.id ? s.on : undefined}>{item.title}</Text>
          </Pressable>
        )}
      />
      {current && (
        <View>
          <Text numberOfLines={1}>{current.title}</Text>
          <Text>{clock(status.currentTime)} / {clock(status.duration || 0)}</Text>
          <View style={s.row}>
            <Button title="-15" onPress={() => player.seekTo(Math.max(status.currentTime - 15, 0))} />
            <Button title={status.playing ? 'Pause' : 'Play'} onPress={() => (status.playing ? player.pause() : player.play())} />
            <Button title="+15" onPress={() => player.seekTo(status.currentTime + 15)} />
          </View>
          <View style={s.row}>
            <TextInput style={[s.input, s.grow]} value={line} onChangeText={setLine} placeholder="Type or dictate a line" onSubmitEditing={addTag} />
            <Button title="Tag" onPress={addTag} />
          </View>
          {tags.slice(0, 4).map((t, i) => (
            <Pressable key={i} onPress={() => t.song === current.title && player.seekTo(t.at)}>
              <Text>{clock(t.at)}  {t.line}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, padding: 16, paddingTop: 60, gap: 8, backgroundColor: '#fff' },
  h: { fontSize: 22, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 8 },
  song: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  on: { fontWeight: '700' },
  err: { color: '#b00' },
});
