// Talking to the laptop (overhaul wave 4, B and C): node --experimental-strip-types app/laptop.test.mjs
// B: the laptop's address still saves and survives a restart of the app, now that it's changed in Settings.
// C: catch 4 (the probe passes, the list fetch times out: no loop) and catch 5 (a backup timeout isn't "laptop off").
// The rules under test are the ones the phone runs (laptopCore.ts, sheetCore.ts); the wiring is pinned by reading the code.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANSWERS_NOW_MS, backupDidntSave, callFailure, cleanAddress, LIST_RETRY_WAITS_MS, listRetrier, listRetryWait, loadAddress, saveAddress, serverUrl, TIMED_OUT } from './laptopCore.ts';
import { reachable, samePlace, searchOpened, settingsClosed, settingsOpened, sortOpened, tabTapped } from './sheetCore.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};
const code = (file) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

// ---------- a pretend phone: a file and a Keychain that outlive the app ------------------------------------------------
const phone = () => ({ file: '', kept: '', fileBroken: false });
/** What the app holds while it runs: made new at every "restart", over the same phone. */
const io = (disk) => ({
  readFile: () => disk.file,
  writeFile: (address) => {
    if (disk.fileBroken) throw new Error('disk full');
    disk.file = address;
  },
  readKept: () => disk.kept,
  keep: (address) => (disk.kept = address),
});

ok('B: an address saved in Settings is there after the app restarts', () => {
  const disk = phone();
  assert.equal(loadAddress(io(disk)), '', 'first run: nothing yet, so the box shows');
  assert.equal(saveAddress(io(disk), 'laptop.example'), 'laptop.example');
  assert.equal(loadAddress(io(disk)), 'laptop.example', 'a new app over the same phone finds it');
  assert.equal(disk.kept, 'laptop.example', 'and the Keychain has it too');
});

ok('B: changed, then restarted: the new one, never the old', () => {
  const disk = phone();
  saveAddress(io(disk), 'old.example');
  saveAddress(io(disk), 'new.example:9000');
  assert.equal(loadAddress(io(disk)), 'new.example:9000');
  assert.equal(disk.kept, 'new.example:9000');
});

ok('B: a reinstall wipes the file: the Keychain gives the address back and the file is healed', () => {
  const disk = phone();
  saveAddress(io(disk), 'laptop.example');
  disk.file = '';
  assert.equal(loadAddress(io(disk)), 'laptop.example');
  assert.equal(disk.file, 'laptop.example');
});

ok('B: nothing typed saves nothing; a full phone still keeps the address in the Keychain', () => {
  const disk = phone();
  saveAddress(io(disk), 'laptop.example');
  for (const empty of ['', '   ', '\n']) assert.equal(saveAddress(io(disk), empty), null);
  assert.equal(loadAddress(io(disk)), 'laptop.example', 'the saved one is untouched');
  const full = { ...phone(), fileBroken: true };
  assert.equal(saveAddress(io(full), 'laptop.example'), 'laptop.example');
  assert.equal(loadAddress(io(full)), 'laptop.example', 'from the Keychain, though the file could not be written');
});

ok('B: an address typed with spaces, http://, a port or a trailing slash still reaches the laptop', () => {
  const cases = [
    ['laptop.example', 'http://laptop.example:8787'],
    ['  laptop.example ', 'http://laptop.example:8787'],
    ['laptop. example', 'http://laptop.example:8787'],
    ['http://laptop.example', 'http://laptop.example:8787'],
    ['HTTP://laptop.example/', 'HTTP://laptop.example:8787'],
    ['https://laptop.example', 'https://laptop.example:8787'],
    ['laptop.example:9000', 'http://laptop.example:9000'],
    ['laptop.example:9000///', 'http://laptop.example:9000'],
  ];
  for (const [typed, url] of cases) assert.equal(serverUrl(typed), url, typed);
  assert.equal(cleanAddress(' laptop.example\n'), 'laptop.example');
  const disk = phone();
  assert.equal(saveAddress(io(disk), ' laptop.example '), 'laptop.example', 'kept without the spaces');
});

ok('B: the phone runs these rules: App reads and saves through laptopCore, and Settings saves through App', () => {
  const app = code('./App.tsx');
  assert.ok(app.includes('const loadAddress = () => loadKept(addressIO);') && app.includes('useState(loadAddress)'), 'read at open');
  const save = app.slice(app.indexOf('const saveTyped'), app.indexOf('const save = '));
  assert.ok(save.indexOf('saveKept(addressIO, typed)') > 0 && save.indexOf('saveKept(addressIO, typed)') < save.indexOf('setAddress(next)'), 'saved to the phone before the screen shows it');
  assert.ok(app.includes('onSave={saveTyped}') && app.includes('onBack={closeSettings}'));
  assert.ok(!/serverUrl = \(/.test(app), "App has no address rule of its own");
  const settings = code('./Settings.tsx');
  assert.ok(settings.includes('if (onSave(draft)) setEditing(false);'), 'the box closes only once the address is saved');
  assert.ok(!/expo-file-system|keychain/.test(settings), 'Settings never writes the address itself');
  // changing the address while a song plays leaves the song alone, and the next song is fetched from the new address
  assert.ok(/restore\(serverUrl: string\) \{\s*if \(state\.order\) \{\s*if \(serverUrl\) url = serverUrl;\s*return;\s*\}/.test(code('./playerStore.ts')));
  assert.ok(app.includes("setLine((was) => was || 'Checking the laptop…');"), 'the last answer stays on screen until the new one comes');
});

// ---------- B: Settings as a place ---------------------------------------------------------------------------------------
ok('B: Settings opens over Home; Back, a tab, Sort or search leaves it; the tab bar and mini player stay reachable', () => {
  const home = { tab: 'home', sort: false };
  const open = settingsOpened({ tab: 'library', sort: false });
  assert.deepEqual(open, { tab: 'home', sort: false, settings: true });
  assert.deepEqual(settingsClosed(open), home, 'Back: Home');
  assert.deepEqual(tabTapped(open, 'library'), { tab: 'library', sort: false });
  assert.deepEqual(tabTapped(open, 'home'), home, 'the Home tab closes it too');
  assert.deepEqual(sortOpened(open), { tab: 'home', sort: true });
  assert.deepEqual(searchOpened(open), { tab: 'search', sort: false });
  assert.ok(!samePlace(open, home) && samePlace(open, settingsOpened(home)) && samePlace(home, { tab: 'home', sort: false }), 'opening and closing it redraws; opening it twice does not');
  assert.deepEqual(reachable({ sheet: 'none', queueFrom: 'none' }, open, true), { sheet: false, tabs: true, mini: true });
  const nav = code('./nav.tsx');
  assert.ok(nav.includes('setPlace(settingsOpened(place))') && nav.includes('setPlace(settingsClosed(place))') && nav.includes('if (samePlace(next, place)) return;'), 'the place moves by the tested rules');
});

ok('B: first run has no Settings and no gear: Home shows the address box instead', () => {
  const app = code('./App.tsx');
  assert.ok(app.includes('{settings && url ? ('), 'no address, no Settings screen');
  const home = code('./Home.tsx');
  assert.ok(/\{url \? \(\s*<Tap style=\{s\.gear\}[^>]*onPress=\{onSettings\} accessibilityLabel="Settings">/.test(home), 'the gear only once there is a laptop');
  assert.ok(home.includes('{!url ? setup : ('), 'the box in place of everything playable');
  assert.ok(!/Change laptop address|Data since|Lock-screen log/.test(home) && !/Change laptop address|Data since|Lock-screen log/.test(app), 'the setup bits live in Settings only');
  const settings = code('./Settings.tsx');
  for (const words of ['Change laptop address', 'Data since', 'Lock-screen log', 'Laptop address']) assert.ok(settings.includes(words), words);
});

// ---------- C, catch 4: the probe passes, the list fetch times out -------------------------------------------------------
/** A pretend phone around the rule the phone runs (`listRetrier`, or `make` for the old rule): a clock, timers, a list
 * fetch that takes 10 s and ends as `fetchWorks(now)` says, and a small call every 15 s that reaches the laptop when
 * `probeWorks(now)`. Library's part is played as Library.tsx plays it: started / came / failed, and every change of
 * "reachable" handed on. Returns how often the list was asked for, and how often the "Laptop not reachable" line went
 * away and came back. */
function library({ minutes, fetchWorks, probeWorks = () => true, make = listRetrier, taps = [] }) {
  let now = 0;
  let timers = [];
  let fetches = 0;
  let blinks = 0;
  let failed = false; // Library's own: the line is up
  let reach = null; // what the rest of the app last found
  let fetchEnds = null;
  let byItself = false;
  const setReach = (next) => {
    if (next === reach) return;
    reach = next;
    retrier.reachable(next); // Library's effect on [reachable]
  };
  const start = () => {
    fetches++;
    if (!byItself) failed = false;
    byItself = false;
    retrier.started();
    fetchEnds = now + 10_000;
  };
  const retrier = make({
    now: () => now,
    later: (fn, ms) => {
      const timer = { at: now + ms, fn };
      timers.push(timer);
      return timer;
    },
    cancel: (timer) => (timers = timers.filter((one) => one !== timer)),
    ask: () => {
      assert.equal(fetchEnds, null, 'never a second list fetch while one is on its way');
      byItself = true;
      start();
    },
  });
  start();
  let lineUp = false;
  for (; now <= minutes * 60_000; now += 1000) {
    if (fetchEnds !== null && now >= fetchEnds) {
      fetchEnds = null;
      if (fetchWorks(now)) {
        retrier.came();
        failed = false;
        setReach(true);
      } else {
        retrier.failed();
        failed = true;
        setReach(false);
      }
    }
    if (now > 0 && now % 15_000 === 0) setReach(probeWorks(now));
    for (const timer of timers.filter((one) => one.at <= now)) {
      timers = timers.filter((one) => one !== timer);
      timer.fn();
    }
    if (taps.includes(now) && fetchEnds === null) start(); // a tap on the line
    const up = failed || reach === false;
    if (lineUp && !up && failed) blinks++;
    if (lineUp && !failed && fetchEnds !== null) blinks++; // the line dropped only because a try began
    lineUp = up;
  }
  return { fetches, blinks, failed, state: retrier.now() };
}
/** The rule before wave 4: asked again every time anything reached the laptop. */
const oldRule = (io) => {
  let failed = false;
  return { started() {}, came: () => (failed = false), failed: () => (failed = true), reachable: (next) => failed && next === true && io.ask(), stop() {}, now: () => ({}) };
};

ok('catch 4: the probe passes while the list fetch times out: the list is asked a handful of times, not for ever', () => {
  const old = library({ minutes: 30, fetchWorks: () => false, make: oldRule });
  assert.ok(old.fetches > 60, `the old rule asked again on every small call: ${old.fetches} list fetches in 30 min`);
  const now = library({ minutes: 30, fetchWorks: () => false });
  // the first, one more as soon as a small call gets through, one a minute later, then one every five minutes
  assert.ok(now.fetches <= 9, `${now.fetches} list fetches in 30 min`);
  assert.ok(now.fetches >= 4, 'and it does keep trying');
  assert.ok(now.failed && now.state.failed);
});

ok('catch 4: laptop off, then back on: the first small call that gets through asks for the list at once, and the line clears by itself', () => {
  const backAt = 5 * 60_000;
  const run = library({ minutes: 7, fetchWorks: (now) => now >= backAt, probeWorks: (now) => now >= backAt });
  assert.ok(!run.failed, 'cleared without a tap');
  assert.equal(run.fetches, 2, 'the one that failed, and one when the laptop came back');
  assert.deepEqual(run.state, { fails: 0, failed: false, waiting: false }, 'the count starts again once a list comes');
  // off for an hour: nothing is asked while nothing reaches the laptop
  assert.equal(library({ minutes: 60, fetchWorks: () => false, probeWorks: () => false }).fetches, 1);
});

ok('catch 4: a tap on the line always asks now, and never doubles a try already on its way', () => {
  const tapAt = 3 * 60_000 + 7000; // in the middle of a five-minute wait
  const quiet = library({ minutes: 4, fetchWorks: () => false });
  const tapped = library({ minutes: 4, fetchWorks: () => false, taps: [tapAt] });
  assert.equal(tapped.fetches, quiet.fetches + 1);
});

ok('catch 4: the waits: none after the first failure, a minute after the second, five minutes from then on', () => {
  assert.deepEqual(LIST_RETRY_WAITS_MS, [0, 60_000, 300_000]);
  assert.equal(listRetryWait(1, 1000, 1000), 0);
  assert.equal(listRetryWait(2, 1000, 1000), 60_000);
  assert.equal(listRetryWait(2, 1000, 41_000), 20_000, 'what is left of the minute');
  assert.equal(listRetryWait(2, 1000, 99_000), 0);
  assert.equal(listRetryWait(3, 0, 0), 300_000);
  assert.equal(listRetryWait(40, 0, 0), 300_000, 'never longer than five minutes');
});

ok('catch 4: the line does not blink while the app keeps trying by itself', () => {
  assert.equal(library({ minutes: 30, fetchWorks: () => false }).blinks, 0);
});

ok('catch 4: the phone runs this rule: Library hands it every start, list, failure and change of "reachable", and has no retry rule of its own', () => {
  const lib = code('./Library.tsx');
  assert.ok(/listRetrier\(\{\s*now: Date\.now,\s*later: \(fn, ms\) => setTimeout\(fn, ms\),/.test(lib));
  const fetching = lib.slice(lib.indexOf('const abort = new AbortController();'), lib.indexOf('}, [url, attempt]);'));
  assert.ok(fetching.indexOf('retrier.started();') > 0 && fetching.indexOf('retrier.started();') < fetching.indexOf('await fetch('), 'every fetch, tapped or not');
  assert.ok(fetching.indexOf('retrier.came();') > fetching.indexOf('await r.json()') && fetching.indexOf('retrier.failed();') > fetching.indexOf('} catch {'));
  assert.ok(lib.includes('useEffect(() => retrier.reachable(reachable), [reachable, retrier]);'));
  assert.ok(lib.includes('useEffect(() => retrier.stop, [retrier]);'), 'a waiting try is dropped when the screen goes');
  assert.ok(!/reachable === true\) setAttempt/.test(lib) && (lib.match(/setAttempt\(\(n\) => n \+ 1\)/g) ?? []).length === 2, 'by itself the list is only asked for by the rule (and once the outbox empties)');
  assert.ok(lib.includes('if (!byItself.current) setFailed(false);'), 'the line stays up through an automatic try: it cannot blink');
  assert.ok(/onPress=\{\(\) => setAttempt\(attempt \+ 1\)\}/.test(lib), 'a tap on the line asks now');
});

// ---------- C, catch 5: a backup that timed out ---------------------------------------------------------------------------
ok('catch 5: a backup timeout with the laptop answering says "didn\'t save"; with the laptop silent it stays quiet', () => {
  assert.equal(callFailure('Server said 500'), 'refused');
  assert.equal(callFailure(TIMED_OUT), 'timeout');
  assert.equal(callFailure('Network request failed'), 'silent');
  assert.equal(callFailure('Aborted'), 'silent', "only our own timer's message counts as a timeout");
  assert.ok(backupDidntSave('refused', false) && backupDidntSave('refused', true));
  assert.ok(backupDidntSave('timeout', true), 'the laptop is on and the backup did not go: say so (it used to read as laptop off)');
  assert.ok(!backupDidntSave('timeout', false), 'the laptop is off: Library says so, nothing more');
  assert.ok(!backupDidntSave('silent', false) && !backupDidntSave('silent', true));
  // a fresh install still waiting for its old backup has sent nothing: its timeout stays quiet (review, catch 3)
  assert.ok(!backupDidntSave('timeout', true, true), 'nothing was sent, so nothing "didn\'t save"');
  assert.ok(backupDidntSave('refused', true, true), 'a refusal is still said, as before');
  assert.ok(ANSWERS_NOW_MS <= 3000, 'the one small call gives up fast: a laptop that is off does not hold the next backup');
});

ok('catch 5: the phone runs this: its own timeout is named, and one small call tells slow from off', () => {
  const backup = code('./phoneBackup.ts');
  assert.ok(backup.includes('if (abort.signal.aborted) throw new Error(TIMED_OUT);'), 'the 10 s wait running out is told apart from no answer');
  const caught = backup.slice(backup.indexOf('const failure = callFailure('), backup.indexOf('} finally {\n    busy = false;'));
  assert.ok(/if \(failure === 'timeout' && !state\.waiting\) \{\s*try \{\s*await call\('\/health', undefined, ANSWERS_NOW_MS\);\s*answersNow = true;/.test(caught), 'something only the laptop answers');
  assert.ok(/if \(!backupDidntSave\(failure, answersNow, state\.waiting\)\) \{\s*healthAt = 0;\s*return;/.test(caught));
  assert.ok(caught.includes('update({ saveFailed: true })'));
  assert.ok(code('./Notices.tsx').includes("This phone's backup didn't save on the laptop. Tap to try again."));
});

console.log(`\n${n} laptop checks passed`);
