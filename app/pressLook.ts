// The pressed look's timing, on its own (LESSONS 2026-11-09: Next stayed lit until the song loaded). One animation,
// handed to the phone's animation thread at finger-down: lit at once, let go FLASH_MS later, whatever the app's own
// thread is doing. Never a chain of steps: a second step would wait for the app's thread to start it.
// No React Native here, so a test can load it.

/** How long a control stays lit after the finger lands. */
export const FLASH_MS = 100;
/** The whole animation: lit within a frame, held, then gone within a frame. */
export const FLASH_TOTAL_MS = FLASH_MS + 20;
/** The animation runs a value 0 to 1 in a straight line; this turns it into how lit the control is. */
export const FLASH_CURVE = { inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 1, 1, 0] };

/** How lit (0 to 1) a control is this many ms after finger-down. What the phone's animation thread draws. */
export function litAt(ms: number): number {
  if (ms < 0 || ms >= FLASH_TOTAL_MS) return 0;
  const x = ms / FLASH_TOTAL_MS;
  const { inputRange: i, outputRange: o } = FLASH_CURVE;
  for (let n = 1; n < i.length; n++) {
    if (x <= i[n]) return o[n - 1] + ((o[n] - o[n - 1]) * (x - i[n - 1])) / (i[n] - i[n - 1]);
  }
  return 0;
}

/** The old look, for the test's before number: lit until the app's thread is free to draw the let-go. */
export const oldLetGoAt = (releasedAt: number, threadFreeAt: number) => Math.max(releasedAt, threadFreeAt);
