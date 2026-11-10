// The player sheet's rules, as plain code a test can run (NEXT 2026-11-09 A and B).
// A: the sheet used to be an iOS pop-up sheet (React Native's Modal). iOS can't turn one round half-way: opened while it
// was still closing, or closed while still opening, the request was dropped, and an empty see-through sheet could stay
// over the whole app for good, taking every touch while the music played on. Now the sheet is a layer inside the app:
// where it's heading always follows the player's state, so it can be turned round at any moment and can't get stuck.
// B: Queue opened from the player is its own layer over the player, so a swipe down uncovers the player, like Back.
// No React Native here, so a test can load it.

export type Sheet = 'none' | 'player' | 'queue';
/** `queueFrom`: where Queue was opened from, so closing it goes back there. */
export type Nav = { sheet: Sheet; queueFrom: 'none' | 'player' };

export const openSheet = (now: Nav, sheet: Sheet): Nav =>
  sheet === 'queue' && now.sheet !== 'queue' ? { sheet, queueFrom: now.sheet === 'player' ? 'player' : 'none' } : { ...now, sheet };

/** Queue's Back. */
export const closeQueue = (now: Nav): Nav => ({ ...now, sheet: now.queueFrom });

/** A swipe down on whatever is on top lands where its Back button goes (LESSONS 2026-11-09): Queue goes back to the
 * player it came from, or out if it came from the bar; the player goes out. */
export const swipeDown = (now: Nav): Nav => (now.sheet === 'queue' ? closeQueue(now) : { ...now, sheet: 'none' });

/** What is drawn. `base` fills the sheet; `queueOver`: Queue as its own layer above the player, which stays drawn under
 * it, so pulling Queue down shows the player and never the screen behind. */
export const layers = (now: Nav): { base: 'player' | 'queue' | null; queueOver: boolean } =>
  now.sheet === 'none'
    ? { base: null, queueOver: false }
    : now.sheet === 'queue' && now.queueFrom === 'none'
    ? { base: 'queue', queueOver: false }
    : { base: 'player', queueOver: now.sheet === 'queue' };

// ---------- where I am (overhaul wave 1): two tabs, with Sort opened over them -----------------------------------------
export type Tab = 'home' | 'library';
/** `sort`: Sort is open over the tabs (it hides the tab bar; Back returns to the tab under it). */
export type Place = { tab: Tab; sort: boolean };
/** A tab tapped. Leaves Sort if it was open. It says nothing about the player: a tab can't move, reload or stall it. */
export const tabTapped = (_now: Place, tab: Tab): Place => ({ tab, sort: false });
export const sortOpened = (_now: Place): Place => ({ tab: 'home', sort: true });
export const sortClosed = (now: Place): Place => ({ ...now, sort: false });
/** What a finger can reach. The open sheet covers the whole screen and takes every touch; closed (even while it is
 * still sliding away) it takes none, so the tabs and the mini player answer at once. */
export const reachable = (nav: Nav, place: Place, hasSong: boolean) => {
  const sheet = nav.sheet !== 'none';
  return { sheet, tabs: !sheet && !place.sort, mini: !sheet && hasSong };
};

export const CLOSE_PULL = 120;
export const CLOSE_SPEED = 0.8;
/** A pull let go: far or fast enough closes, anything less springs back. */
export const pullCloses = (dy: number, vy: number) => dy > CLOSE_PULL || vy > CLOSE_SPEED;

/** What the slide needs from the screen: `animate` slides to on screen (0) or off the bottom (1) and calls `done` when it
 * stops (`finished` false: something else moved it first); `later` runs after the tap's own work. */
export type SlideIO = {
  animate: (to: 0 | 1, done: (finished: boolean) => void) => void;
  setMounted: (mounted: boolean) => void;
  later: (fn: () => void) => void;
  onGone?: () => void;
  /** A slide ran to its end: on screen (0) or gone (1). */
  onSettled?: (at: 0 | 1) => void;
};

/** One sliding layer. `setOpen` is the only thing that says where it belongs; every slide heads there, and a pull let
 * go ends there too. Nothing waits for an animation to finish before the next request counts. */
export function slideController(io: SlideIO) {
  let open = false;
  let mounted = false;
  let heading: 0 | 1 | null = null; // where a slide is going right now; null: resting or under a finger
  let running: object | null = null; // the slide in flight: an older slide's late end is told apart by this, not by its direction
  let again = false; // one more try after a slide that stopped short, never a loop
  const rest = () => {
    const to = open ? 0 : 1;
    if (heading === to) return;
    heading = to;
    const mine = (running = {});
    io.animate(to, (finished) => {
      if (running !== mine) return; // turned round or grabbed meanwhile: that slide's end says nothing
      running = null;
      heading = null;
      if (!finished) {
        // stopped short with nothing else moving it: go on to where it belongs, once
        if (again) return;
        again = true;
        return rest();
      }
      again = false;
      io.onSettled?.(to);
      if (to === 1 && !open && mounted) {
        mounted = false;
        io.setMounted(false);
        io.onGone?.();
      }
    });
  };
  return {
    setOpen(next: boolean) {
      open = next;
      again = false; // a new request gets its own retry
      if (open && !mounted) {
        mounted = true;
        io.setMounted(true);
      }
      rest();
    },
    /** A finger has it: no slide is running any more. */
    grabbed() {
      heading = null;
      running = null;
    },
    /** Let go. `close`: pulled far enough, so `onClose` changes the state. Either way it ends where the state says. */
    released(close: boolean, onClose: () => void) {
      heading = null;
      running = null;
      again = false;
      if (close) onClose();
      io.later(rest);
    },
    now: () => ({ open, mounted, heading }),
  };
}
