// Tagging in the player (BLUEPRINT "Phase 2: tagging"): the reserved line under the seek bar (the typing field, or a
// short note with Undo), the Tag button, Tags · N and the song's tag list. Fixed heights throughout, so nothing moves.
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { player } from './playerStore';
import { clock, clockExact, dropPlainNote, MAX_TEXT, say, tagLine, useTagLine } from './tagStore';
import { listIsOpen, noTickWords, songStartWords, tickWordsAfter, type ShownTag, type TickWords } from './playOrder';

const ACCENT = '#f5b041'; // the mockup's amber, a placeholder (DECISIONS 2026-11-07)
const NUDGE = 0.5;
export const LINE_HEIGHT = 52;
const ROW_HEIGHT = 48;

/** The reserved line: the field while a tag is being typed. Else, left: the last note, else the tag just passed, else the
 *  fallback; right: Shuffle's pool for 3 s, unless Undo needs the spot. Always the same height. */
export function ReservedLine({ songId, duration, fallback, passed }: { songId: string | null | undefined; duration: number; fallback?: string; passed?: ShownTag | null }) {
  const { draft, note, aside } = useTagLine();
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
        {note ? note.text : passed ? '' : fallback || ''}
        {note?.bold ? <Text style={s.bold}>{note.bold}</Text> : null}
        {!note && passed ? <Text style={s.bold}>{tagWords(passed)}</Text> : null}
      </Text>
      {note?.undo ? (
        <Pressable style={s.act} onPress={tagLine.undo}>
          <Text style={s.undoText}>Undo</Text>
        </Pressable>
      ) : aside ? (
        <Text style={s.aside} numberOfLines={1}>
          {aside.text}
          {aside.bold ? <Text style={s.bold}>{aside.bold}</Text> : null}
        </Text>
      ) : null}
    </View>
  );
}

/** A tag drawn from Views (no icon package): a body, a pointed end, a hole. */
function TagIcon({ color }: { color: string }) {
  return (
    <View style={s.tagIcon}>
      <View style={[s.tagPoint, { backgroundColor: color }]} />
      <View style={[s.tagBody, { backgroundColor: color }]}>
        <View style={s.tagHole} />
      </View>
    </View>
  );
}

/** An X, drawn: the Tag icon while a tag is being typed, where a tap cancels. */
function CloseIcon() {
  return (
    <View style={s.closeIcon}>
      <View style={[s.closeBar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[s.closeBar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

/** Tag, on the Back row's right. The second is read from the player at the tap and frozen; the music keeps playing.
 *  While a tag is being typed it shows an X and a tap cancels, the same as Cancel. */
export function TagButton({ songId, title }: { songId: string | null | undefined; title: string }) {
  const { draft } = useTagLine();
  if (!songId) return <View style={s.tagButton} />;
  return (
    <Pressable
      style={s.tagButton}
      onPress={() => tagLine.tap(songId, title, player.positionNow())}
      hitSlop={8}
      accessibilityLabel={draft ? 'Cancel tag' : 'Tag here'}
    >
      {draft ? <CloseIcon /> : <TagIcon color={ACCENT} />}
    </Pressable>
  );
}

/** Tags · N beside Compare: opens and closes the song's list in place. N is the same list the ticks come from. */
export function TagsButton({ songId, tags }: { songId: string; tags: ShownTag[] }) {
  const { listFor } = useTagLine();
  const open = listIsOpen(listFor, songId);
  return (
    <Pressable style={s.tagsButton} onPress={() => tagLine.toggleList(songId)} accessibilityLabel={open ? 'Hide tags' : 'Show tags'}>
      <Text style={[s.tagsText, open && s.tagsOpen]}>Tags · {tags.length}</Text>
    </Pressable>
  );
}

/** Jump to a tag and show its words on the reserved line. */
export function jumpToTag(tag: ShownTag) {
  player.seek(tag.at_sec);
  say({ text: '', bold: `${clock(tag.at_sec)}  ${tag.text || 'no words yet'}` });
}

/** A passed tag's words, as a jump shows them; a tag with no words shows only its time. */
const tagWords = (tag: ShownTag) => (tag.text ? `${clock(tag.at_sec)}  ${tag.text}` : clock(tag.at_sec));

/** The tag playback just passed, for 4 s or until the next (tickWordsAfter). `settled`: playing on its own, not dragged
 *  or seeking, no field open. A song change starts again from 0:00. */
export function usePassedTag(songId: string | null | undefined, tags: ShownTag[], time: number, settled: boolean): ShownTag | null {
  const state = useRef<TickWords>(noTickWords);
  const song = useRef(songId);
  const [shown, setShown] = useState<{ tagId: string | null; until: number }>({ tagId: null, until: 0 });
  useEffect(() => {
    const was = song.current === songId ? state.current : songStartWords;
    song.current = songId;
    const next = tickWordsAfter(was, tags, time, Date.now(), settled);
    state.current = next;
    if (next.tagId && next.until !== was.until) dropPlainNote();
    if (next.tagId !== shown.tagId || next.until !== shown.until) setShown({ tagId: next.tagId, until: next.until });
  }, [songId, time, settled]);
  // paused, no time updates come: a timer clears it
  useEffect(() => {
    if (!shown.tagId) return;
    const timer = setTimeout(() => {
      state.current = { ...state.current, tagId: null, until: 0 };
      setShown({ tagId: null, until: 0 });
    }, Math.max(0, shown.until - Date.now()));
    return () => clearTimeout(timer);
  }, [shown]);
  return (shown.tagId && tags.find((tag) => tag.id === shown.tagId)) || null;
}

/** The tag playing now: the last one at or before this second. */
export const playingTag = (tags: ShownTag[], time: number) => {
  let id: string | null = null;
  for (const tag of tags) if (tag.at_sec <= time + 0.05) id = tag.id;
  return id;
};

/** The song's tags in time order, only while Tags · N has it open. Tap a row to jump (the list stays open); the playing
 *  row is marked; rows never reorder. */
export function TagList({ songId, tags, time }: { songId: string | null | undefined; tags: ShownTag[]; time: number }) {
  const { listFor } = useTagLine();
  if (!songId || !listIsOpen(listFor, songId)) return null;
  const now = playingTag(tags, time);
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
        <Text style={s.empty}>No tags yet</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  line: { height: LINE_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10 },
  msg: { flex: 1, color: '#8e8e93', fontSize: 15 },
  aside: { flexShrink: 0, marginLeft: 2, color: '#8e8e93', fontSize: 15 },
  closeIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  closeBar: { position: 'absolute', width: 24, height: 3, borderRadius: 2, backgroundColor: ACCENT },
  bold: { color: '#fff', fontWeight: '500' },
  act: { height: 44, justifyContent: 'center', paddingHorizontal: 4 },
  undoText: { color: ACCENT, fontSize: 15 },
  cancelText: { color: '#8e8e93', fontSize: 15 },
  at: { flexDirection: 'row', alignItems: 'center' },
  atText: { color: ACCENT, fontSize: 14, fontVariant: ['tabular-nums'] },
  nudge: { width: 28, height: 44, alignItems: 'center', justifyContent: 'center' },
  nudgeText: { color: '#8e8e93', fontSize: 18 },
  field: { flex: 1, minWidth: 0, height: 40, backgroundColor: '#2c2c2e', color: '#fff', borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  tagButton: { width: 56, height: 48, alignItems: 'flex-end', justifyContent: 'center' },
  tagIcon: { width: 30, height: 20, flexDirection: 'row', alignItems: 'center' },
  tagPoint: { width: 14, height: 14, marginRight: -9, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  tagBody: { flex: 1, height: 20, borderRadius: 4, justifyContent: 'center', paddingLeft: 3 },
  tagHole: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#111' },
  tagsButton: { minHeight: 44, justifyContent: 'center' },
  tagsText: { color: '#8ab4f8', fontSize: 15, paddingHorizontal: 8, fontVariant: ['tabular-nums'] },
  tagsOpen: { color: '#fff', fontWeight: '700' },
  list: { flexGrow: 0, flexShrink: 1, maxHeight: ROW_HEIGHT * 4.5, borderTopColor: '#2c2c2e', borderTopWidth: 1 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomColor: '#2c2c2e', borderBottomWidth: 1 },
  rowAt: { width: 44, color: '#8e8e93', fontSize: 14, fontVariant: ['tabular-nums'] },
  rowWords: { flex: 1, color: '#fff', fontSize: 15 },
  rowEmpty: { color: '#636366', fontStyle: 'italic' },
  rowNow: { color: ACCENT },
  rowSync: { fontSize: 11, color: '#636366' },
  empty: { height: ROW_HEIGHT, lineHeight: ROW_HEIGHT, color: '#636366', fontSize: 14 },
});
