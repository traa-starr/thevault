// Fake data only: made-up titles and tag words. Each fixture is one screenshot; `steps` run in the page after the first draw.
const song = { id: 's1', title: 'Midnight Run (rough 3)', mine: 'mine', sorted: true };
const at = (sec, text, i = 0, onPhone = false) => ({ id: `t${i}`, song_id: 's1', version_id: 'v1', text, at_sec: sec, made_at: `2026-11-08T10:${String(i).padStart(2, '0')}:00Z`, onPhone });
const words = ['hook comes in', 'double the ad-libs', 'beat switch', 'punch in here', 'breath', 'second verse', 'mumble line, rewrite', 'snare roll', 'the good take', 'outro idea'];
const tags = (n) => Array.from({ length: n }, (_, i) => at(5 + i * 6.5, words[i % words.length], i));
const LONG = 'this whole line needs to be rewritten because the flow trips over itself 🔥🔥 and the rhyme lands one bar late, fix the cadence';
const tagFile = (list) => ({ 'tags.json': JSON.stringify(list.map(({ onPhone, ...t }) => t)) });
const playing = (extra = {}) => ({ song, time: 62, duration: 214, wanted: true, order: { shuffle: false }, pool: 'mine', ...extra });
const titles = ['Midnight Run', 'Cold Brew Freestyle', 'Lights Out (demo)', 'No Sleep 2', 'Paper Planes idea', 'Basement Tape 4',
  'Gold Teeth', 'Window Seat', 'Static', 'Late Checkout', 'Rooftop', 'Still Here', 'Overtime', 'Blue Hour', 'Echo Park'];
const songs = titles.map((title, i) => ({ id: `s${i + 1}`, title, mine: i % 3 !== 1 ? 'mine' : 'unknown', sorted: i % 3 !== 2, where: 'laptop', date: `2025-0${(i % 9) + 1}-1${i % 9}`, folder: 'x', size: 4e6 }));
const MINE = songs.filter((one) => one.mine === 'mine').map((one) => one.id);
const LAP = [...MINE].reverse();
const SEARCH_TAGS = tagFile([
  { ...at(12, "drippin' on the beat, double it", 0), song_id: 's3' },
  { ...at(47, 'the beat drops here', 1), song_id: 's5' },
  { ...at(95, 'too much drip in the mix', 2), song_id: 's8' },
  { ...at(130, 'beat switch', 3), song_id: 's3' },
  { ...at(20, 'hook comes in', 4), song_id: 's1' },
]);
const MANY = Array.from({ length: 120 }, (_, i) => ({ id: `m${i}`, title: `${titles[i % titles.length]} ${Math.floor(i / titles.length) + 1}`, mine: 'mine', sorted: true, where: 'laptop', date: '2025-01-01', folder: 'x', size: 4e6 }));
const MANY_TAGS = tagFile(MANY.map((one, i) => ({ ...at(10 + i, `${words[i % words.length]} hook take ${i}`, i), id: `h${i}`, song_id: one.id })));
const rated = (ratings) => songs.map((one) => ({ ...one, rating: ratings[one.id] ?? null }));
const player = (fix, steps) => ({ fix: { screen: 'player', ...fix }, steps });
// the whole app: Home first; steps walk to Library or Sort and open the sheet, as taps would
const SORTING = { total: 40, songs: songs.map((s) => ({ ...s, mine: 'unknown', sorted: false })), sets: [] };
const whole = (fix = {}, steps = []) => ({
  fix: {
    screen: 'app', songs, upNext: songs.slice(1, 9).map((one) => one.id), routes: { '/status': { songs: 1395 }, '/sorting': SORTING },
    ...fix, files: { 'laptop-address.txt': 'laptop', ...tagFile(tags(2)), ...(fix.files ?? {}) }, player: playing({ sheet: 'none', ...(fix.player ?? {}) }),
  },
  steps,
});
const LIB = "app.goTab('library')";
const SORT = "app.openSort()";
const HOME = "app.goTab('home')";
// play data for Home's rows: five songs heard lately, three not for a long while, the rest never. Dates spread over
// the years, so tiles run from dark (old) to bright (new)
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const HEARD = { s1: [14, 0], s3: [3, 1], s4: [1, 2], s7: [6, 4], s9: [2, 9], s10: [1, 45], s12: [5, 120], s13: [2, 400] };
const played = songs.map((one, i) => ({ ...one, date: `${2014 + (i * 5) % 13}-0${(i % 9) + 1}-1${i % 9}`, plays: HEARD[one.id]?.[0] ?? 0, last_heard: HEARD[one.id] ? daysAgo(HEARD[one.id][1]) : null, length: 214 }));
const HARD_TITLES = ['this is the one where the hook finally lands after the second verse (final final v7 REAL) 🔥', 'NO SLEEP TILL THE MIX IS DONE', 'Untitled 2019-03-14', 'ночной забег (demo)', 'verylongtitlewithnospacesatallbecauseitwasbouncedstraightfromtheprojectname_v12', '???'];
const hard = played.map((one, i) => (i < HARD_TITLES.length ? { ...one, title: HARD_TITLES[i] } : one));
const art = (title, date, extra = {}) => player({ player: playing({ song: { ...song, title } }), songs: [{ ...songs[0], title, date }], files: tagFile(tags(4)), ...extra });
const OPEN = "app.player.open('player')";
const QUEUE = "app.player.open('queue')";
const PULL = [195, 76, 330]; // the grab area at the top of the sheet, pulled 254 pt down and held
const VERSION_TITLES = { s1: 'Midnight Run (rough 3)', 's1-1': 'Midnight Run (rough 2)', 's1-2': 'Midnight Run (first take)' };

export const fixtures = [
  { name: 'player-0-tags', ...player({ player: playing(), files: tagFile([]) }) },
  { name: 'player-0-tags-list-open', ...player({ player: playing(), files: tagFile([]) }, ["app.tagLine.toggleList('s1')"]) },
  { name: 'player-1-tag', ...player({ player: playing(), files: tagFile(tags(1)) }, ["app.tagLine.toggleList('s1')"]) },
  { name: 'player-30-tags', ...player({ player: playing(), files: tagFile(tags(30)) }, ["app.tagLine.toggleList('s1')"]) },
  { name: 'player-long-words', ...player({ player: playing(), files: tagFile([at(12, LONG, 0), at(40, '', 1), at(61, 'short 😅', 2)]) }, ["app.tagLine.toggleList('s1')", "app.jumpToTag({id:'t0',at_sec:12,text:" + JSON.stringify(LONG) + '})']) },
  { name: 'player-field-open', ...player({ player: playing(), files: tagFile(tags(3)) }, ["app.tagLine.toggleList('s1')", "app.tagLine.tap('s1','Midnight Run (rough 3)',62.4)"]) },
  { name: 'player-two-notices', ...player({ player: playing({ order: { shuffle: true } }), files: tagFile(tags(3)) }, ["app.say({text:'',bold:'1:02  punch in here'})", "app.sayAside({text:'Shuffle: ',bold:'Unsorted'})"]) },
  { name: 'player-undo-and-shuffle', ...player({ player: playing({ order: { shuffle: true } }), files: tagFile(tags(3)) }, ["app.sayAside({text:'Shuffle: ',bold:'Mine'})", "app.say({text:'Tagged at ',bold:'1:02',undo:()=>{}})"]) },
  { name: 'player-hold-menu', ...player({ player: playing(), files: tagFile(tags(5)) }, ["app.tagLine.toggleList('s1')", "app.tagLine.hold('t1')"]) },
  { name: 'player-change-words', ...player({ player: playing(), files: tagFile(tags(5)) }, ["app.tagLine.toggleList('s1')", "app.tagLine.changeWords({id:'t1',song_id:'s1',version_id:'v1',text:'double the ad-libs',at_sec:11.5,made_at:'m'}, 'Midnight Run (rough 3)', 's1')"]) },
  { name: 'player-moved-keeps-row', ...player({ player: playing(), files: tagFile(tags(5)) }, ["app.tagLine.toggleList('s1')", "app.tagLine.moveToNow({id:'t0',song_id:'s1',version_id:'v1',text:'hook comes in',at_sec:5,made_at:'m'}, 62)"]) },
  { name: 'player-deleted-undo', ...player({ player: playing(), files: tagFile(tags(5)) }, ["app.tagLine.toggleList('s1')", "app.tagLine.delete({id:'t2',song_id:'s1',version_id:'v1',text:'beat switch',at_sec:18,made_at:'m'})"]) },
  // the tagging session: s1 and two more Mine songs tagged (5 of the 10 Mine songs untagged)
  { name: 'session-card', ...player({ player: playing(), songs, files: tagFile([]) }, ["app.session.start('http://laptop')"]) },
  { name: 'session-tagged-list', ...player({ player: playing(), songs, files: tagFile([...tags(3), { ...at(30, 'x', 9), song_id: 's2' }]) }, ["app.session.start('http://laptop')", "app.tagLine.toggleList('s1')"]) },
  { name: 'session-field-open', ...player({ player: playing(), songs, files: tagFile(tags(2)) }, ["app.session.start('http://laptop')", "app.tagLine.tap('s1','Midnight Run (rough 3)',62.4)"]) },
  { name: 'session-not-mine-undo', ...player({ player: playing(), songs, files: tagFile(tags(2)) }, ["app.session.start('http://laptop')", 'app.session.notMine()']) },
  { name: 'session-30-tags', ...player({ player: playing(), songs, files: tagFile(tags(30)) }, ["app.session.start('http://laptop')", "app.tagLine.toggleList('s1')"]) },
  // after an app kill: the player came back on the session's lap, so the session look comes back (s4 was Not mine)
  { name: 'session-restored', ...player({ player: playing({ sheet: 'none', order: { shuffle: false, list: LAP } }), songs, files: { ...tagFile(tags(2)), 'session.json': JSON.stringify({ v: 1, pool: MINE, out: ['s4'], lap: LAP }) } }, ['app.session.restore()']) },
  // a Library song played after the session: no session look
  { name: 'session-not-restored', ...player({ player: playing({ order: { shuffle: false, list: ['s2', 's5'] } }), songs, files: { ...tagFile(tags(2)), 'session.json': JSON.stringify({ v: 1, pool: MINE, out: [], lap: LAP }) } }, ['app.session.restore()']) },
  { name: 'session-long-words', ...player({ player: playing({ song: { ...song, title: 'A very long working title for a song that goes on (final final v7) 🔥' } }), songs, files: tagFile([at(12, LONG, 0)]) }, ["app.session.start('http://laptop')", "app.tagLine.toggleList('s1')", "app.tagLine.hold('t0')"]) },
  // rating (2.8): Fire in the slot left of Previous, Shelve between Back and Tag. Same boxes rated or not, from every
  // place the player opens, and with the eye hidden
  { name: 'rate-none-library', ...player({ player: playing(), songs, files: tagFile(tags(2)) }) },
  { name: 'rate-fire-library', same: 'rate-none-library', ...player({ player: playing(), songs: rated({ s1: 'fire' }), files: tagFile(tags(2)) }) },
  { name: 'rate-shelved-library', same: 'rate-none-library', ...player({ player: playing(), songs: rated({ s1: 'shelved' }), files: tagFile(tags(2)) }) },
  { name: 'rate-shelved-tap-undo', ...player({ player: playing(), songs, files: tagFile(tags(2)) }, ["app.ratingStore.tap('s1','Midnight Run (rough 3)','shelved')"]) },
  { name: 'rate-fire-eye-hidden', ...player({ player: playing({ buttonsHidden: true }), songs: rated({ s1: 'fire' }), files: tagFile(tags(2)) }) },
  { name: 'rate-none-session', ...player({ player: playing(), songs, files: tagFile(tags(2)) }, ["app.session.start('http://laptop')"]) },
  { name: 'rate-fire-session', same: 'rate-none-session', ...player({ player: playing(), songs: rated({ s1: 'fire' }), files: tagFile(tags(2)) }, ["app.session.start('http://laptop')"]) },
  { name: 'rate-sort-card-has-none', ...player({ player: playing({ sorting: true, song: { ...song, mine: 'unknown', sorted: false } }), files: tagFile([]) }) },
  { name: 'library-rated', fix: { screen: 'library', songs: rated({ s1: 'fire', s3: 'shelved', s4: 'fire', s7: 'shelved' }), onPhone: ['s1', 's3'] } },
  { name: 'library-fire-filter', fix: { screen: 'library', songs: rated({ s1: 'fire', s3: 'shelved', s4: 'fire' }) }, steps: ["app.tapText('Fire')"] },
  { name: 'search-typing-half-word', fix: { screen: 'library', songs: rated({ s8: 'shelved' }), files: SEARCH_TAGS }, steps: ["app.type('dri')"] },
  { name: 'search-shelved-only-hit', fix: { screen: 'library', songs: rated({ s8: 'shelved' }), files: SEARCH_TAGS }, steps: ["app.type('too much')"] },
  { name: 'library', fix: { screen: 'library', songs } },
  { name: 'library-shuffle-unsorted', fix: { screen: 'library', songs, player: playing({ order: { shuffle: true }, pool: 'unsorted' }) } },
  // Previous / Play / Next centred from every place the player opens (2026-11-08 review)
  { name: 'centre-library', ...player({ player: playing(), files: tagFile(tags(2)) }) },
  { name: 'centre-sort-card', ...player({ player: playing({ sorting: true, song: { ...song, mine: 'unknown', sorted: false } }), files: tagFile([]) }) },
  { name: 'centre-session', ...player({ player: playing(), songs, files: tagFile(tags(2)) }, ["app.session.start('http://laptop')"]) },
  { name: 'centre-restored', ...player({ player: playing({ sheet: 'none', order: { shuffle: false, list: LAP } }), songs, files: { ...tagFile(tags(2)), 'session.json': JSON.stringify({ v: 1, pool: MINE, out: [], lap: LAP }) } }, ['app.session.restore()']) },
  // play first, info after (2026-11-08): the first frame after a tap (start spot, no length, no tags yet) and the same
  // song once its length and tags arrived. `same`: every button and box must sit exactly where it did in that shot
  { name: 'info-before-library', ...player({ player: playing({ time: 0, duration: 0 }), files: tagFile([]) }) },
  { name: 'info-after-library', same: 'info-before-library', ...player({ player: playing({ time: 0, duration: 214 }), files: tagFile(tags(3)) }) },
  { name: 'info-before-sort-card', ...player({ player: playing({ time: 30, duration: 0, sorting: true, song: { ...song, mine: 'unknown', sorted: false } }), files: tagFile([]) }) },
  { name: 'info-after-sort-card', same: 'info-before-sort-card', ...player({ player: playing({ time: 30, duration: 214, sorting: true, song: { ...song, mine: 'unknown', sorted: false } }), files: tagFile(tags(3)) }) },
  { name: 'info-before-session', ...player({ player: playing({ time: 15, duration: 0 }), songs, files: tagFile([]) }, ["app.session.start('http://laptop')"]) },
  { name: 'info-after-session', same: 'info-before-session', ...player({ player: playing({ time: 15, duration: 214 }), songs, files: tagFile(tags(3)) }, ["app.session.start('http://laptop')"]) },
  { name: 'info-after-session-time-left', same: 'info-before-session', ...player({ player: playing({ time: 15, duration: 3725, timeLeft: true }), songs, files: tagFile(tags(3)) }, ["app.session.start('http://laptop')"]) },
  { name: 'centre-finding-start', ...player({ player: playing({ time: 15, duration: 0 }), songs, files: tagFile([]) }, ["app.session.start('http://laptop')"]) },
  // search on the phone: empty field, a match, no match, many results, keyboard up
  { name: 'search-empty', fix: { screen: 'library', songs, files: SEARCH_TAGS } },
  { name: 'search-match', fix: { screen: 'library', songs, files: SEARCH_TAGS }, steps: ["app.type('drip on the beat')"] },
  { name: 'search-no-match', fix: { screen: 'library', songs, files: SEARCH_TAGS }, steps: ["app.type('zzqx')"] },
  { name: 'search-emoji', fix: { screen: 'library', songs, files: SEARCH_TAGS }, steps: ["app.type('😀😀')"] },
  { name: 'search-many-keyboard', fix: { screen: 'library', songs: MANY, files: MANY_TAGS }, steps: ["app.type('hook')", 'app.keyboard()'] },
  { name: 'sort', fix: { screen: 'sort', routes: { '/sorting': SORTING } } },
  // ---- the whole app (2026-11-09): Home, the bar (mini player), the sheet as a layer, Queue from every opener ----
  // ---- overhaul wave 1 (2026-11-10): Wall's Home, the tabs, the mini player that grows, Deal's player ----
  { name: 'home', ...whole({ songs: played, player: { sheet: 'none', song: null } }) },
  { name: 'home-mini-player', ...whole({ songs: played }) },
  { name: 'home-fresh-wipe', ...whole({ player: { sheet: 'none', song: null } }) },
  { name: 'home-no-songs-yet', ...whole({ songs: [], player: { sheet: 'none', song: null } }) },
  { name: 'home-no-address', ...whole({ songs: [], files: { 'laptop-address.txt': '' }, player: { sheet: 'none', song: null } }) },
  { name: 'home-laptop-off', ...whole({ songs: played, laptopOff: true, onPhone: ['s1', 's3', 's4', 's13'], pending: [{ id: 'p1', kind: 'play_add', data: { play_id: 'x', song_id: 's5', started_at: daysAgo(0), seconds: 30, source: 'phone' } }, { id: 'p2', kind: 'rating_set', data: { song_id: 's5', value: 'fire' } }] }) },
  { name: 'home-hard-titles', ...whole({ songs: hard, player: { song: { ...song, title: HARD_TITLES[0] } } }) },
  { name: 'home-scrolled-to-more', ...whole({ songs: played }, ["document.querySelectorAll('div').forEach((el) => { if (el.scrollHeight > el.clientHeight + 40) el.scrollTop = 9999; })"]) },
  { name: 'library-tab', ...whole({ songs: played, player: { sheet: 'none', song: null } }, [LIB]) },
  { name: 'tabs-back-to-home', ...whole({ songs: played }, [LIB, HOME]) },
  // the player on a dark tile (an old song), a bright one (a new song) and the grey one (no letters in the title)
  { name: 'player-art-dark', ...art('Basement Tape 4', '2014-02-01') },
  { name: 'player-art-light', ...art('Summer Lights', '2026-06-01') },
  { name: 'player-art-none', ...art('???', null) },
  { name: 'player-art-70-chars', ...art(HARD_TITLES[0], '2021-01-01') },
  { name: 'player-art-caps', ...art(HARD_TITLES[1], '2019-01-01') },
  { name: 'player-art-no-spaces', ...art(HARD_TITLES[4], '2023-01-01') },
  { name: 'player-typing-keyboard', ...player({ player: playing(), files: tagFile(tags(3)) }, ["app.tagLine.tap('s1','Midnight Run (rough 3)',62.4)", 'app.keyboard()']) },
  { name: 'player-paused', ...player({ player: playing({ wanted: false }), files: tagFile(tags(3)) }) },
  // the mini player growing into the player: caught part-way, then a tab tapped while it grows, then pulled part-way down
  { name: 'grow-part-way', ...whole({ songs: played }, [OPEN]), wait: 90 },
  { name: 'grow-mid-tab-switch', ...whole({ songs: played }, [OPEN, LIB]), wait: 60 },
  { name: 'player-over-home', ...whole({ songs: played }, [OPEN]) },
  { name: 'player-mid-close-on-home', ...whole({ songs: played }, [OPEN]), drag: PULL },
  { name: 'player-mid-close-almost-mini', ...whole({ songs: played }, [OPEN]), drag: [195, 76, 640] },
  { name: 'library-mini-player', ...whole({}, [LIB]) },
  { name: 'sort-mini-player', ...whole({}, [SORT]) },
  { name: 'cards', ...whole({ player: { sheet: 'none' } }, [SORT, "app.tapText('Cards · 15 left')"]) },
  { name: 'player-over-library', ...whole({}, [LIB, OPEN]) },
  { name: 'queue-from-mini-library', ...whole({}, [LIB, QUEUE]) },
  { name: 'queue-from-player', ...whole({}, [LIB, OPEN, QUEUE]) },
  { name: 'versions-chip-in-player', ...whole({ versions: { s1: 3 }, titles: VERSION_TITLES }, [LIB, OPEN]) },
  { name: 'versions-sheet', ...whole({ versions: { s1: 3 }, titles: VERSION_TITLES, picked: ['s1'] }, [LIB, "app.versions.openVersions('s1')"]) },
  { name: 'compare-in-player', ...whole({ versions: { s1: 3 }, titles: VERSION_TITLES, compare: { ids: ['s1', 's1-1', 's1-2'], at: 1 }, player: { comparing: true } }, [LIB, OPEN]) },
  // B (LESSONS 2026-11-09): Queue pulled half-way down, from every opener. From the full player the player shows
  // under it, never the screen behind; from the mini player the screen it was opened on shows
  { name: 'queue-mid-close-player-on-library', ...whole({}, [LIB, OPEN, QUEUE]), drag: PULL },
  { name: 'queue-mid-close-player-on-sort', ...whole({}, [SORT, OPEN, QUEUE]), drag: PULL },
  { name: 'queue-mid-close-player-on-home', ...whole({}, [OPEN, QUEUE]), drag: PULL },
  { name: 'queue-mid-close-player-in-session', ...whole({}, [LIB, "app.session.start('http://laptop')", OPEN, QUEUE]), drag: PULL },
  { name: 'queue-mid-close-mini-on-library', ...whole({}, [LIB, QUEUE]), drag: PULL },
  { name: 'queue-mid-close-mini-on-sort', ...whole({}, [SORT, QUEUE]), drag: PULL },
  { name: 'queue-mid-close-mini-on-home', ...whole({}, [QUEUE]), drag: PULL },
  { name: 'player-mid-close-on-library', ...whole({}, [LIB, OPEN]), drag: PULL },
];
