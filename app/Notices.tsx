// Two notices that must never be missed (board meeting 5): changes still waiting to reach the laptop, and what came
// back after a reinstall. Shown at the top of Library, Sort and the home page.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOffline } from './offline';
import { flush, useOutbox } from './outbox';
import { phoneBackup, usePhoneBackup } from './phoneBackup';

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n.toLocaleString('en-US')} ${many}`);

/** "3 changes waiting to send": stays until the laptop has them all. Tap: try now. */
export function WaitingLine() {
  const { pending } = useOutbox();
  const { reachable } = useOffline();
  if (!pending.length) return null;
  return (
    <Pressable onPress={() => flush()}>
      <Text style={s.waiting}>
        {count(pending.length, 'change', 'changes')} waiting to send{reachable === false ? ' · Laptop not reachable' : ''}
      </Text>
    </Pressable>
  );
}

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : ` (backed up ${d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })})`;
};

/** Fresh install: says it's waiting for the laptop, then what came back, once, until OK. */
export function RestoreNotice() {
  const { waiting, restored } = usePhoneBackup();
  const { reachable } = useOffline();
  if (waiting) {
    return (
      <Text style={s.waiting}>
        {reachable === false ? 'Fresh install: connect to your laptop to get everything back' : 'Fresh install: getting your things back from the laptop…'}
      </Text>
    );
  }
  if (!restored) return null;
  const back = [
    restored.notSure ? `Not sure pile (${count(restored.notSure, 'song', 'songs')})` : '',
    restored.changes ? `${count(restored.changes, 'unsent change', 'unsent changes')}, sending now` : '',
    restored.lastSong ? 'last song and spot' : '',
    restored.settings ? 'player settings' : '',
  ].filter(Boolean);
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Welcome back</Text>
      <Text style={s.cardText}>
        Songs, Mine, groups and Hidden come from the laptop. {back.length ? `Also back${when(restored.savedAt)}: ${back.join(', ')}.` : 'Nothing else was waiting on the old install.'}{' '}
        Songs save to this phone again from 0.
      </Text>
      <Pressable onPress={phoneBackup.dismiss} style={s.ok}>
        <Text style={s.okText}>OK</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  waiting: { color: '#e8b04a', fontSize: 14, textAlign: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  card: { backgroundColor: '#222', borderRadius: 10, padding: 14, marginHorizontal: 12, marginVertical: 6, gap: 6 },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cardText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  ok: { alignSelf: 'flex-end', minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  okText: { color: '#8ab4f8', fontSize: 16, fontWeight: '600' },
});
