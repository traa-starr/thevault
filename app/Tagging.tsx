// Tagging in the player (BLUEPRINT "Phase 2: tagging"): the reserved line under the seek bar (the typing field, or a
// short note with Undo), the Tag here button, and the song's tag list. Fixed heights throughout, so nothing moves.
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { player } from './playerStore';
import { clock, clockExact, MAX_TEXT, say, tagLine, useTagLine, useTags } from './tagStore';
import type { ShownTag } from './playOrder';

const ACCENT = '#f5b041'; // the mockup's amber, a placeholder (DECISIONS 2026-11-07)
const NUDGE = 0.5;
export const LINE_HEIGHT = 52;
const ROW_HEIGHT = 48;

/** The reserved line: the field while a tag is being typed, else the last note, else empty. Always the same height. */
export function ReservedLine({ songId, duration, fallback }: { songId: string | null | undefined; duration: number; fallback?: string }) {
  const { draft, note } = useTagLine();
  if (draft) {
    return (
      <View style={s.line}>
        <View style={s.at}>
          <Pressable style={s.nudge} onPress={() => tagLine.nudge(-NUDGE, duration)} accessibilityLabel="Earlier">
            <Text style={s.nudgeText}>‹</Text>
          </Pressable>
          <Text style={s.atText}>{clockExact(draft.at)}</Text>
          <Pressable style={s.nudge} onPress={() => tagLine.nudge(NUDGE, duration)} accessibilityLabel="Later">
            <Text style={s.nudgeText}>›</Text>
          </Pressable>
        </View>
        <TextInput
          autoFocus // the keyboard is up at once, and again when the draft comes back after a kill
          style={s.field}
          defaultValue={draft.text}
          onChangeText={tagLine.type}
          onSubmitEditing={() => tagLine.finish(songId)}
          placeholder={draft.songId === songId ? 'A line you’ll remember' : `On ${draft.songTitle}`}
          placeholderTextColor="#636366"
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={MAX_TEXT}
          keyboardAppearance="dark"
        />
        <Pressable style={s.act} onPress={tagLine.cancel}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={s.line}>
      <Text style={s.msg} numberOfLines={1}>
        {note ? note.text : fallback || ''}
        {note?.bold ? <Text style={s.bold}>{note.bold}</Text> : null}
      </Text>
      {note?.undo ? (
        <Pressable style={s.act} onPress={tagLine.undo}>
          <Text style={s.undoText}>Undo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Tag here, in the thumb zone. The second is read from the player at the tap and frozen; the music keeps playing. */
export function TagHere({ songId, title }: { songId: string | null | undefined; title: string }) {
  const { draft } = useTagLine();
  if (!songId) return null;
  return (
    <Pressable style={s.tagHere} onPress={() => tagLine.start(songId, title, player.positionNow())} hitSlop={8}>
      <Text style={[s.tagHereText, draft && s.tagHereBusy]}>{draft ? `Tagging at ${clock(draft.at)}` : 'Tag here'}</Text>
    </Pressable>
  );
}

/** Jump to a tag and show its words on the reserved line. */
export function jumpToTag(tag: ShownTag) {
  player.seek(tag.at_sec);
  say({ text: '', bold: `${clock(tag.at_sec)}  ${tag.text || 'no words yet'}` });
}

/** The tag playing now: the last one at or before this second. */
export const playingTag = (tags: ShownTag[], time: number) => {
  let id: string | null = null;
  for (const tag of tags) if (tag.at_sec <= time + 0.05) id = tag.id;
  return id;
};

/** The song's tags in time order. Tap a row to jump; the playing row is marked; rows never reorder. */
export function TagList({ songId, time }: { songId: string | null | undefined; time: number }) {
  const tags = useTags(songId);
  const now = playingTag(tags, time);
  if (!songId) return null;
  return (
    <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
      {tags.length ? (
        tags.map((tag) => (
          <Pressable key={tag.id} style={s.row} onPress={() => jumpToTag(tag)}>
            <Text style={[s.rowAt, tag.id === now && s.rowNow]}>{clock(tag.at_sec)}</Text>
            <Text style={[s.rowWords, !tag.text && s.rowEmpty, tag.id === now && s.rowNow]} numberOfLines={1}>
              {tag.text || 'no words yet'}
            </Text>
            <Text style={s.rowSync}>{tag.onPhone ? 'Saved on phone' : 'On laptop'}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={s.empty}>No tags yet. Tap Tag here at a line you remember.</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  line: { height: LINE_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10 },
  msg: { flex: 1, color: '#8e8e93', fontSize: 15 },
  bold: { color: '#fff', fontWeight: '500' },
  act: { height: 44, justifyContent: 'center', paddingHorizontal: 4 },
  undoText: { color: ACCENT, fontSize: 15 },
  cancelText: { color: '#8e8e93', fontSize: 15 },
  at: { flexDirection: 'row', alignItems: 'center' },
  atText: { color: ACCENT, fontSize: 14, fontVariant: ['tabular-nums'] },
  nudge: { width: 28, height: 44, alignItems: 'center', justifyContent: 'center' },
  nudgeText: { color: '#8e8e93', fontSize: 18 },
  field: { flex: 1, minWidth: 0, height: 40, backgroundColor: '#2c2c2e', color: '#fff', borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  tagHere: { height: 44, justifyContent: 'center', paddingLeft: 24 },
  tagHereText: { color: ACCENT, fontSize: 18, fontWeight: '500' },
  tagHereBusy: { color: '#8e8e93', fontSize: 15, fontWeight: '400' },
  list: { flexGrow: 0, flexShrink: 1, borderTopColor: '#2c2c2e', borderTopWidth: 1 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomColor: '#2c2c2e', borderBottomWidth: 1 },
  rowAt: { width: 44, color: '#8e8e93', fontSize: 14, fontVariant: ['tabular-nums'] },
  rowWords: { flex: 1, color: '#fff', fontSize: 15 },
  rowEmpty: { color: '#636366', fontStyle: 'italic' },
  rowNow: { color: ACCENT },
  rowSync: { fontSize: 11, color: '#636366' },
  empty: { height: ROW_HEIGHT, lineHeight: ROW_HEIGHT, color: '#636366', fontSize: 14 },
});
