// The Vault overhaul mockups (ROADMAP O.2): one small engine, three directions (body data-dir = wall | line | deal).
// Throwaway and fake: made-up song names and lines only, no sound, no laptop. Nothing here is app code.
const DIR = document.body.dataset.dir;
const NAMES = { wall: 'Wall', line: 'Line', deal: 'Deal' };
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);

// ---------- fake data: 1,395 songs, 671 Mine, the hard cases first ----------
const A = ['Midnight', 'Cold', 'Paper', 'Gold', 'Blue', 'Static', 'Late', 'Basement', 'Window', 'Echo', 'Lights', 'Rooftop', 'Still', 'Slow', 'Glass', 'Neon', 'Empty', 'Second', 'Loose', 'Summer'];
const B = ['Run', 'Brew', 'Planes', 'Teeth', 'Hour', 'Checkout', 'Tape', 'Seat', 'Park', 'Out', 'Overtime', 'Here', 'Motion', 'House', 'Signs', 'Rooms', 'Wind', 'Change', 'Letters', 'Static'];
const SUF = ['', '', '', ' (rough 2)', ' v3', ' (demo)', ' idea', ' freestyle', ' 2', ' (final?)'];
const HARD = [
  'Midnight Run (rough 3)',
  'this is the one where the hook finally lands after the second verse (final final v7 REAL) 🔥',
  'NO SLEEP TILL THE MIX IS DONE',
  'Untitled 2019-03-14',
  'ночной забег (demo)',
  'verylongtitlewithnospacesatallbecauseitwasbouncedstraightfromtheprojectname_v12',
];
const LINES = ['hook comes in', 'double the ad-libs here', 'beat switch', 'punch in from "cold hands"', 'breath, cut it', 'second verse starts', 'mumble line, rewrite it',
  'snare roll into the drop', 'the good take', 'outro idea, hum it', "drippin' on the beat, double it", 'too much reverb on the tail', 'this bar is the title', 'flow trips here', 'say it slower'];
const SONGS = Array.from({ length: 1395 }, (_, i) => {
  const title = i < HARD.length ? HARD[i] : `${A[Math.floor(rnd() * A.length)]} ${B[Math.floor(rnd() * B.length)]}${SUF[Math.floor(rnd() * SUF.length)]}`;
  const year = i < 4 ? 2025 : 2014 + Math.floor(rnd() * 13);
  const len = 95 + Math.floor(rnd() * 170);
  return { id: i, title, year, len, mine: i < 671, fire: [0, 9, 14, 23, 31].includes(i), shelved: [7, 19].includes(i), onPhone: i < 671 && i % 9 !== 8,
    cloud: i > 671 && i % 40 === 0, versions: i === 0 ? 4 : i === 12 ? 2 : 1, tags: [], heard: i < 8 ? i : 30 + Math.floor(rnd() * 900) };
});
const tagsFor = (song, n) => (song.tags = Array.from({ length: n }, (_, k) => ({ at: Math.round(((k + 0.6) / (n + 0.4)) * (song.len - 8)), text: LINES[(k * 7 + song.id) % LINES.length] })));
tagsFor(SONGS[0], 30); tagsFor(SONGS[2], 3); tagsFor(SONGS[8], 2); tagsFor(SONGS[9], 4); tagsFor(SONGS[14], 1); tagsFor(SONGS[20], 5); tagsFor(SONGS[23], 2); tagsFor(SONGS[31], 3); tagsFor(SONGS[40], 3);
const VERS = ['rough 3', 'rough 2', 'first take', 'phone demo'];

// ---------- state ----------
const S = { tab: 'home', sheet: false, over: null, cur: 0, playing: false, t: 62, filter: 'mine', q: '', draft: null, deck: 0, mode: null,
  off: false, slow: false, compare: 0, tagsOpen: false, undo: null, queue: [3, 9, 14, 20, 23, 31, 40, 44, 51, 60] };
const cur = () => SONGS[S.cur];

// ---------- pieces ----------
const tile = (s, cls = '') => {
  const h = hash(s.title) % 360, light = 22 + (s.year - 2014) * 2.2, ang = hash(s.title + 'a') % 360;
  const letters = (s.title.match(/[\p{L}\p{N}]/gu) || ['?']).slice(0, 2).join('');
  return `<span class="tile ${cls}" style="background:radial-gradient(circle at ${20 + (h % 60)}% ${15 + (ang % 50)}%,hsla(${h + 50},70%,${light + 22}%,.7),transparent 55%),linear-gradient(${ang}deg,hsl(${h},60%,${light}%),hsl(${h + 25},60%,${light + 16}%))"><b>${esc(letters)}</b></span>`;
};
const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>', pause: '<svg viewBox="0 0 24 24"><path d="M6 4.5h4.2v15H6zM13.8 4.5H18v15h-4.2z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M4 5.5v13l9.5-6.5zM13.5 5.5v13L23 12zM21 5.5h0"/></svg>', prev: '<svg viewBox="0 0 24 24"><path d="M20 5.5v13L10.500 12zM10.500 5.500v13L1 12z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  lib: '<svg viewBox="0 0 24 24"><path d="M4 4h3v16H4zM9.500 4h3v16h-3zM15.200 5.200l2.900-.8 4.100 15.400-2.900.8z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M10.500 3a7.500 7.500 0 0 1 5.900 12.100l4.700 4.700-1.600 1.600-4.700-4.700A7.500 7.500 0 1 1 10.500 3zm0 2.300a5.200 5.200 0 1 0 0 10.400 5.200 5.200 0 0 0 0-10.400z"/></svg>',
  fire: '<svg viewBox="0 0 24 24"><path d="M12.500 2c.6 3.400-1.300 5-2.800 6.700C8.300 10.300 7 12 7 14.500a5.500 5.500 0 0 0 11 0c0-2.300-1-3.900-2-5.200-.4 1.300-1 2-2 2.500.4-3.600-.6-7.300-1.500-9.800z"/></svg>',
  shelf: '<svg viewBox="0 0 24 24"><path d="M3 5h18v4H3zM5 10.500h14V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zm4.500 2.500v2h5v-2z"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3 4a1 1 0 0 1 1-1h7.600a1 1 0 0 1 .7.300l8.400 8.400a1 1 0 0 1 0 1.400l-7.600 7.600a1 1 0 0 1-1.400 0L3.300 12.300a1 1 0 0 1-.3-.7zm4.500 2A1.500 1.500 0 1 0 7.500 9a1.500 1.500 0 0 0 0-3z"/></svg>',
  stack: '<svg viewBox="0 0 24 24"><path d="M12 3l9 4.500-9 4.500-9-4.500zM3 12l2.300-1.200L12 14.200l6.700-3.400L21 12l-9 4.500zM3 16.500l2.300-1.200L12 18.700l6.700-3.400L21 16.500 12 21z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h10v2H4z"/></svg>', more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M5 8.500l7 7 7-7 1.500 1.500L12 18.500 3.500 10z"/></svg>',
};
const pill = (text) => `<span class="pill">${text}</span>`;
const marks = (s) => `${s.fire ? '<span class="mark">Fire</span>' : ''}${s.shelved ? '<span class="mark sh">Shelved</span>' : ''}`;
const playable = (s) => !s.cloud && (!S.off || s.onPhone);
const where = (s) => (s.cloud ? 'Cloud only' : s.onPhone ? 'On this phone' : S.off ? 'Not on this phone' : '');
const songRow = (s, extra = '') => `<button class="row ${playable(s) ? '' : 'off'} ${s.id === S.cur && S.started ? 'now' : ''}" data-act="play" data-id="${s.id}" style="width:100%;text-align:left">
  ${tile(s)}<span class="t"><div>${esc(s.title)}</div><div class="meta">${s.year}${s.versions > 1 ? ` · ${s.versions} versions` : ''}${s.tags.length ? ` · ${s.tags.length} lines` : ''}${where(s) && (S.off || s.cloud) ? ` · ${where(s)}` : ''}</div></span>${marks(s)}${extra}</button>`;
const small = (s, note = '') => `<button class="card-sm" data-act="play" data-id="${s.id}" style="text-align:left">${tile(s, 'md')}<div class="n">${esc(s.title)}</div><div class="meta">${note || s.year}</div></button>`;
const offBanner = () => (S.off ? '<div class="banner">Laptop not reachable. Songs on this phone still play; 2 changes waiting to send.</div>' : '');
const forgotten = () => SONGS.filter((s) => s.mine && !s.shelved && s.heard > 600).slice(0, 12);

// ---------- screens ----------
function home() {
  const recent = SONGS.slice(0, 8), fires = SONGS.filter((s) => s.fire);
  const tagRow = `<button class="quiet" data-act="session">${I.tag.replace('<svg', '<svg width="18" height="18"')} Tag a few · 23 songs have lines, 648 to go</button>`;
  const foot = `<button class="quiet" data-act="over" data-over="design">Design system and native pieces: ${NAMES[DIR]}</button>
    <button class="quiet" data-act="over" data-over="tests">Test cases: laptop off, slow load, tap sizes</button><a class="quiet" href="index.html" style="text-decoration:none">All three directions</a>`;
  if (DIR === 'deal') return `${offBanner()}<h1>Dealt for you ${pill('needs new logic: last heard')}</h1>${deck()}${tagRow}${foot}`;
  if (DIR === 'line') {
    const lines = SONGS.filter((s) => s.tags.length).slice(0, 5);
    return `${offBanner()}<h1>The Vault</h1>
      <button class="field hero" data-act="tab" data-tab="search" style="width:100%"><span class="ic" style="width:28px">${I.search}</span><span class="dim" style="font:22px var(--display)">Rap a line…</span></button>
      <h2>Lines you tagged lately</h2>${lines.map((s) => `<button class="row" data-act="play" data-id="${s.id}" data-at="${s.tags[0].at}" style="width:100%;text-align:left"><span class="t"><p class="lineq" style="white-space:normal">“${esc(s.tags[0].text)}”</p><div class="meta">${esc(s.title)} · ${clock(s.tags[0].at)}</div></span></button>`).join('')}
      <button class="big" data-act="shuffle" style="margin-top:20px;width:100%">Shuffle Mine</button>
      <h2>Not heard in a long time ${pill('needs new logic')}</h2>${forgotten().slice(0, 4).map((s) => songRow(s)).join('')}
      <h2>Recently played</h2>${recent.slice(0, 4).map((s) => songRow(s)).join('')}${tagRow}${foot}`;
  }
  return `${offBanner()}<h1>The Vault</h1>
    <button class="field" data-act="tab" data-tab="search" style="width:100%"><span class="ic" style="width:28px">${I.search}</span><span class="dim">Rap a line, or a title</span></button>
    <div style="display:flex;gap:10px;margin-top:14px"><button class="big" data-act="shuffle" style="flex:1">Shuffle Mine</button><button class="chip" style="min-height:48px;border-radius:24px" data-act="shuffle" data-fire="1">Fire only</button></div>
    <h2>Recently played</h2><div class="hscroll">${S.slow ? '<div class="skel" style="width:132px;height:132px"></div>'.repeat(3) : recent.map((s) => small(s)).join('')}</div>
    <h2>Rediscover ${pill('needs new logic')}</h2><div class="hscroll">${forgotten().map((s) => small(s, `${s.year} · not heard in ${Math.round(s.heard / 30)} months`)).join('')}</div>
    <h2>Fire</h2><div class="hscroll">${fires.map((s) => small(s)).join('')}</div>${tagRow}
    <button class="quiet" data-act="deck">Deal me songs, one at a time</button>${foot}`;
}
function deck() {
  const list = forgotten(), s = list[S.deck % list.length], back = list[(S.deck + 1) % list.length];
  const bg = (x) => tile(x).match(/style="([^"]+)"/)[1];
  return `<div class="deck"><div class="dcard back" style="${bg(back)}"></div>
    <div class="dcard" id="dcard" data-id="${s.id}" style="${bg(s)}"><span class="stamp f">FIRE</span><span class="stamp s">SHELVE</span>
      <h3>${esc(s.title)}</h3><div>${s.year} · ${clock(s.len)}${s.tags.length ? ` · ${s.tags.length} lines` : ''}</div><div class="meta" style="color:rgba(255,255,255,.7)">Not heard in ${Math.round(s.heard / 30)} months · plays from 0:30</div></div></div>
    <div class="dacts"><button data-act="deal" data-v="shelve">← Shelve</button><button data-act="deal" data-v="skip">Skip ↑</button><button class="tagb" data-act="open">Tag</button><button data-act="deal" data-v="fire">Fire →</button></div>`;
}
function library() {
  const f = S.filter;
  const list = SONGS.filter((s) => (f === 'mine' ? s.mine : f === 'fire' ? s.fire : f === 'grouped' ? s.versions > 1 : f === 'phone' ? s.onPhone : true));
  const sorted = S.az ? [...list].sort((a, b) => a.title.localeCompare(b.title)) : list;
  const chips = [['mine', 'Mine'], ['fire', 'Fire'], ['grouped', 'Versions'], ['phone', 'On this phone'], ['all', 'Everything']];
  return `${offBanner()}<h1>Library</h1>
    <div style="display:flex;gap:10px;margin-bottom:12px"><button class="big" data-act="shuffle" style="flex:1">Shuffle</button><button class="chip" style="min-height:48px;border-radius:24px" data-act="az">${S.az ? 'A to Z' : 'Newest'}</button></div>
    <div class="chips">${chips.map(([k, w]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${w}</button>`).join('')}</div>
    <div class="meta" style="margin:4px 0">${sorted.length.toLocaleString('en-US')} songs${f === 'mine' ? ' · 597 of 671 on this phone' : ''}</div>
    ${S.slow ? '<div class="row"><div class="skel" style="width:52px;height:52px"></div><div class="skel" style="flex:1"></div></div>'.repeat(8) : sorted.map((s) => songRow(s)).join('') || '<p class="dim" style="text-align:center;padding:40px 0">No Fire songs yet: tap Fire in the player</p>'}
    ${S.az ? `<div class="az">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => `<button data-act="jump" data-c="${c}">${c}</button>`).join('')}</div>` : ''}`;
}
function searchResults() {
  const q = S.q.trim().toLowerCase();
  if (!q) return `<h2>Try a line</h2>${['hook', 'beat', 'double', 'slower'].map((w) => `<button class="chip" data-act="q" data-q="${w}" style="margin:0 8px 8px 0">${w}</button>`).join('')}<p class="meta">Searches the lines you tagged, then titles. Works with the laptop off.</p>`;
  const hits = [];
  for (const s of SONGS) for (const t of s.tags) if (t.text.toLowerCase().includes(q)) { hits.push({ s, t }); break; }
  const titles = SONGS.filter((s) => s.title.toLowerCase().includes(q) && !hits.some((h) => h.s === s)).slice(0, 30);
  const bold = (text) => esc(text).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
  if (!hits.length && !titles.length) return `<p class="dim" style="text-align:center;padding:40px 0">No song or line has “${esc(q)}”</p>`;
  return `${hits.map(({ s, t }) => `<button class="row" data-act="play" data-id="${s.id}" data-at="${t.at}" style="width:100%;text-align:left">${tile(s, DIR === 'line' ? 'sm' : '')}<span class="t"><p class="lineq" style="font-size:${DIR === 'line' ? 20 : 17}px;white-space:normal">${bold(t.text)}</p><div class="meta">${esc(s.title)}</div></span><span class="meta">${clock(t.at)}</span></button>`).join('')}
    ${titles.length ? `<h2>Titles</h2>${titles.map((s) => songRow(s)).join('')}` : ''}`;
}
const search = () => `<h1>Search</h1><div class="field ${DIR === 'line' ? 'hero' : ''}"><span class="ic" style="width:28px">${I.search}</span><input id="q" placeholder="Rap a line…" value="${esc(S.q)}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></div><div id="results">${searchResults()}</div>`;

// ---------- the player ----------
function seek() {
  const s = cur(), pct = (S.t / s.len) * 100;
  const dots = s.tags.map((t) => `<i class="dot" style="left:${(t.at / s.len) * 100}%"></i>`).join('');
  if (DIR !== 'line') return `<div class="seek" id="seek"><i class="tr"></i><i class="fl" id="fl" style="width:${pct}%"></i>${dots}</div>`;
  const bars = Array.from({ length: 64 }, (_, i) => `<i class="${(i / 64) * 100 < pct ? 'p' : ''}" style="height:${18 + ((hash(s.title + i) % 70) * 0.6)}%"></i>`).join('');
  return `<div class="seek wave" id="seek"><div class="bars" id="bars">${bars}</div>${dots}</div>`;
}
function player() {
  const s = cur(), session = S.mode === 'session';
  const passed = [...s.tags].reverse().find((t) => t.at <= S.t);
  const resv = S.draft !== null
    ? `<span class="acc" style="font-variant-numeric:tabular-nums">${clock(S.draft)}</span><input id="draft" placeholder="A line to remember" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="quiet" data-act="canceltag">Cancel</button>`
    : DIR === 'line' ? '' : `<span class="dim" style="font-size:15px">${passed ? `${clock(passed.at)}  ${esc(passed.text)}` : ''}</span>`;
  const art = DIR === 'line'
    ? `<div style="min-height:20vh;display:flex;flex-direction:column;justify-content:center"><div class="meta">${passed ? clock(passed.at) : s.tags.length ? 'next line coming' : 'no lines yet: tap Tag when you hear one'}</div><p class="lineq" style="font-size:30px">${passed ? `“${esc(passed.text)}”` : '&nbsp;'}</p></div>`
    : `<div style="padding:${DIR === 'deal' ? '4px 0' : '4px 12px'}">${tile(s, 'xl')}</div>`;
  const top = session
    ? `<div style="display:flex;align-items:center;min-height:44px"><button class="quiet" data-act="close">Close</button><span class="meta" style="margin-left:auto">23 of 671 tagged</span></div>`
    : `<div class="grab" id="grab"><i></i></div>`;
  const act = (name, icon, label, on = false, cls = '') => `<button data-act="${name}" class="${on ? 'on' : ''} ${cls}">${icon}<span>${label}</span></button>`;
  return `${DIR === 'deal' ? `<div class="bgart" style="${tile(s).match(/style="([^"]+)"/)[1]}"></div>` : ''}${top}${art}
    <div class="ptitle">${esc(s.title)}</div>
    <div class="pmeta"><span class="meta">${s.year}${S.shuffle ? ' · Shuffle: Mine' : ''}</span><button class="mine ${s.mine ? 'on' : ''}" data-act="mine">${s.mine ? 'Mine ✓' : 'Not mine'}</button>${s.versions > 1 ? `<button class="mine" data-act="over" data-over="versions">${s.versions} versions</button>` : ''}</div>
    ${seek()}<div class="times"><span id="tnow">${clock(S.t)}</span><span>${S.slow ? '–:––' : clock(s.len)}</span></div>
    <div class="resv">${resv}</div>
    <div class="transport ${DIR === 'deal' ? 'glass' : ''}"><button class="ic" data-act="prev">${I.prev}</button><button class="play" data-act="toggle" id="pp">${S.playing ? I.pause : I.play}</button><button class="ic" data-act="next">${I.next}</button></div>
    <div class="acts">${act('fire', I.fire, 'Fire', s.fire)}${act('shelve', I.shelf, s.shelved ? 'Shelved' : 'Shelve', s.shelved)}${act('tag', I.tag, 'Tag', false, 'tag')}${act('tags', I.list, `Lines · ${s.tags.length}`, S.tagsOpen)}${session ? act('next', I.next, 'Next song') : act('over', I.stack, 'Queue', false, '" data-over="queue')}</div>
    <div class="tagl">${S.tagsOpen ? s.tags.map((t) => `<button class="row" data-act="jumpto" data-at="${t.at}" style="width:100%;text-align:left"><span>${clock(t.at)}</span><span class="t"><div>${esc(t.text)}</div></span></button>`).join('') || '<p class="meta">No lines on this song yet.</p>' : ''}</div>`;
}
function overlay() {
  const s = cur();
  const grab = '<div class="grab" id="ograb"><i></i></div>';
  if (S.over === 'queue') return `${grab}<h2 style="margin-top:0">Up next <span class="meta" style="font-weight:400">${S.shuffle ? 'Shuffle: Mine' : 'from Library'}</span></h2><div style="overflow-y:auto;flex:1">
    ${S.queue.map((id) => songRow(SONGS[id], '<span class="dim" style="padding:0 4px">≡</span>')).join('')}<p class="meta">Hold and drag to reorder (with its bump) in the real build.</p></div>`;
  if (S.over === 'versions') {
    const stack = VERS.slice(0, s.versions).map((_, i) => tile({ ...s, title: s.title + i }, '').replace('class="tile "', `class="tile" style="transform:translateX(${(i - S.compare) * 46}px) scale(${i === S.compare ? 1 : 0.86});z-index:${10 - Math.abs(i - S.compare)};`).replace('style="background', 'background').replace(';background', ';background')).join('');
    return `${grab}<h2 style="margin-top:0">${s.versions} versions of one song</h2><div class="stack">${stack}</div>
      <div class="wheel">${VERS.slice(0, s.versions).map((v, i) => `<button class="${i === S.compare ? 'on' : ''}" data-act="compare" data-i="${i}">${v}${i === 0 ? ' · Main' : ''}</button>`).join('')}</div>
      <p class="meta">Compare: tap a version and it plays from the same second (${clock(S.t)}). The Main plays in shuffle.</p>
      <button class="quiet" data-act="toast" data-msg="${VERS[S.compare]} is Main now">Make “${VERS[S.compare]}” the Main</button><button class="quiet" data-act="toast" data-msg="Pick a song to link">+ Add a version</button>`;
  }
  if (S.over === 'tests') return `${grab}<h2 style="margin-top:0">Test cases</h2>
    <button class="quiet" data-act="flag" data-k="off">${S.off ? '✓ ' : ''}Laptop off</button><button class="quiet" data-act="flag" data-k="slow">${S.slow ? '✓ ' : ''}Slow load (info arrives late)</button>
    <button class="quiet" data-act="flag" data-k="hits">${S.hits ? '✓ ' : ''}Show every tap target (44 pt)</button><button class="quiet" data-act="flag" data-k="nolabels">${S.nolabels ? '✓ ' : ''}Hide the "needs new logic" labels</button>
    <h2>Hard songs</h2>${[1, 2, 3, 4, 5, 0, 7, 680].map((i) => songRow(SONGS[i])).join('')}<p class="meta">A 70-character title, all caps, untitled, non-Latin, no spaces; 30 lines and 4 versions (Midnight Run); a Shelved song; a cloud-only song.</p>`;
  return `${grab}<div style="overflow-y:auto;flex:1">${design()}</div>`;
}
function design() {
  const css = getComputedStyle(document.body), v = (n) => css.getPropertyValue(n).trim();
  const sw = (n, what) => `<div style="margin:6px 0"><span class="sw" style="background:${v(n)}"></span>${what} <span class="meta">${v(n)}</span></div>`;
  const bets = { wall: 'A picture for every song makes 12 years feel like a catalogue. Art-led, closest to Apple Music.', line: 'My own lines, not covers, are the identity. Text-led, calm, fastest at night. Nobody else has this.', deal: 'Being dealt songs beats browsing. The Sort card grown into the whole app.' };
  const native = [
    ['SF Symbols (real icons)', 'rebuild', 'low', 'all three'], ['Native tab bar + round Search', 'rebuild', 'medium', 'all three'],
    ['Liquid Glass on tab bar, mini player' + (DIR === 'deal' ? ', transport' : ''), 'rebuild, iOS 26', 'medium', DIR === 'line' ? 'light use' : 'yes'],
    ['Mini player that grows into the player', 'Reanimated, already in the app', 'medium: must be tested for dropped frames', 'all three'],
    ['Haptics: queue bump, ' + (DIR === 'deal' ? 'card throw, Fire, Shelve' : 'Fire, Shelve, tag saved'), 'in the app already', 'low', 'yes'],
    ['Live Activity / Dynamic Island', 'second app target', 'high: may not work sideloaded', 'last, optional'],
    ['Waveform' + (DIR === 'line' ? ' (the main picture here)' : ''), 'new laptop job + data', 'medium', DIR === 'line' ? 'needed' : 'optional'],
    ['Last heard / play count' + (DIR === 'deal' ? ' (the deck needs it)' : ''), 'new data', 'low-medium', DIR === 'deal' ? 'needed' : 'for Rediscover'],
  ];
  return `<h2 style="margin-top:0">${NAMES[DIR]}: the design system</h2><p>${bets[DIR]}</p>
    <h2>Colour</h2>${sw('--bg', 'Background')}${sw('--surface', 'Surface')}${sw('--raised', 'Raised')}${sw('--text', 'Text')}${sw('--dim', 'Second text')}${sw('--accent', 'Accent: playing and the main action only')}
    <h2>Type</h2><div style="font:800 var(--title) var(--display)">Title ${v('--title')}</div><div>Row 17</div><div class="meta">Meta 13</div>${DIR === 'line' ? '<p class="lineq">“Lines in serif 22”</p>' : ''}
    <h2>Size and space</h2><p class="meta">Spacing in steps of 4 (8, 12, 16, 24). Every tap target 44 pt or more. Row 60, row tile 52, mini player 60, tab bar 56. Corner: tile ${v('--r-tile')}, sheet ${v('--r-sheet')}. Play button 64.</p>
    <h2>Tile recipe</h2><p class="meta">Colour from the title (never changes for a song), older songs darker, newer brighter, capped so it glows in a dark room. First letters large and faint.</p>
    <h2>Native pieces and their risk</h2><table>${native.map((r) => `<tr><td>${r[0]}</td><td class="meta">${r[1]}<br>risk: ${r[2]}</td><td class="meta">${r[3]}</td></tr>`).join('')}</table>
    <h2>A web page can't show</h2><p class="meta">Haptics, sound, the lock screen, real glass, real speed. Those are judged on the real build.</p>`;
}

// ---------- drawing ----------
const tabsHtml = () => [['home', DIR === 'deal' ? 'Deal' : 'Home', I.home], ['library', 'Library', I.lib]].map(([k, w, ic]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}"><span class="ic" style="height:26px">${ic}</span>${w}</button>`).join('');
function drawScreen() {
  $('#screen').innerHTML = S.tab === 'home' ? home() : S.tab === 'library' ? library() : S.tab === 'deck' ? `<button class="quiet" data-act="tab" data-tab="home">‹ Home</button><h1>Rediscover</h1>${deck()}` : search();
  $('#tabs').innerHTML = tabsHtml();
  $('#searchtab').className = `glass ${S.tab === 'search' ? 'on' : ''}`;
  bindDeck();
}
function drawMini() {
  const s = cur();
  $('#mini').style.display = S.started ? 'flex' : 'none';
  $('#mini').innerHTML = `${tile(s, 'sm')}<span class="t" data-act="open"><div>${esc(s.title)}</div><div class="meta">${S.playing ? 'Playing' : 'Paused'}${S.off && s.onPhone ? ' · from this phone' : ''}</div></span>
    <button class="ic" data-act="toggle">${S.playing ? I.pause : I.play}</button><button class="ic" data-act="next">${I.next}</button><i class="prog" id="mprog" style="width:${(S.t / s.len) * 100}%"></i>`;
}
function drawSheet() {
  $('#sheet').innerHTML = player();
  $('#sheet').classList.toggle('open', S.sheet);
  const o = $('#over');
  o.className = `sheet ${S.over === 'design' || S.over === 'tests' ? 'full2' : 'half'} ${S.over ? 'open' : ''}`;
  if (S.over) o.innerHTML = overlay();
  pull($('#grab'), $('#sheet'), () => act('close'));
  pull($('#ograb'), o, () => act('closeover'));
  const d = $('#draft');
  if (d) { d.focus(); d.onkeydown = (e) => e.key === 'Enter' && saveTag(d.value); }
  document.body.classList.toggle('hits', !!S.hits);
  document.body.classList.toggle('nolabels', !!S.nolabels);
}
const draw = () => (drawScreen(), drawMini(), drawSheet());
function toast(msg, undo) {
  S.undo = undo || null;
  $('#toast').innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-act="undo">Undo</button>' : ''}`;
  $('#toast').classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $('#toast').classList.remove('on'), 6000);
}

// ---------- gestures: a pull on a grab bar, a card under the thumb ----------
function pull(handle, sheet, close) {
  if (!handle) return;
  let y0 = null, t0 = 0;
  handle.onpointerdown = (e) => { y0 = e.clientY; t0 = Date.now(); sheet.classList.add('drag'); handle.setPointerCapture(e.pointerId); };
  handle.onpointermove = (e) => y0 !== null && (sheet.style.transform = `translateY(${Math.max(e.clientY - y0, 0)}px)`);
  handle.onpointerup = handle.onpointercancel = (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0, fast = dy / Math.max(Date.now() - t0, 1) > 0.8;
    y0 = null; sheet.classList.remove('drag'); sheet.style.transform = '';
    if (dy > 120 || fast) close();
  };
}
function bindDeck() {
  const card = $('#dcard');
  if (!card) return;
  let p = null;
  card.onpointerdown = (e) => { p = { x: e.clientX, y: e.clientY }; card.setPointerCapture(e.pointerId); card.style.transition = 'none'; };
  card.onpointermove = (e) => {
    if (!p) return;
    const dx = e.clientX - p.x, dy = Math.min(e.clientY - p.y, 0);
    card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 18}deg)`;
    $('.stamp.f', card).style.opacity = Math.max(0, Math.min(dx / 90, 1));
    $('.stamp.s', card).style.opacity = Math.max(0, Math.min(-dx / 90, 1));
  };
  card.onpointerup = card.onpointercancel = (e) => {
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p = null; card.style.transition = 'transform .25s';
    if (dx > 100) return deal('fire');
    if (dx < -100) return deal('shelve');
    if (dy < -100) return deal('skip');
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return act('play', { id: card.dataset.id, at: 30 });
    card.style.transform = ''; $('.stamp.f', card).style.opacity = 0; $('.stamp.s', card).style.opacity = 0;
  };
}
function deal(v) {
  const s = forgotten()[S.deck % forgotten().length];
  const was = { fire: s.fire, shelved: s.shelved, deck: S.deck };
  if (v === 'fire') s.fire = true;
  if (v === 'shelve') s.shelved = true;
  if (v !== 'shelve') S.deck++;
  drawScreen();
  if (v !== 'skip') toast(`${v === 'fire' ? 'Fire' : 'Shelved'}: ${s.title}`, () => { s.fire = was.fire; s.shelved = was.shelved; S.deck = was.deck; });
}
function saveTag(text) {
  const s = cur(), tag = { at: Math.round(S.draft), text: text.trim() || '(a mark to fill in later)' };
  s.tags = [...s.tags, tag].sort((a, b) => a.at - b.at);
  S.draft = null;
  drawSheet();
  toast(`Tagged at ${clock(tag.at)}${S.off ? ' · saved on phone' : ''}`, () => (s.tags = s.tags.filter((t) => t !== tag)));
}

// ---------- every tap ----------
function act(name, d = {}) {
  const s = cur();
  const start = (id, at) => {
    const song = SONGS[id];
    if (!playable(song)) return toast(song.cloud ? 'Cloud only: not on the laptop yet' : "Not on this phone, and the laptop isn't reachable");
    S.cur = +id; S.t = at ?? 0; S.playing = true; S.started = true; S.tagsOpen = false; S.draft = null;
  };
  const step = (n) => {
    const pool = S.mode === 'session' || S.shuffle ? SONGS.filter((x) => x.mine && !x.shelved && playable(x)) : SONGS.filter(playable);
    const at = pool.findIndex((x) => x.id === S.cur);
    const to = S.shuffle ? pool[Math.floor(Math.random() * pool.length)] : pool[(Math.max(at, 0) + n + pool.length) % pool.length];
    start(to.id, S.mode === 'session' ? 15 : 0);
  };
  const A2 = {
    tab: () => { S.tab = d.tab; $('#screen').scrollTop = 0; },
    play: () => { start(d.id, d.at ? +d.at : undefined); if (S.started && SONGS[d.id] === cur()) { S.sheet = true; S.over = S.over === 'queue' ? null : S.over === 'tests' ? null : S.over; } },
    open: () => { if (!S.started) start(forgotten()[S.deck % forgotten().length].id, 30); S.sheet = true; },
    close: () => { S.sheet = false; S.mode = null; S.draft = null; },
    over: () => (S.over = d.over), closeover: () => (S.over = null),
    toggle: () => (S.playing = !S.playing), next: () => step(1), prev: () => (S.t > 3 ? (S.t = 0) : step(-1)),
    shuffle: () => { S.shuffle = true; S.fireOnly = !!d.fire; step(1); S.sheet = false; },
    fire: () => { s.fire = !s.fire; if (s.fire) s.shelved = false; },
    shelve: () => { const was = s.shelved; s.shelved = !s.shelved; if (s.shelved) { s.fire = false; toast(`Shelved: ${s.title}. It plays on; shuffle will skip it`, () => (s.shelved = was)); } },
    mine: () => { const was = s.mine; s.mine = !s.mine; toast(s.mine ? `Mine: ${s.title}` : `Not mine: ${s.title}`, () => (s.mine = was)); },
    tag: () => (S.draft = S.draft === null ? S.t : null), canceltag: () => (S.draft = null),
    tags: () => (S.tagsOpen = !S.tagsOpen), jumpto: () => (S.t = +d.at),
    session: () => { S.mode = 'session'; S.shuffle = false; step(1); S.sheet = true; },
    deck: () => (S.tab = 'deck'), deal: () => deal(d.v),
    filter: () => (S.filter = d.f), az: () => (S.az = !S.az),
    jump: () => { const el = [...document.querySelectorAll('#screen .row .t div:first-child')].find((x) => x.textContent.toUpperCase().startsWith(d.c)); el && el.scrollIntoView({ block: 'start' }); },
    q: () => { S.q = d.q; },
    compare: () => { S.compare = +d.i; toast(`Playing “${VERS[S.compare]}” from ${clock(S.t)}`); },
    flag: () => (S[d.k] = !S[d.k]), toast: () => toast(d.msg),
    undo: () => { S.undo && S.undo(); S.undo = null; $('#toast').classList.remove('on'); },
    first: () => { $('#first').remove(); try { localStorage.setItem('vault-mock-seen', '1'); } catch {} },
  };
  if (!A2[name]) return;
  if (name === 'jump') return A2.jump();
  A2[name]();
  draw();
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el) act(el.dataset.act, el.dataset);
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  S.q = e.target.value;
  $('#results').innerHTML = searchResults(); // only the results redraw: the field keeps the keyboard
});
// seek by touch
document.addEventListener('pointerdown', (e) => {
  const bar = e.target.closest('#seek');
  if (!bar) return;
  const r = bar.getBoundingClientRect();
  S.t = Math.max(0, Math.min((e.clientX - r.left) / r.width, 1)) * cur().len;
  drawSheet(); drawMini();
});
// the clock: only the moving parts are touched, nothing else redraws
setInterval(() => {
  if (!S.playing) return;
  S.t += 0.5;
  const s = cur();
  if (S.t >= s.len) return act('next');
  const pct = `${(S.t / s.len) * 100}%`;
  const fl = $('#fl'), now = $('#tnow'), mp = $('#mprog');
  if (fl) fl.style.width = pct;
  if (mp) mp.style.width = pct;
  if (now) now.textContent = clock(S.t);
  if (Math.floor(S.t * 2) % 2 === 0 && S.sheet && S.draft === null && !S.over && (DIR === 'line' || s.tags.some((t) => Math.abs(t.at - S.t) < 0.5))) drawSheet();
}, 500);

document.body.insertAdjacentHTML('beforeend', `<div id="app"><div id="screen"></div><div id="mini" class="glass"></div><div id="tabs" class="glass"></div>
  <button id="searchtab" class="glass" data-act="tab" data-tab="search">${I.search.replace('<svg', '<svg width="24" height="24"')}</button>
  <div id="sheet" class="sheet"></div><div id="over" class="sheet half"></div><div id="toast"></div>
  ${(() => { try { return localStorage.getItem('vault-mock-seen'); } catch { return 0; } })() ? '' : `<div id="first"><h1>${NAMES[DIR]}</h1><p>A clickable sketch of the whole Vault, with made-up songs. Before you judge it:</p><ul>
    <li><b>Add it to the Home Screen first</b> (Share, then Add to Home Screen) and open it from there. In Safari, Safari's own bars cover the bottom of the screen.</li>
    <li>A web page can't show: haptics, sound, the lock screen, real glass, real speed. Those are judged on the real build.</li>
    <li>Grey labels mark what needs new logic first. Songs and lines are fake; 1,395 and 671 are real counts.</li>
    <li>Home, at the bottom: the design system, and test cases (laptop off, slow load, tap sizes, hard titles).</li></ul>
    <button class="big" data-act="first" style="width:100%;margin-top:16px">Start</button></div>`}</div>`);
draw();
