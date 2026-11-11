// What you see of the player: the mini player, the full player as a sheet that grows out of it, the queue and the
// Undo toast. The player itself is playerStore.ts, so closing any of these never touches the music.
// Look (overhaul wave 1): the player from the Deal mockup on Wall's design system (theme.ts). Wave 4: Queue in the
// list style every other screen uses (60 rows with a tile, the playing song pinned on top in amber).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Animated, Dimensions, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import ReorderableList, { useIsActive, useReorderableDrag, type ReorderableListDragEndEvent, type ReorderableListReorderEvent } from 'react-native-reorderable-list';

/** A light tick: a queue song grabbed, and each spot it bumps past while dragged. */
const tick = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
import { Tile, Tint } from './Art';
import { CompareDial, WHEEL_WIDTH } from './Compare';
import { Glass } from './Frame';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { compare, useCompare } from './compareStore';
import { openLibrarySelect, usePlace } from './nav';
import { player, usePlayer, usePlayerPick } from './playerStore';
import { draftGoesOnChange, listIsOpen, queueDrop, seekRelease, shuffleAfterTap, shuffleWords, type ShownTag } from './playOrder';
import { ratingStore, useRating } from './ratingStore';
import { session, useSession, useSessionCount } from './sessionStore';
import { layers, pullCloses, slideController, type Nav } from './sheetCore';
import { HoldMenu, jumpToTag, ReservedLine, TagList, usePassedTag } from './Tagging';
import { sayAside, tagLine, useTagLine, useTags } from './tagStore';
import { C, coveredBelow, R, S, T } from './theme';
import { VersionsChip, VersionsToast } from './Versions';
import * as versions from './versionStore';

const HOLD_MS = 300; // not lower: a hold let go just short of this jumps to the song
const SLIDE_MS = 220;
const EDGE_ZONE = 0.3; // the share of the list, top and bottom, that scrolls it during a drag; the middle 40% is safe
const SHEET_PAD = 50; // the sheet fills the screen; its own top padding clears the status bar
const OPEN_MS = 300;
const CLOSE_MS = 220;
const SWIPE_UP = 40;
const SWIPE_UP_SPEED = 0.4;
const HIDE_MS = 200;
const PULSE_MS = 600;
const LIFT_MS = 220;

const clock = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** The song's date, for its tile (older songs are darker). */
const useSongDate = (id: string | null | undefined) => {
  const { songs } = versions.useVersions(); // asked again once the song list is in: the tile matches its Home card
  return useMemo(() => (id ? versions.songInfo(id)?.date ?? null : null), [id, songs]);
};

type SeekBarProps = {
  value: number;
  max: number;
  onDrag: (value: number) => void;
  onDrop: (value: number) => void;
  /** Tag dots: a quick still tap within half a finger of one calls onTick with it instead of seeking to the spot. */
  ticks?: ShownTag[];
  onTick?: (tag: ShownTag) => void;
};
const TICK_MERGE = 0.025; // dots closer than this share of the bar draw as one wider dot

export function SeekBar({ value, max, onDrag, onDrop, ticks = [], onTick }: SeekBarProps) {
  const width = useRef(1);
  const grabbedAt = useRef(0);
  const latest = useRef({ max, onDrag, onDrop, ticks, onTick });
  latest.current = { max, onDrag, onDrop, ticks, onTick };

  const grabbedWhen = useRef(0);
  // a dot only on a quick still tap (seekRelease): a drag lands where it's let go, never on a dot
  const release = (dx: number) => {
    const { max: m, ticks: all, onTick, onDrop } = latest.current;
    const r = seekRelease({ grabX: grabbedAt.current, dx, heldMs: Date.now() - grabbedWhen.current, width: width.current, max: m, ticks: onTick ? all : [] });
    if (r.tick) onTick!(r.tick);
    else onDrop(r.seek);
  };

  const valueAt = (x: number) => (Math.min(Math.max(x, 0), width.current) / width.current) * latest.current.max;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        grabbedAt.current = e.nativeEvent.locationX;
        grabbedWhen.current = Date.now();
        latest.current.onDrag(valueAt(grabbedAt.current));
      },
      onPanResponderMove: (_, g) => latest.current.onDrag(valueAt(grabbedAt.current + g.dx)),
      onPanResponderRelease: (_, g) => release(g.dx),
      onPanResponderTerminate: (_, g) => latest.current.onDrop(valueAt(grabbedAt.current + g.dx)),
    }),
  ).current;

  const percent = `${max > 0 ? (value / max) * 100 : 0}%` as const;
  const marks: { at: number; wide: boolean }[] = [];
  if (max > 0)
    for (const tag of ticks) {
      const at = Math.min(tag.at_sec / max, 1);
      const last = marks[marks.length - 1];
      if (last && at - last.at < TICK_MERGE) last.wide = true;
      else marks.push({ at, wide: false });
    }
  return (
    <View style={s.seek} onLayout={(e) => (width.current = e.nativeEvent.layout.width || 1)} {...pan.panHandlers}>
      <View style={s.track} pointerEvents="none">
        <View style={[s.filled, { width: percent }]} />
      </View>
      {marks.map((mark, i) => (
        <View key={i} style={[s.tick, mark.wide && s.tickWide, { left: `${mark.at * 100}%` }]} pointerEvents="none" />
      ))}
      <View style={[s.knob, { left: percent }]} pointerEvents="none" />
    </View>
  );
}

/** Touch handlers that call onSwipe on an upward swipe and leave taps to whatever is inside. */
function useSwipeUp(onSwipe: () => void) {
  const latest = useRef(onSwipe);
  latest.current = onSwipe;
  return useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_UP || g.vy < -SWIPE_UP_SPEED) latest.current();
      },
    }),
  ).current.panHandlers;
}

/**
 * Touch handlers for an area with nothing to tap (the art): it takes the touch as the finger lands, like the sheet's
 * grab area, and calls onSwipe on an upward swipe. Waiting for the finger to move first (useSwipeUp) never got the
 * touch inside the player sheet.
 */
function useBlankSwipeUp(onSwipe: () => void) {
  const latest = useRef(onSwipe);
  latest.current = onSwipe;
  return useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if ((g.dy < -SWIPE_UP || g.vy < -SWIPE_UP_SPEED) && Math.abs(g.dy) > Math.abs(g.dx)) latest.current();
      },
    }),
  ).current.panHandlers;
}

/** The 5-second Undo. Above the mini player on any screen, and inside the player, because it belongs to the player. */
export function UndoToast({ inPlayer = false }: { inPlayer?: boolean }) {
  const { undo, message, song } = usePlayerPick('undo', 'message', 'song');
  const { sort } = usePlace();
  const style = [s.toast, inPlayer ? s.toastInPlayer : { bottom: coveredBelow(!sort, !!song) + 8 }];
  if (message) {
    return (
      <View style={style}>
        <Text style={s.toastText}>{message}</Text>
      </View>
    );
  }
  if (!undo) return null;
  return (
    <Pressable style={style} onPress={player.tapUndo}>
      <Text style={s.toastText} numberOfLines={1}>Hidden: {undo.title}</Text>
      <Text style={s.toastUndo}>Undo</Text>
    </Pressable>
  );
}

// ---------- the mini player and the sheet are one object: one value moves both --------------------------------------
/** 0: the player fills the screen. 1: it is the mini player. A finger or a slide moves it; nothing else. */
const sheetAt = new Animated.Value(1);
/** The share of the way, at the mini player's end, over which one fades into the other. */
const HANDOVER = 0.82;

/** How far above the screen's bottom the mini player's top edge sits: where the sheet grows from. */
const miniTopFromBottom = (tabs: boolean) => coveredBelow(tabs, true) - 8;

/** The thin line along the mini player's bottom. On its own, so the clock redraws only this. */
function MiniProgress() {
  const { time, duration } = usePlayerPick('time', 'duration');
  return <View style={[s.miniProgress, { width: `${duration > 0 ? Math.min(time / duration, 1) * 100 : 0}%` }]} pointerEvents="none" />;
}

/** Floats above the tab bar on every screen once something has played. Tap: it grows into the player. Swipe up: Queue. */
export function MiniPlayer() {
  const { song, wanted, sorting, trouble, note, comparing } = usePlayerPick('song', 'wanted', 'sorting', 'trouble', 'note', 'comparing');
  const { sort } = usePlace();
  const swipe = useSwipeUp(() => player.open('queue'));
  const date = useSongDate(song?.id);
  if (!song) return null;
  const fade = sheetAt.interpolate({ inputRange: [0, HANDOVER, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  return (
    <Animated.View style={[s.miniDock, { bottom: miniTopFromBottom(!sort) - S.mini, opacity: fade }]} {...swipe}>
      <Glass style={s.mini} radius={R.mini}>
        <Pressable style={s.miniOpen} onPress={() => player.open('player')} accessibilityLabel={`Open player: ${song.title}`}>
          <Tile title={song.title} date={date} size={S.rowTile} radius={R.rowTile} />
          <View style={s.miniText}>
            <Text style={s.miniTitle} numberOfLines={1}>{song.title}</Text>
            <Text style={s.miniDetail} numberOfLines={1}>{comparing ? 'Comparing versions' : trouble || note || (sorting ? 'Sorting' : wanted ? 'Playing' : 'Paused')}</Text>
          </View>
        </Pressable>
        <Tap style={s.miniButton} radius={22} onPress={player.toggle} accessibilityLabel={wanted ? 'Pause' : 'Play'}>
          <Icon name={wanted ? 'pause' : 'play'} size={24} color={C.text} />
        </Tap>
        <Tap style={s.miniButton} radius={22} onPress={player.next} accessibilityLabel="Next">
          <Icon name="next" size={24} color={C.text} />
        </Tap>
        <MiniProgress />
      </Glass>
    </Animated.View>
  );
}

/** One slot of the row under the transport: a symbol over a plain word. Always the same box, on or off. */
function Action({ icon, word, on = false, accent = false, onPress, label }: { icon: IconName; word: string; on?: boolean; accent?: boolean; onPress: () => void; label?: string }) {
  const color = on || accent ? C.accent : C.dim;
  return (
    <Tap style={s.action} radius={12} onPress={onPress} accessibilityLabel={label ?? word}>
      <Icon name={icon} size={22} color={color} />
      <Text style={[s.actionWord, { color }, on && s.actionOn]} numberOfLines={1} allowFontScaling={false}>{word}</Text>
    </Tap>
  );
}

export function FullPlayer() {
  const { song, order, wanted: playerWanted, time: playerTime, duration: playerDuration, note, trouble, timeLeft, sorting, buttonsHidden, pool } = usePlayer();
  const [seekingTo, setSeekingTo] = useState<number | null>(null);
  const swipe = useBlankSwipeUp(() => player.open('queue'));
  const hidden = useRef(new Animated.Value(buttonsHidden ? 1 : 0)).current;
  // Compare lives inside the player (6.6): it owns the sound, so the title, seek bar and Play/Pause are its. The buttons
  // never change or move; Previous, Next and Shuffle mean another song, which ends Compare first (Done, then the move)
  const cmp = useCompare();
  const comparing = cmp.open;
  const time = comparing ? cmp.sound.time : playerTime;
  const reported = comparing ? cmp.sound.duration : playerDuration;
  // a length that changes (the phone's own replacing the laptop's) waits until the finger is off the bar
  const [dragAt, setDragAt] = useState<number | null>(null);
  const heldLength = useRef(reported);
  if (dragAt === null) heldLength.current = reported;
  const duration = heldLength.current;
  const shownId = comparing ? cmp.sound.sounding || cmp.ids[0] : song?.id;
  const wanted = comparing ? cmp.sound.playing : playerWanted;
  const pulse = useRef(new Animated.Value(1)).current;
  const leavingCompare = (then: () => void) => () => {
    if (compare.busy()) compare.done();
    then();
  };

  // the wait: "Compare" pulses in place (opacity only, so it can't change width)
  useEffect(() => {
    if (!cmp.preparing) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [cmp.preparing, pulse]);

  useEffect(() => {
    Animated.timing(hidden, { toValue: buttonsHidden ? 1 : 0, duration: HIDE_MS, useNativeDriver: true }).start();
  }, [buttonsHidden, hidden]);

  // Next or another song while typing: the draft is saved to the song it was tapped on
  const { draft, listFor } = useTagLine();
  const lastSong = useRef(song?.id);
  useEffect(() => {
    if (draftGoesOnChange(draft, lastSong.current, song?.id)) tagLine.finish(song?.id);
    lastSong.current = song?.id;
  }, [song?.id]);

  // The keyboard covers the bottom of the screen, so while a line is being typed the page rides up by the art's
  // height: the field sits where the art was, above the keyboard. Nothing else changes place.
  const [artBox, setArtBox] = useState({ width: 0, height: 0 });
  const lift = useRef(new Animated.Value(0)).current;
  const typing = !!draft;
  useEffect(() => {
    Animated.timing(lift, { toValue: typing ? 1 : 0, duration: LIFT_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [typing, lift]);

  const drop = async (value: number) => {
    setDragAt(null);
    if (!duration) return;
    setSeekingTo(value);
    await (comparing ? compare.seek(value) : player.seek(value));
    setSeekingTo(null);
  };

  // length not known yet (a song finding its start spot): the spot it's heading for, never 0:00 first
  const shown = duration ? Math.min(dragAt ?? seekingTo ?? time, duration) : time;
  const tags = useTags(shownId);
  const isMine = player.isMine();
  const rating = useRating(song?.id);
  // rating is for a song I'm keeping: not on a Sort card (not judged yet), not in Compare (which version?)
  const canRate = !!song && !sorting && !comparing;
  const shuffleOn = !!order?.shuffle;
  const { on: inSession } = useSession();
  // playback passing a dot says its words: only while playing on its own, never while dragged, seeking or typing
  const passed = usePassedTag(song?.id, comparing ? [] : tags, playerTime, !comparing && playerWanted && dragAt === null && seekingTo === null && !draft);
  const tapShuffle = () => {
    const pick = shuffleAfterTap({ on: shuffleOn, pool });
    player.setShuffleOn(pick.on, pick.pool);
    sayAside(pick.on ? { text: 'Shuffle: ', bold: shuffleWords(pick) } : { text: 'Shuffle ', bold: 'off' });
  };
  const title = comparing ? versions.songTitle(shownId ?? '') : song?.title;
  const date = useSongDate(shownId);
  const linesOpen = !comparing && !!shownId && listIsOpen(listFor, shownId);
  const tile = Math.max(Math.min(artBox.width, artBox.height), 0);
  const out = player.isOut();
  return (
    <Animated.View style={[s.page, { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -artBox.height] }) }] }]}>
      {/* beside the grab mark: down (Done in Compare), or the tagging session's Close and count */}
      {inSession ? <SessionTop /> : (
        <View style={s.topRow}>
          <Tap style={s.down} radius={22} onPress={comparing ? compare.done : () => player.open('none')} accessibilityLabel={comparing ? 'Done' : 'Close player'}>
            {comparing ? <Text style={s.word}>Done</Text> : <Icon name="down" size={22} color={C.dim} />}
          </Tap>
        </View>
      )}
      {/* the art: whatever height is left, so every row under it keeps its place on any phone. A swipe up on it opens
          Queue. While Lines is open the song's lines sit here instead: nothing below moves */}
      <View style={s.art} onLayout={(e) => setArtBox(e.nativeEvent.layout)} {...(comparing || linesOpen ? {} : swipe)}>
        {linesOpen ? (
          <View style={s.lines}>
            <TagList songId={shownId} songTitle={song?.title ?? ''} tags={tags} time={shown} />
          </View>
        ) : tile > 0 ? (
          <Tile title={title} date={date} size={tile} radius={R.playerTile} />
        ) : null}
      </View>
      {/* two lines' height always, so a longer version name never moves the bar */}
      <View style={s.titleBox}>
        <Text style={s.title} numberOfLines={2}>{title}</Text>
      </View>
      {/* the quiet row: Mine / Not mine (the eye hides them, and keeps my choice), Shuffle on the right. In a session,
          Not mine alone. On a Sort card, nothing. The row keeps its height either way */}
      <View style={s.quiet}>
        {inSession ? (
          // the same quiet pill as Sort's buttons (wave 3)
          <Tap style={[s.sessionPill, out && s.sessionPillOff]} radius={18} onPress={session.notMine} disabled={out} accessibilityLabel="Not mine">
            <Text style={[s.sessionPillWord, out && s.verdictOff]}>Not mine</Text>
          </Tap>
        ) : sorting ? null : (
          <>
            <Tap style={s.eyeTap} radius={22} onPress={player.toggleButtonsHidden} accessibilityLabel={buttonsHidden ? 'Show Mine and Not mine' : 'Hide Mine and Not mine'}>
              <Icon name={buttonsHidden ? 'eyeOff' : 'eye'} size={22} color={C.faint} />
            </Tap>
            {/* only the eye shows or hides these; in Compare they stay as the eye says, dimmed, and take no taps */}
            <Animated.View
              style={[s.verdicts, comparing && s.resting, { opacity: hidden.interpolate({ inputRange: [0, 1], outputRange: [comparing ? 0.35 : 1, 0] }) }]}
              pointerEvents={buttonsHidden || comparing ? 'none' : 'auto'}
            >
              {out ? null : (
                <>
                  <Tap style={[s.verdict, isMine && s.verdictOn]} radius={14} onPress={player.tapMine} accessibilityLabel={isMine ? 'Mine, on' : 'Mine'}>
                    <Text style={[s.verdictWord, isMine && s.verdictWordOn]}>Mine</Text>
                  </Tap>
                  <Tap style={s.verdict} radius={14} onPress={player.tapNotMine} accessibilityLabel="Not mine">
                    <Text style={s.verdictWord}>Not mine</Text>
                  </Tap>
                </>
              )}
            </Animated.View>
          </>
        )}
        <View style={s.fill} />
        {/* each tap: Off > Mine > Unsorted > Off, no box. Hidden while sorting and in a session, its place kept */}
        {inSession || sorting ? null : (
          <Tap style={s.eyeTap} radius={22} onPress={leavingCompare(tapShuffle)} accessibilityLabel={shuffleOn ? `Shuffle on, ${pool === 'mine' ? 'Mine' : 'unsorted'}` : 'Shuffle off'}>
            <Icon name="shuffle" size={22} color={shuffleOn ? C.accent : C.faint} />
          </Tap>
        )}
      </View>
      {/* versions: + Version, the Versions chip, and Compare (or its wheel) in one fixed slot. The row keeps its height */}
      <View style={[s.versionRow, inSession && s.versionRowSession]}>
        {!shownId || (!comparing && (sorting || (out && !inSession))) ? null : (
          <>
            {/* never a sheet over this sheet (iOS froze on that): the player closes first, then the next screen opens */}
            {/* already in a group: hidden, its Versions chip and Compare do the work */}
            {versions.members(shownId).length > 1 ? null : (
              <Pressable onPress={() => player.closeThen(() => openLibrarySelect(shownId))}>
                <Text style={s.word}>+ Version</Text>
              </Pressable>
            )}
            <VersionsChip id={shownId} onPress={() => player.closeThen(() => versions.openVersions(shownId))} />
            {/* one fixed-width slot: the Compare word, or in Compare the wheel in its place, so nothing beside it moves */}
            {versions.members(shownId).length > 1 ? (
              <View style={s.compareSlot}>
                {comparing ? (
                  <CompareDial />
                ) : (
                  <Animated.View style={{ opacity: pulse }}>
                    <Pressable onPress={() => compare.openFromPlayer(player.url())}>
                      <Text style={s.word}>Compare</Text>
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            ) : null}
          </>
        )}
      </View>
      <SeekBar value={shown} max={duration} onDrag={setDragAt} onDrop={drop} ticks={tags} onTick={comparing ? undefined : (tag) => (setDragAt(null), jumpToTag(tag))} />
      <View style={s.times}>
        {/* both times in fixed boxes: "–:––" becoming "3:42" (or a late length) moves nothing */}
        <View style={s.timeBox}>
          <Text style={s.time}>{clock(shown)}</Text>
        </View>
        <Pressable style={s.timeTap} onPress={player.toggleTimeLeft}>
          <Text style={s.time}>{!duration ? '–:––' : timeLeft ? `-${clock(Math.max(duration - shown, 0))}` : clock(duration)}</Text>
        </Pressable>
      </View>
      {/* also the player's own note when nothing about tags is showing */}
      <ReservedLine songId={song?.id} duration={duration} fallback={trouble || note} passed={passed} />
      {/* the same buttons in Compare: Play/Pause works the version heard, the rest end Compare first. Three fixed
          boxes in a pill: dead centre from every place the player opens */}
      <Glass style={s.pill} radius={R.pill}>
        <Tap style={s.skip} radius={28} onPress={leavingCompare(player.previous)} accessibilityLabel="Previous">
          <Icon name="previous" size={30} color={C.text} />
        </Tap>
        <Tap filled style={s.play} radius={S.play / 2} onPress={comparing ? compare.toggle : player.toggle} accessibilityLabel={wanted ? 'Pause' : 'Play'}>
          <Icon name={wanted ? 'pause' : 'play'} size={28} color="#000" />
        </Tap>
        <Tap style={s.skip} radius={28} onPress={leavingCompare(player.next)} accessibilityLabel="Next">
          <Icon name="next" size={30} color={C.text} />
        </Tap>
      </Glass>
      {/* five fixed slots. A slot with nothing to offer (rating on a Sort card, tagging in Compare) stays empty, so
          the others never move */}
      <View style={s.actions}>
        {canRate ? (
          <Action icon={rating === 'fire' ? 'favoriteOn' : 'favorite'} word="Favorite" on={rating === 'fire'} onPress={() => ratingStore.tap(song.id, song.title, 'fire')} label={rating === 'fire' ? 'Favorite, on' : 'Favorite, off'} />
        ) : <View style={s.action} />}
        {canRate ? (
          <Action icon={rating === 'shelved' ? 'archiveOn' : 'archive'} word={rating === 'shelved' ? 'Archived' : 'Archive'} on={rating === 'shelved'} onPress={() => ratingStore.tap(song.id, song.title, 'shelved')} label={rating === 'shelved' ? 'Archived, on' : 'Archive'} />
        ) : <View style={s.action} />}
        {/* the most-used button: the middle, under the thumb. While a line is being typed it cancels */}
        {comparing || !song ? <View style={s.action} /> : (
          <Action icon={draft ? 'close' : 'tag'} word="Tag" accent onPress={() => tagLine.tap(song.id, song.title, player.positionNow())} label={draft ? 'Cancel tag' : 'Tag here'} />
        )}
        {comparing || !shownId ? <View style={s.action} /> : (
          <Action icon="lines" word={`Lines · ${tags.length}`} on={linesOpen} onPress={() => tagLine.toggleList(shownId)} label={linesOpen ? 'Hide lines' : 'Show lines'} />
        )}
        {/* in a session, Next song is the main action: the one lit slot besides Tag */}
        {inSession ? <Action icon="next" word="Next song" on onPress={leavingCompare(player.next)} /> : <Action icon="queue" word="Queue" onPress={() => player.open('queue')} />}
      </View>
      <UndoToast inPlayer />
      <VersionsToast />
      <HoldMenu tags={tags} songTitle={song?.title ?? ''} time={shown} />
    </Animated.View>
  );
}

/** The session's top row: Close on the left, "N of M tagged" on the right, and a thin amber line along the row's
 * bottom for how far along the session is (wave 3). Drawn inside the row, so nothing below moves. */
function SessionTop() {
  const { tagged, of } = useSessionCount();
  return (
    <View style={s.sessionTop}>
      <Tap style={s.sessionClose} onPress={session.close}>
        <Text style={s.word}>Close</Text>
      </Tap>
      <Text style={s.sessionCount}>{tagged.toLocaleString('en-US')} of {of.toLocaleString('en-US')} tagged</Text>
      <View style={s.sessionTrack} pointerEvents="none">
        <View style={[s.sessionBar, { width: `${sessionShare(tagged, of) * 100}%` }]} />
      </View>
    </View>
  );
}
/** The share of the session done, 0 to 1 (a session of none is 0, never a division by zero). */
export const sessionShare = (tagged: number, of: number) => (of > 0 ? Math.min(Math.max(tagged / of, 0), 1) : 0);

/** One song up next: the list row every screen uses (60 high, a 44 tile). Tap: jump to it. Hold: lift it to move it. */
function QueueRow({ id, date, sorting }: { id: string; date: string | null; sorting: boolean }) {
  const lift = useReorderableDrag();
  const lifted = useIsActive();
  const title = player.titleOf(id);
  return (
    <Pressable
      style={[s.queueRow, lifted && s.queueLifted]}
      onPress={() => player.jump(id)}
      onLongPress={sorting ? undefined : lift}
      delayLongPress={HOLD_MS}
    >
      <Tile title={title} date={date} size={S.rowTile} radius={R.rowTile} plain />
      <View style={s.queueWords}>
        <Text style={s.queueSong} numberOfLines={1}>{title}</Text>
        <Text style={s.queueMeta} numberOfLines={1}>{date || ' '}</Text>
      </View>
      {/* the grip only says "this moves": the whole row lifts on a hold. None on a Sort card's queue (no reorder there) */}
      {sorting ? null : (
        <View style={s.queueGrip}>
          <Icon name="grip" size={20} color={C.faint} />
        </View>
      )}
    </Pressable>
  );
}

function Queue() {
  const { song, order, marks, sorting, wanted } = usePlayerPick('song', 'order', 'marks', 'sorting', 'wanted');
  // every song's date (its tile's shade and the row's second line), one table per song list: a row never searches
  // 1,395 songs for its own. Empty until the list is in: the rows keep their height
  const { songs: listed } = versions.useVersions();
  const dates = useMemo(() => new Map((listed ?? []).map((one): [string, string | null] => [one.id, one.date ?? null])), [listed]);
  const live = useMemo(() => player.upNext(), [order, marks]);
  // Rows stay frozen while one is lifted, so a song ending mid-drag can't move them under the finger.
  const [frozen, setFrozen] = useState<string[] | null>(null);
  const rows = frozen ?? live;
  const shown = useRef(rows);
  shown.current = rows;

  const freeze = useCallback(() => setFrozen(shown.current), []);
  const thaw = useCallback(() => setFrozen(null), []);
  const onDragStart = useCallback(() => {
    'worklet';
    runOnJS(tick)();
    runOnJS(freeze)();
  }, [freeze]);
  const onIndexChange = useCallback(() => {
    'worklet';
    runOnJS(tick)();
  }, []);
  // A row dropped where it started never reaches onReorder, so it thaws here.
  const onDragEnd = useCallback((e: ReorderableListDragEndEvent) => {
    'worklet';
    if (e.from === e.to) runOnJS(thaw)();
  }, [thaw]);

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => {
    const drop = queueDrop(shown.current, from, to);
    setFrozen(null);
    player.moveUpNext(drop.id, drop.afterId);
  };

  return (
    <View style={s.queue}>
      <View style={s.queueHeader}>
        <Tap style={s.queueBack} radius={22} onPress={player.closeQueue} accessibilityLabel="Back">
          <Text style={s.queueBackWord}>Back</Text>
        </Tap>
        <Text style={s.queueTitle}>Queue</Text>
      </View>
      {/* the song playing: the same row, its title amber, pinned above the list. No grip: it can't be moved */}
      <View style={s.queueRow} accessible accessibilityLabel={`Now playing: ${song?.title ?? ''}`}>
        <Tile title={song?.title} date={dates.get(song?.id ?? '') ?? null} size={S.rowTile} radius={R.rowTile} plain />
        <View style={s.queueWords}>
          <Text style={[s.queueSong, s.queueNow]} numberOfLines={1}>{song?.title}</Text>
          <Text style={s.queueMeta} numberOfLines={1}>{sorting ? 'Sorting' : wanted ? 'Playing' : 'Paused'}</Text>
        </View>
      </View>
      <Text style={s.queueHeading}>Up next</Text>
      <ReorderableList
        style={s.queueList}
        contentContainerStyle={s.queueEnd}
        data={rows}
        extraData={dates}
        dragEnabled={!sorting}
        shouldUpdateActiveItem
        animationDuration={SLIDE_MS}
        autoscrollThreshold={EDGE_ZONE}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onIndexChange={onIndexChange}
        onReorder={onReorder}
        keyExtractor={(id) => id}
        ListEmptyComponent={<Text style={s.queueEmpty}>Nothing after this song</Text>}
        renderItem={({ item }) => <QueueRow id={item} date={dates.get(item) ?? null} sorting={sorting} />}
      />
    </View>
  );
}

/**
 * One layer that moves between on screen (0) and away (1) as `open` says. Where it's heading always follows `open`
 * (sheetCore.ts), so it can be turned round at any moment: nothing waits for a slide to finish. Only its grab area
 * pulls it; a pull let go far or fast enough calls `onClose`, anything less goes back up. `at` is the layer's place,
 * 0 to 1; `travel` is how many points that is, so a finger moves it one for one.
 */
function useSlide(at: Animated.Value, travel: number, open: boolean, onClose: () => void, onGone?: () => void) {
  const [mounted, setMounted] = useState(false);
  const latest = useRef({ onClose, onGone, travel });
  latest.current = { onClose, onGone, travel };
  const made = useRef<ReturnType<typeof slideController> | null>(null);
  const slide = (made.current ??= slideController({
    animate: (to, done) =>
      Animated.timing(at, { toValue: to, duration: to ? CLOSE_MS : OPEN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        .start(({ finished }) => done(finished)),
    setMounted,
    later: (fn) => void setTimeout(fn, 0),
    onGone: () => latest.current.onGone?.(),
  }));
  useEffect(() => slide.setOpen(open), [open, slide]);
  const grab = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => slide.grabbed(),
      onPanResponderMove: (_, g) => at.setValue(Math.min(Math.max(g.dy, 0) / latest.current.travel, 1)),
      onPanResponderRelease: (_, g) => slide.released(pullCloses(g.dy, g.vy), () => latest.current.onClose()),
      onPanResponderTerminate: () => slide.released(false, () => {}),
    }),
  ).current.panHandlers;
  // drawn from the moment it's asked for, so the first frame of the slide already has its content
  return { shown: open || mounted, grab };
}

/** The player's background, on its own so the clock never redraws it. */
function SheetTint() {
  const { song } = usePlayerPick('song');
  const cmp = useCompare();
  const id = cmp.open ? cmp.sound.sounding || cmp.ids[0] : song?.id;
  const date = useSongDate(id);
  return <Tint title={cmp.open ? versions.songTitle(id ?? '') : song?.title} date={date} />;
}

/**
 * The player sheet: a layer inside the app, never an iOS pop-up sheet. iOS can't turn one of those round half-way: a
 * second request inside its half-second slide was dropped, and an empty see-through sheet could stay over the whole
 * app, taking every touch while the music played on (the freeze, 2026-11-09). This one takes touches only while the
 * player says it is open, and only its grab area pulls it, so nothing inside it can move it.
 * It grows out of the mini player: its top edge starts at the mini player's and rises to the top of the screen, one
 * fading into the other at that end (the same value moves both, so they can't come apart).
 * Queue opened from the player is its own layer over the player: pulled down, it uncovers the player, like Back.
 */
export function PlayerSheet() {
  const { sheet, song, queueFrom, comparing } = usePlayerPick('sheet', 'song', 'queueFrom', 'comparing');
  const { sort } = usePlace();
  // Compare from a Library group may have no queue song: the sheet still opens, on the group
  const visible = sheet !== 'none' && (!!song || comparing);
  const wasVisible = useRef(visible);

  // the sheet closing, any way at all, counts as Done in Compare: the sound carries on as Done leaves it
  useEffect(() => {
    if (wasVisible.current && !visible) compare.done();
    wasVisible.current = visible;
  }, [visible]);

  // while it slides away it keeps showing what it showed
  const lastNav = useRef<Nav>({ sheet: 'player', queueFrom: 'none' });
  if (visible) lastNav.current = { sheet, queueFrom };
  const { base, queueOver } = layers(lastNav.current);

  const height = Dimensions.get('window').height;
  const travel = height - miniTopFromBottom(!sort);
  const overAt = useRef(new Animated.Value(1)).current;
  const whole = useSlide(sheetAt, travel, visible, () => player.open('none'), () => {
    lastNav.current = { sheet: 'player', queueFrom: 'none' }; // gone: the next opening starts with no Queue left on top
    player.runAfterClose();
  });
  const over = useSlide(overAt, height, queueOver, player.closeQueue);

  return (
    <View style={s.sheetLayer} pointerEvents={visible ? 'auto' : 'none'} accessibilityViewIsModal={visible}>
      <GestureHandlerRootView style={s.sheetRoot}>
        <Animated.View
          style={[s.sheet, {
            opacity: sheetAt.interpolate({ inputRange: [0, HANDOVER, 1], outputRange: [1, 1, 0], extrapolate: 'clamp' }),
            transform: [{ translateY: sheetAt.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }],
          }]}
        >
          {whole.shown ? (
            <>
              {base === 'queue' ? null : <SheetTint />}
              <View style={s.grabArea} {...whole.grab}>
                <View style={s.grabMark} />
              </View>
              {base === 'queue' ? <Queue /> : <FullPlayer />}
            </>
          ) : null}
          <Animated.View
            style={[s.overLayer, { transform: [{ translateY: overAt.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }] }]}
            pointerEvents={queueOver && visible ? 'auto' : 'none'}
            accessibilityViewIsModal={queueOver}
          >
            {over.shown ? (
              <>
                <View style={s.grabArea} {...over.grab}>
                  <View style={s.grabMark} />
                </View>
                <Queue />
              </>
            ) : null}
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  // the mini player: floats above the tab bar (or the screen's bottom edge when Sort hides the tabs)
  miniDock: { position: 'absolute', left: S.miniSide, right: S.miniSide, height: S.mini, zIndex: 6 },
  mini: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 4 },
  miniOpen: { flex: 1, height: S.mini, flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniText: { flex: 1, minHeight: S.tap, justifyContent: 'center' },
  miniTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  miniDetail: { ...T.meta, fontSize: 12, marginTop: 1 },
  miniButton: { width: S.tap, height: S.tap, alignItems: 'center', justifyContent: 'center' },
  miniProgress: { position: 'absolute', left: 0, bottom: 0, height: 2, backgroundColor: C.accent },
  // over every screen, the tab bar and the mini player
  sheetLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 10 },
  sheetRoot: { flex: 1 },
  sheet: { flex: 1, paddingTop: SHEET_PAD, backgroundColor: C.surface, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet, overflow: 'hidden' },
  // its own top edge, so a Queue pulled part-way down reads as a layer over the player
  overLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingTop: SHEET_PAD, backgroundColor: C.surface, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  grabArea: { height: 44, alignItems: 'center', justifyContent: 'center' },
  grabMark: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.faint },
  page: { flex: 1, paddingHorizontal: S.playerSide, paddingBottom: S.homeBar },
  // beside the grab mark, only as wide as its button, so the rest of the grab area still pulls the sheet down
  topRow: { alignSelf: 'flex-start', marginTop: -44, marginLeft: -8, height: 44, justifyContent: 'center' },
  down: { minWidth: S.tap, height: S.tap, alignItems: 'center', justifyContent: 'center' },
  word: { color: C.dim, fontSize: 15, paddingHorizontal: 8, paddingVertical: 13, textAlign: 'center' },
  sessionTop: { marginTop: -44, marginHorizontal: -8, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionClose: { minWidth: 64, height: 44, justifyContent: 'center' },
  sessionCount: { ...T.meta, fontSize: 15, color: C.text, paddingRight: 8, fontVariant: ['tabular-nums'] },
  sessionTrack: { position: 'absolute', left: 8, right: 8, bottom: 0, height: 2, borderRadius: 1, backgroundColor: C.line, overflow: 'hidden' },
  sessionBar: { height: 2, backgroundColor: C.accent },
  sessionPill: { height: 36, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 18, backgroundColor: C.raised, marginLeft: 10 },
  sessionPillOff: { opacity: 0.5 },
  sessionPillWord: { color: C.text, fontSize: 15, fontWeight: '600' },
  art: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  lines: { alignSelf: 'stretch', flex: 1 },
  titleBox: { height: 58, justifyContent: 'center', marginTop: 8 },
  title: { ...T.playerTitle },
  quiet: { height: S.tap, flexDirection: 'row', alignItems: 'center', marginHorizontal: -10 },
  eyeTap: { width: S.tap, height: S.tap, alignItems: 'center', justifyContent: 'center' },
  verdicts: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resting: {},
  verdict: { height: S.tap, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 14 },
  verdictOn: {},
  verdictWord: { color: C.dim, fontSize: 15, fontWeight: '600' },
  verdictWordOn: { color: C.text, fontWeight: '700' },
  verdictOff: { color: C.faint },
  versionRow: { height: 46, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  // in a session the row starts where the Not mine pill above it starts (the word's own 8 of padding taken back),
  // instead of centred under a pill that sits left (wave 3 review, catch 17)
  versionRowSession: { justifyContent: 'flex-start', marginLeft: -8 },
  compareSlot: { width: WHEEL_WIDTH, height: 46, justifyContent: 'center', alignItems: 'flex-end' }, // the closed word ends where the pill does (6.7)
  seek: { height: S.seek, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  filled: { height: 4, backgroundColor: C.text },
  // tag dots sit just above the track, in the one accent colour
  tick: { position: 'absolute', top: 10, width: 6, height: 6, marginLeft: -3, borderRadius: 3, backgroundColor: C.accent },
  tickWide: { width: 10, marginLeft: -5 },
  knob: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7, backgroundColor: C.white },
  times: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 18, marginTop: -8 },
  time: { ...T.meta, fontVariant: ['tabular-nums'] },
  timeBox: { width: 64 },
  timeTap: { paddingVertical: 14, paddingLeft: 32, width: 96, alignItems: 'flex-end' },
  pill: { height: S.pill, marginHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  skip: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  play: { width: S.play, height: S.play, borderRadius: S.play / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, overflow: 'hidden' },
  actions: { height: S.actions, flexDirection: 'row', marginTop: 8, marginHorizontal: -8 },
  action: { flex: 1, height: S.actions, alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionWord: { ...T.action, fontVariant: ['tabular-nums'] },
  actionOn: { fontWeight: '700' },
  toast: { position: 'absolute', left: 16, right: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.toast, backgroundColor: C.toast, zIndex: 7 },
  toastInPlayer: { left: S.playerSide, right: S.playerSide, top: 8 },
  toastText: { flex: 1, ...T.toast },
  toastUndo: { color: C.accent, fontSize: 16, fontWeight: '700' },
  // Queue (wave 4): the list style of Library and search, on the sheet's own surface
  queue: { flex: 1, backgroundColor: C.surface, paddingHorizontal: S.side },
  queueHeader: { height: S.tap, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  queueBack: { height: S.tap, minWidth: S.tap, justifyContent: 'center', marginLeft: -8 },
  queueBackWord: { color: C.dim, fontSize: 15, paddingHorizontal: 8 },
  queueTitle: { ...T.title, flex: 1 },
  queueHeading: { ...T.heading, marginTop: 18, marginBottom: 6 },
  queueList: { flex: 1 },
  // the last row scrolls clear of the phone's home bar
  queueEnd: { paddingBottom: S.homeBar + 8 },
  queueRow: { height: S.row, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  queueLifted: { backgroundColor: C.raised, borderRadius: R.rowTile, borderBottomColor: 'transparent' },
  queueWords: { flex: 1, minWidth: 0, justifyContent: 'center' },
  queueSong: { ...T.row },
  queueNow: { color: C.accent },
  queueMeta: { ...T.meta, marginTop: 2, fontVariant: ['tabular-nums'] },
  queueGrip: { width: S.tap, height: S.tap, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  queueEmpty: { ...T.meta, fontSize: 15, textAlign: 'center', paddingTop: 32 },
});
