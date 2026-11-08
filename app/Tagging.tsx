// Tagging in the player (BLUEPRINT "Phase 2: tagging"): the reserved line under the seek bar (the typing field, or a
// short note with Undo), the Tag button, Tags · N and the song's tag list. Fixed heights throughout, so nothing moves.
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { player } from './playerStore';
import { clock, clockExact, dropPlainNote, MAX_TEXT, say, tagLine, useTagLine } from './tagStore';
import { listIsOpen, noTickWords, rowOrder, songStartWords, tickWordsAfter, type ShownTag, type TickWords } from './playOrder';

const ACCENT = '#f5b041'; // the mockup's amber, a placeholder (DECISIONS 2026-11-07)
const NUDGE = 0.5;
export const LINE_HEIGHT = 52;
const ROW_HEIGHT = 48;
const HOLD_MS = 400; // a Tags row held this long shows its menu (board: Queue rows keep 300)

/** The one pressed look in the app: an instant light tint behind the control, never a fade. */
export const pressedLook = { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8 };
export const tint = ({ pressed }: { pressed: boolean }) => (pressed ? pressedLook : null);

/** The reserved line: the field while a tag is being typed. Else, left: the last note, else the tag just passed, else the
 *  fallback; right: Shuffle's pool for 3 s, unless Undo needs the spot. Always the same height. */
export function ReservedLine({ songId, duration, fallback, passed }: { songId: string | null | undefined; duration: number; fallback?: string; passed?: ShownTag | null }) {
  const { draft, note, aside } = useTagLine();
  if (draft) {
    const editing = !!draft.before;
    return (
      <View style={s.line}>
        {/* Change words keeps the second: no nudge, just which tag it is */}
        {editing ? (
          <Text style={[s.atText, s.atEditing]}>{clock(draft.at)}</Text>
        ) : (
          <View style={s.at}>
            <Pressable style={(p) => [s.nudge, tint(p)]} onPress={() => tagLine.nudge(-NUDGE, duration)} accessibilityLabel="Earlier">
              <Text style={s.nudgeText}>‹</Text>
            </Pressable>
            <Text style={s.atText}>{clockExact(draft.at)}</Text>
            <Pressable style={(p) => [s.nudge, tint(p)]} onPress={() => tagLine.nudge(NUDGE, duration)} accessibilityLabel="Later">
              <Text style={s.nudgeText}>›</Text>
            </Pressable>
          </View>
        )}
        <TextInput
          key={draft.tagId} // another draft gets its own field, with its own words
          autoFocus // the keyboard is up at once, and again when the draft comes back after a kill
          style={s.field}
          defaultValue={draft.text}
          onChangeText={tagLine.type}
          onSubmitEditing={() => tagLine.finish(songId)}
          placeholder={draft.songId !== songId ? `On ${draft.songTitle}` : editing ? 'Change the words' : 'A line to remember'}
          placeholderTextColor="#636366"
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={MAX_TEXT}
          keyboardAppearance="dark"
        />
        <Pressable style={(p) => [s.act, tint(p)]} onPress={tagLine.cancel}>
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
        <Pressable style={(p) => [s.act, tint(p)]} onPress={tagLine.undo}>
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
      {({ pressed }) => (
        <View style={[s.tagFace, pressed && pressedLook]}>{draft ? <CloseIcon /> : <TagIcon color={ACCENT} />}</View>
      )}
    </Pressable>
  );
}

/** Tags · N beside Compare: opens and closes the song's list in place. N is the same list the ticks come from. */
export function TagsButton({ songId, tags }: { songId: string; tags: ShownTag[] }) {
  const { listFor } = useTagLine();
  const open = listIsOpen(listFor, songId);
  return (
    <Pressable style={(p) => [s.tagsButton, tint(p)]} onPress={() => tagLine.toggleList(songId)} accessibilityLabel={open ? 'Hide tags' : 'Show tags'}>
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

/** The song's tags, only while Tags · N has it open. Tap a row to jump (the list stays open); the playing row is marked.
 *  Rows keep their places while the list is open (rowOrder); time order comes back when it's reopened. Hold a row for
 *  Change words · Move to now · Cancel · Delete in its place; with a menu open, a tap on any row only closes it. */
export function TagList({ songId, songTitle, tags, time }: { songId: string | null | undefined; songTitle: string; tags: ShownTag[]; time: number }) {
  const { listFor, menuFor } = useTagLine();
  const open = !!songId && listIsOpen(listFor, songId);
  const rows = useRef<{ song: string | null; ids: string[] | null }>({ song: null, ids: null });
  if (!open || rows.current.song !== songId) rows.current = { song: songId ?? null, ids: null };
  // a song change closes a menu left open
  useEffect(() => {
    tagLine.closeMenu();
  }, [songId]);
  if (!open) return null;
  const ids = rowOrder(rows.current.ids, tags);
  rows.current.ids = ids;
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const now = playingTag(tags, time);
  return (
    <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
      {tags.length ? (
        ids.map((id) => {
          const tag = byId.get(id);
          if (!tag) return null; // deleted: its place is kept, so Undo puts it back there
          if (menuFor === id) return <RowMenu key={id} tag={tag} songTitle={songTitle} time={time} />;
          return (
            <Pressable
              key={id}
              style={(p) => [s.row, tint(p)]}
              onPress={() => (menuFor ? tagLine.closeMenu() : jumpToTag(tag))}
              onLongPress={() => tagLine.hold(id)}
              delayLongPress={HOLD_MS}
            >
              <Text style={[s.rowAt, tag.id === now && s.rowNow]}>{clock(tag.at_sec)}</Text>
              <Text style={[s.rowWords, !tag.text && s.rowEmpty, tag.id === now && s.rowNow]} numberOfLines={1}>
                {tag.text || 'no words yet'}
              </Text>
              <Text style={s.rowSync}>{tag.onPhone ? 'Saved on phone' : 'On laptop'}</Text>
            </Pressable>
          );
        })
      ) : (
        <Text style={s.empty}>No tags yet</Text>
      )}
    </ScrollView>
  );
}

/** A held row: four equal columns in the row's own height, Delete last and red. */
function RowMenu({ tag, songTitle, time }: { tag: ShownTag; songTitle: string; time: number }) {
  const item = (label: string, onPress: () => void, style?: object) => (
    <Pressable style={(p) => [s.menuItem, tint(p)]} onPress={onPress} accessibilityLabel={label}>
      <Text style={[s.menuText, style]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={s.menuRow}>
      {item('Change words', () => tagLine.changeWords(tag, songTitle, tag.song_id))}
      {item(`Move to ${clock(time)}`, () => tagLine.moveToNow(tag, player.positionNow()))}
      {item('Cancel', tagLine.closeMenu, s.menuCancel)}
      <View style={s.menuGap} />
      {item('Delete', () => tagLine.delete(tag), s.menuDelete)}
    </View>
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
  tagFace: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  atEditing: { width: 44 },
  menuRow: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'stretch', borderBottomColor: '#2c2c2e', borderBottomWidth: 1 },
  menuItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  menuText: { color: '#fff', fontSize: 13, textAlign: 'center' },
  menuCancel: { color: 'rgba(255,255,255,0.7)' },
  menuDelete: { color: '#ff6961' },
  menuGap: { width: 1, marginVertical: 10, backgroundColor: '#3a3a3c' },
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
