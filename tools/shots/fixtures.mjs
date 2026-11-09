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
const player = (fix, steps) => ({ fix: { screen: 'player', ...fix }, steps });

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
  { name: 'sort', fix: { screen: 'sort', routes: { '/sorting': { total: 40, songs: songs.map((s) => ({ ...s, mine: 'unknown', sorted: false })), sets: [] } } } },
];
