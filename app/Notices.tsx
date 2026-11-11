// Notices that must never be missed (board meeting 5): changes still waiting to reach the laptop, and what came
// back after a reinstall, shown at the top of Library, Sort and the home page. Library also says when the laptop server
// is out of date or didn't save the phone's backup.
// Look (overhaul wave 4, the whole-app pass): the warn colour of "Laptop not reachable", left-aligned like it; the
// Welcome back card on the app's own surface.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOffline } from './offline';
import { flush, useOutbox } from './outbox';
import { phoneBackup, usePhoneBackup } from './phoneBackup';
import { Tap } from './Tap';
import { C, R, S, T } from './theme';

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n.toLocaleString('en-US')} ${many}`);

/** "3 changes waiting to send": stays until the laptop has them all. Tap: try now. */
export function WaitingLine() {
  const { pending } = useOutbox();
  const { reachable } = useOffline();
  if (!pending.length) return null;
  // plays aren't choices of mine: counted apart, so a long listen with the laptop off doesn't read as 40 changes
  const played = pending.filter((change) => change.kind === 'play_add' && !change.data.end).length;
  const extra = pending.filter((change) => change.kind === 'play_add').length;
  const changes = pending.length - extra;
  // plays alone never raise the line: they're safe on the phone, and a line that came and went with every song would
  // push Home's rows down and up again (review 2026-11-10)
  if (!changes) return null;
  return (
    <Pressable onPress={() => flush()}>
      <Text style={s.waiting}>
        {[changes ? count(changes, 'change', 'changes') : '', played ? count(played, 'play', 'plays') : ''].filter(Boolean).join(' and ')} waiting to send{reachable === false ? ' · Laptop not reachable' : ''}
      </Text>
    </Pressable>
  );
}

/** The laptop runs older code than this app, or didn't save the phone's backup: one plain line. Tap: ask again. */
export function LaptopLine() {
  const { outOfDate, saveFailed } = usePhoneBackup();
  const { reachable } = useOffline();
  if (reachable === false || (!outOfDate && !saveFailed)) return null; // unreachable has its own line
  return (
    <Pressable onPress={phoneBackup.retry}>
      <Text style={s.waiting}>
        {outOfDate
          ? 'Laptop server is out of date: restart it (Stop the server, then Start the server). Tap to check again.'
          : "This phone's backup didn't save on the laptop. Tap to try again."}
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
      <Tap onPress={phoneBackup.dismiss} style={s.ok} radius={22}>
        <Text style={s.okText}>OK</Text>
      </Tap>
    </View>
  );
}

const s = StyleSheet.create({
  waiting: { color: C.warnText, fontSize: 14, paddingBottom: 8 },
  card: { backgroundColor: C.surface, borderRadius: R.cardTile, padding: 14, marginVertical: 6, gap: 6 },
  cardTitle: { ...T.heading },
  cardText: { ...T.meta, fontSize: 14, lineHeight: 20 },
  ok: { alignSelf: 'flex-end', minWidth: 72, height: S.tap, borderRadius: 22, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  okText: { color: C.text, fontSize: 15, fontWeight: '600' },
});
