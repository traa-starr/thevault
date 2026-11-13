// Settings (overhaul wave 4): the setup bits in one quiet place, opened from the gear on Home. The laptop (its
// address, whether it answers), when this install's data began, and the build line. Hidden songs live here since calm
// part 1 (2026-11-12): the row opens their own screen (Hidden.tsx), which can play and restore. The address rules are laptopCore.ts; App.tsx owns the saved address, this screen only the box being typed in,
// so Back drops a half-typed address.
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Hidden from './Hidden';
import { hiddenRowCount, restoresOnTheirWay } from './hiddenCore';
import { Icon } from './Icon';
import { useOutbox } from './outbox';
import { logText } from './pressLog';
import { Tap } from './Tap';
import { C, coveredBelow, R, S, T } from './theme';

type Props = {
  /** The saved address, as typed. */
  address: string;
  /** What the laptop said last: "1,395 songs on the laptop", "Laptop not reachable", "Checking the laptop…". */
  line: string;
  /** That line is the laptop not answering: drawn in the warn colour, as everywhere. */
  off: boolean;
  /** When this install's data began (it changes only if the phone wiped the app). */
  stamp: string;
  /** The build and update line. */
  build: string;
  /** Something is in the mini player: the page ends above it. */
  mini: boolean;
  /** The laptop's address to ask, for the Hidden songs screen. */
  url: string;
  /** How many songs are hidden, or null while the laptop hasn't said. */
  hidden: number | null;
  /** Ask the laptop again (the Hidden count after a restore). */
  onRecount: () => void;
  /** Saves a new address; false when nothing was typed. */
  onSave: (typed: string) => boolean;
  onBack: () => void;
};

export default function Settings({ address, line, off, stamp, build, mini, url, hidden, onRecount, onSave, onBack }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(address);
  const [showHidden, setShowHidden] = useState(false);
  // restores still on their way come off the count at once; once the laptop has them all, it's asked again (catch 1)
  const onTheirWay = restoresOnTheirWay(useOutbox().pending);
  const was = useRef(onTheirWay);
  useEffect(() => {
    if (was.current && !onTheirWay) onRecount();
    was.current = onTheirWay;
  }, [onTheirWay]);
  if (showHidden) return <Hidden url={url} mini={mini} onBack={() => (setShowHidden(false), onRecount())} />;
  const save = () => {
    if (onSave(draft)) setEditing(false);
  };
  return (
    <ScrollView style={s.page} contentContainerStyle={[s.content, { paddingBottom: coveredBelow(true, mini) + 24 }]} keyboardShouldPersistTaps="handled">
      {/* the same header as Sort and Cards: Back, then the screen's name */}
      <View style={s.header}>
        <Tap style={s.back} radius={22} onPress={onBack} accessibilityLabel="Back">
          <Text style={s.backWord}>Back</Text>
        </Tap>
        <Text style={s.title}>Settings</Text>
      </View>

      <Text style={s.section}>Laptop</Text>
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.rowWord}>Address</Text>
          <Text style={s.rowValue} numberOfLines={1}>{address}</Text>
        </View>
        <View style={s.rowLine} />
        <View style={s.row}>
          <Text style={[s.rowNote, off && s.rowWarn]} numberOfLines={1}>{line || ' '}</Text>
        </View>
        <View style={s.rowLine} />
        {editing ? (
          <View style={s.edit}>
            <TextInput
              style={s.input}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={save}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              keyboardAppearance="dark"
              placeholder="Laptop address"
              placeholderTextColor={C.faint}
            />
            <View style={s.editButtons}>
              <Tap style={s.button} radius={22} onPress={() => (setDraft(address), setEditing(false))} accessibilityLabel="Cancel">
                <Text style={s.buttonQuiet}>Cancel</Text>
              </Tap>
              <Tap filled style={[s.button, s.buttonOn]} radius={22} onPress={save} accessibilityLabel="Save">
                <Text style={s.buttonOnWord}>Save</Text>
              </Tap>
            </View>
          </View>
        ) : (
          <Tap style={s.row} radius={R.cardTile} onPress={() => (setDraft(address), setEditing(true))} accessibilityLabel="Change laptop address">
            <Text style={s.rowWord}>Change laptop address</Text>
            <Arrow />
          </Tap>
        )}
      </View>

      <Text style={s.section}>Songs</Text>
      <View style={s.card}>
        <Tap style={s.row} radius={R.cardTile} onPress={() => setShowHidden(true)} accessibilityLabel="Hidden songs">
          <Text style={s.rowWord}>Hidden songs</Text>
          <View style={s.rowEnd}>
            <Text style={s.rowValue} numberOfLines={1}>{hiddenRowCount(hidden, onTheirWay)}</Text>
            <Arrow />
          </View>
        </Tap>
      </View>

      <Text style={s.section}>This phone</Text>
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.rowWord}>Data since</Text>
          <Text style={s.rowValue} numberOfLines={1}>{stamp}</Text>
        </View>
        <View style={s.rowLine} />
        <Tap style={s.row} radius={R.cardTile} onPress={showPressLog} accessibilityLabel="Lock-screen log">
          <Text style={s.rowWord}>Lock-screen log</Text>
          <Arrow />
        </Tap>
      </View>

      <Text style={s.build}>{build}</Text>
    </ScrollView>
  );
}

/** A row that opens something says so: a small grey arrow at its right (the Back chevron, turned round). */
function Arrow() {
  return (
    <View style={s.arrow} pointerEvents="none">
      <Icon name="back" size={14} color={C.faint} />
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
  page: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: S.statusBar + 6, paddingHorizontal: S.side },
  header: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { height: S.tap, minWidth: S.tap, justifyContent: 'center', marginLeft: -8 },
  backWord: { color: C.dim, fontSize: 15, paddingHorizontal: 8 },
  title: { ...T.title, flex: 1 },
  section: { ...T.meta, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: C.surface, borderRadius: R.cardTile, overflow: 'hidden' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14 },
  rowLine: { height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 14 },
  rowWord: { ...T.row },
  rowValue: { ...T.meta, fontSize: 15, flexShrink: 1, fontVariant: ['tabular-nums'] },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowNote: { ...T.meta, fontSize: 15, flex: 1 },
  rowWarn: { color: C.warnText },
  arrow: { transform: [{ rotate: '180deg' }] },
  edit: { padding: 14, gap: 12 },
  input: { height: 48, color: C.text, fontSize: 16, backgroundColor: C.raised, borderRadius: R.field, paddingHorizontal: 12 },
  editButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  button: { height: S.tap, minWidth: 88, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonQuiet: { color: C.dim, fontSize: 15 },
  buttonOn: { backgroundColor: C.white },
  buttonOnWord: { color: '#000', fontSize: 15, fontWeight: '700' },
  build: { color: C.faint, fontSize: 12, marginTop: 20, marginLeft: 4 },
});
