// The hidden lock-screen log (Batch 6.7): what the queue's player and Compare did, with times, so a press that needs a
// second try can be read instead of guessed. Memory only, the last MAX_LINES; it starts empty each time the app opens.
// Shown by a long press on the home screen's Update line. No React Native here, so the engine tests can load it.
const MAX_LINES = 300;
const lines: { at: number; text: string; times: number }[] = [];

const clock = (at: number) => {
  const d = new Date(at);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
};

/** Adds a line. The same line again right after only counts up, so a repeat every tick can't flood the log. */
export function note(text: string) {
  const last = lines.at(-1);
  if (last && last.text === text) {
    last.times++;
    return;
  }
  lines.push({ at: Date.now(), text, times: 1 });
  if (lines.length > MAX_LINES) lines.shift();
}

/** The whole log as text, oldest first. */
export const logText = () =>
  lines.length ? lines.map((l) => `${clock(l.at)}  ${l.text}${l.times > 1 ? ` (x${l.times})` : ''}`).join('\n') : 'Nothing logged yet.';
