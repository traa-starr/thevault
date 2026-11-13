'use strict';
// The Vault, one world: a clickable mockup. All data is made up. Nothing here talks to a server.
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (t) => { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };
const PATH = {
  back: 'M15 5l-7 7 7 7', down: 'M5 9l7 7 7-7', dots: 'M5 12h.01M12 12h.01M19 12h.01', play: 'M8 5v14l11-7z', pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  next: 'M6 5v14l9-7zM16 5h2.5v14H16z', prev: 'M18 5v14l-9-7zM8 5H5.5v14H8z', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z', lib: 'M4 6h16M4 12h16M4 18h10', tag: 'M5 4h14v17l-7-5-7 5z', lines: 'M4 7h16M4 12h12M4 17h8',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', check: 'M6 12l4 4 8-8',
};
const FILL = { play: 1, pause: 1, next: 1, prev: 1 };
const ic = (n, sz = 22, on) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="${FILL[n] || (n === 'heart' && on) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${n === 'dots' ? 3.6 : 2}" stroke-linecap="round" stroke-linejoin="round"><path d="${PATH[n]}"/></svg>`;

// ---------- made-up data ----------
const LINES = ['I keep the receipts in a shoebox of thunder', 'Rent due on the moon but I am still in orbit', 'Cold coffee, hot verse, nobody up but the clock', 'We built the stairs while the elevator broke', 'Halftime in my head and the crowd is just me', 'Paper crown heavy but it fits like a promise', 'Every bus stop hymn was a rough draft of this', 'Low battery, high hopes, one bar of signal', 'I tuned the silence down to a B flat', 'Marble floors, but the echo still sounds broke', 'Second wind, third coast, fourth wall down', 'Neon on the puddles, I am writing in the rain', 'Static in the speakers but the message came through', 'Burner phone buzzing with a verse I forgot', 'Kitchen table cypher, salt shaker on the snare', 'Sunday static, I am the only one on air', 'Glass houses, so I throw only gentle bars', 'Loop fourteen again, it never wore thin', 'My shadow cut the verse before the beat could', 'Heavy rotation in a room with no radio', 'Dust and diamonds, same stuff from a distance', 'Night shift freestyle till the sun clocks in', 'Too late for the hype and too early for the myth', 'Rooftop weather, forecast says I am fine'];
const RAW = `Cold Cuts v1|m|A
Cold Cuts v2|m|A
Cold Cuts v3|m|A
Night Shift Freestyle|m|B
Night Shift Freestyle v2|m|B
Rooftop Weather|m
Paper Crown|m
Static Bloom|m
Marble Floors|m
Second Wind|m
Neon Rain|m
Dust and Diamonds|m
Low Battery|m
Heavy Rotation|m
Saint Elsewhere|m
Glass Houses demo|u||Glass Houses
Glass Houses v2|u||Glass Houses
Glass Houses copy|u||Glass Houses
Bus Stop Hymn|u||Bus Stop Hymn
Bus Stop Hymn 2|u||Bus Stop Hymn
Loop 14|u||Loop 14
Loop 14 v2|u||Loop 14
Untitled 7|u
Kitchen Table|u
Burner Phone|u
Halftime|u
Sunday Static|u
Beat Tape Scrap|n
Old Idea 3|n
Voice Memo 41|n`;
const SONGS = RAW.split('\n').map((r, i) => {
  const [title, state, fam, set] = r.split('|'), dur = 150 + (i * 13) % 90, nl = [2, 1, 0, 3, 1, 0, 2, 1][i % 8];
  return { id: i, title, state, fam: fam || null, set: set || null, dur, fav: state === 'm' && i % 4 === 1, arch: i === 10, ns: [18, 22, 25].includes(i), main: false,
    lines: Array.from({ length: nl }, (_, k) => ({ t: LINES[(i * 5 + k * 7) % LINES.length], s: 10 + (i * 37 + k * 53) % (dur - 30) })).sort((a, b) => a.s - b.s), plays: (i * 7919) % 97, last: (i * 31) % 30 };
});
const HID = [['Beat Tape Scrap 2', 'FL Exports'], ['Voice Memo 12', 'Phone Memos'], ['Old Idea 1', 'Old Beats'], ['Test Bounce', 'FL Exports'], ['Voice Memo 19', 'Phone Memos'], ['Loop Dump', 'Old Beats'], ['Click Track', 'FL Exports'], ['Voice Memo 27', 'Phone Memos']];
const S = { route: 'home', stack: [], tabPrev: 'home', chip: 'All', order: 'Recently added', sel: null, cur: null, playing: false, pos: 0, queue: [], shuf: 'Off', menu: null, sheet: null, toast: null,
  player: false, queueOpen: false, lines: false, tagging: null, cmp: null, dot: null, q: '', res: [], recent: ['night shift', 'rooftop', 'static'], cards: null, edit: false, laptop: 'laptop.example', log: false, hq: '', hf: 'All', restored: new Set(), session: false };
const byId = (i) => SONGS[i];
const live = (s) => s.state !== 'n' && !s.arch;
const fam = (s) => (s.fam ? SONGS.filter((x) => x.fam === s.fam) : [s]);
const mainOf = (f) => f.find((x) => x.main) || f[0];
const stateWord = (s) => ({ m: 'Mine', u: 'Unsorted', n: 'Not mine' }[s.state]);
const meta = (s) => (fam(s).length > 1 ? `${fam(s).length} versions` : stateWord(s));
const sub = (s) => (fam(s).length > 1 ? `${fam(s).length} versions` : s.lines[0] ? s.lines[0].t : s.state === 'u' ? 'Unsorted' : '');
const hue = (s) => { let h = 0; for (const c of s.title) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const tile = (s, cls) => { const l = s.title.replace(/[^A-Za-z]/g, '').slice(0, 2); return `<div class="tile ${cls}" style="background:${l ? `hsl(${hue(s)} 30% ${18 + Math.round(s.id / 30 * 12)}%)` : '#2a2a30'}">${l || '?'}</div>`; };
const unsorted = () => SONGS.filter((s) => s.state === 'u');
const sets = () => { const m = {}; unsorted().forEach((s) => s.set && (m[s.set] = (m[s.set] || []).concat(s))); return Object.entries(m).filter(([, v]) => v.length > 1); };
const ROWS = [['Recently played', () => SONGS.filter(live).sort((a, b) => a.last - b.last)], ['Not played in a while', () => SONGS.filter(live).sort((a, b) => b.last - a.last)],
  ['Recently added', () => SONGS.filter(live).sort((a, b) => b.id - a.id)], ['Favorites', () => SONGS.filter((s) => s.fav && live(s))], ['Needs tags', () => SONGS.filter((s) => s.state === 'm' && !s.lines.length && !s.arch)]];
const ROWCHIP = ['All', 'All', 'All', 'Favorites', 'Needs tags'];
const ORDERS = { 'Recently added': (a, b) => b.id - a.id, Title: (a, b) => a.title.localeCompare(b.title), 'Most played': (a, b) => b.plays - a.plays, 'Last played': (a, b) => a.last - b.last };
const FILT = { All: live, Favorites: (s) => s.fav && live(s), 'Needs tags': (s) => s.state === 'm' && !s.lines.length && !s.arch, Versions: (s) => s.fam && live(s), Archived: (s) => s.arch };
const libList = () => SONGS.filter(FILT[S.chip]).sort(ORDERS[S.order]);
const listFor = (k) => (k === 'lib' ? libList() : k === 'search' ? S.res.map(byId) : /^r\d$/.test(k || '') ? ROWS[+k[1]][1]() : []).map((s) => (typeof s === 'object' ? s.id : s));
const shuffled = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- state helpers ----------
const pick = (s) => ({ state: s.state, fav: s.fav, arch: s.arch, fam: s.fam, ns: s.ns, main: s.main });
const snap = (ids) => { const o = ids.map((i) => [i, pick(SONGS[i])]); return () => o.forEach(([i, v]) => Object.assign(SONGS[i], v)); };
let toastT;
function toast(msg, undo) { clearTimeout(toastT); S.toast = { msg, undo }; toastT = setTimeout(() => { S.toast = null; render(); }, 5000); }
function change(ids, fn, msg, keepSheet) { const u = snap(ids); fn(); if (!keepSheet) S.sheet = null; toast(msg, u); }
function play(id, list, sec) {
  S.cur = id; S.playing = true; S.pos = sec || 0; S.cmp = null; S.dot = null; S.tagging = null; S.lines = false;
  if (list && list.length) S.queue = list.slice(); else if (!S.queue.includes(id)) S.queue.push(id);
}
function step(d) { const i = S.queue.indexOf(S.cur); if (S.queue.length) play(S.queue[(i + d + S.queue.length) % S.queue.length]); }
function setShuf(m) {
  S.shuf = m; const base = m === 'Off' ? SONGS.filter(live) : SONGS.filter((s) => (m === 'Mine' ? s.state === 'm' : s.state === 'u'));
  const ids = m === 'Off' ? base.map((s) => s.id) : shuffled(base.map((s) => s.id)); S.queue = S.cur != null && ids.includes(S.cur) ? [S.cur, ...ids.filter((i) => i !== S.cur)] : ids;
}
function shufflePlay(p) { const pool = SONGS.filter((s) => (p === 'Mine' ? s.state === 'm' && !s.arch : p === 'Favorites' ? s.fav : s.state === 'u')); play(shuffled(pool.map((s) => s.id))[0], shuffled(pool.map((s) => s.id))); }
const go = (r) => { S.stack.push(S.route); S.route = r; S.menu = null; };
const openSheet = (id, from) => { S.sheet = { kind: 'song', id, from, page: 'main', fresh: true }; };
const openCards = (ids) => { S.cards = { ids, i: 0 }; go('cards'); };
function cardAct(v) {
  const c = S.cards, s = byId(c.ids[c.i]), i0 = c.i, u = snap([s.id]);
  if (v === 's') s.ns = true; else { s.state = v; s.ns = false; }
  c.i++; toast(v === 'm' ? `${s.title} marked Mine` : v === 'n' ? `${s.title} marked Not mine` : `${s.title} set aside: Not sure`, () => { u(); c.i = i0; });
}

// ---------- screens ----------
const hl = (t, q) => { const e = esc(t); if (!q) return e; return e.replace(new RegExp('(' + esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<b>$1</b>'); };
const songRow = (s, list, q) => `<button class="row ${S.cur === s.id ? 'on' : ''}" data-act="play" data-id="${s.id}" data-list="${list}" data-hold="song" data-from="${S.route}" ${S.sel ? 'data-sel=1' : ''}>
  ${S.sel ? `<span class="chk ${S.sel.has(s.id) ? 'on' : ''}">${'<i>' + (S.sel.has(s.id) ? ic('check', 16) : '') + '</i>'}</span>` : ''}${tile(s, 't44')}
  <div class="rt"><div class="rtitle">${esc(s.title)}</div><div class="rsub">${q ? hl(sub(s), q) : esc(sub(s))}</div></div>${s.fav ? `<span class="gr">${ic('heart', 16, 1)}</span>` : s.arch ? '<span class="gr">Archived</span>' : ''}</button>`;
const chipsHTML = (names, cur, act, key) => `<div class="chips" data-sk="${key}">${names.map((c) => `<button class="chip ${c === cur ? 'on' : ''}" data-act="${act}" data-c="${c}"><span>${c}</span></button>`).join('')}</div>`;
const topBar = (t, right) => `<div class="top"><button class="ib" data-act="back" aria-label="Back">${ic('back')}</button><h1 style="font-size:20px">${t}</h1>${right || '<span class="ib"></span>'}</div>`;

function screenHTML() {
  const r = S.route;
  if (r === 'home') {
    const yl = S.yl || (S.yl = (() => { const c = SONGS.filter((s) => live(s) && s.lines.length), s = c[Math.floor(Math.random() * c.length)], l = s.lines[Math.floor(Math.random() * s.lines.length)]; return { id: s.id, t: l.t, s: l.s }; })()), ys = byId(yl.id);
    return `<div class="top"><h1>Home</h1><button class="ib" data-act="menu" data-m="home" aria-label="More">${ic('dots')}</button></div>
    <button class="lcard" data-act="yourline"><div class="big">&ldquo;${esc(yl.t)}&rdquo;</div><div class="small">${esc(ys.title)} &middot; ${fmt(yl.s)}</div></button>
    <button class="shuf" data-act="shuffle" data-hold="pool">${ic('play', 18)} Shuffle</button><div class="hint" style="text-align:center">Hold Shuffle for Favorites or Unsorted</div>
    ${ROWS.map(([name, fn], k) => `<button class="head" data-act="rowhead" data-c="${ROWCHIP[k]}">${name} <span>${ic('back', 16).replace('M15 5l-7 7 7 7', 'M9 5l7 7-7 7')}</span></button><div class="hrow" data-sk="row${k}">${fn().slice(0, 10).map((s, i) =>
      `<button class="card ${S.cur === s.id ? 'on' : ''}" data-act="play" data-id="${s.id}" data-list="r${k}" data-hold="song" data-from="home">${tile(s, i < 2 ? 't132' : 't104')}<div class="ct ${S.cur === s.id ? 'amb' : ''}" style="width:${i < 2 ? 132 : 104}px">${esc(s.title)}</div><div class="cs" style="width:${i < 2 ? 132 : 104}px">${esc(sub(s))}</div></button>`).join('')}</div>`).join('')}`;
  }
  if (r === 'library') {
    const l = libList();
    return `<div class="top"><div><h1>Library</h1></div><button class="ib" data-act="menu" data-m="lib" aria-label="More">${ic('dots')}</button></div><div class="small" style="margin:-6px 0 6px">671 Mine${S.sel ? ` &middot; ${S.sel.size} selected` : ''}</div>
    ${chipsHTML(Object.keys(FILT), S.chip, 'chip', 'chips')}<div>${l.map((s) => songRow(s, 'lib')).join('') || '<p class="dim">Nothing here.</p>'}</div>`;
  }
  if (r === 'search') return `<div class="edit" style="margin-top:6px"><input id="q" placeholder="Search" value="${esc(S.q)}" autocomplete="off"><button class="word dim" data-act="scancel" style="text-decoration:none;color:var(--dim)">Cancel</button></div><div id="res">${resHTML()}</div>`;
  if (r === 'sort') {
    const u = unsorted(), ns = u.filter((s) => s.ns).length;
    return `${topBar('Sort')}<button class="bigbtn" data-act="swipe">Swipe through ${u.length} songs</button>${ns ? `<button class="pill" data-act="notsure">Not sure &middot; ${ns}</button>` : ''}
    <div class="lbl">Sets: songs that share a name</div>${sets().map(([n, v]) => `<button class="row" data-act="setopen" data-n="${n}" data-hold="set">${tile(v[0], 't44')}<div class="rt"><div class="rtitle">${n}</div><div class="rsub">${v.length} songs</div></div><span class="gr">${ic('back', 16).replace('M15 5l-7 7 7 7', 'M9 5l7 7-7 7')}</span></button>`).join('')}<div class="hint">Tap a set for its cards. Hold a set for All mine / All not mine.</div>`;
  }
  if (r === 'cards') {
    const c = S.cards, s = byId(c.ids[c.i]);
    if (!s) return `<div class="cwrap" style="margin-top:140px"><h1 style="margin:0">All done</h1><p class="dim" style="margin:0">${c.ids.length} songs sorted.</p><button class="bigbtn" style="width:240px" data-act="back">Back</button></div>`;
    return `${topBar(`${c.i + 1} of ${c.ids.length}`)}<div class="cwrap"><div class="scard" id="scard" data-drag="card" data-hold="song" data-from="cards" data-id="${s.id}">${tile(s, 'tcard')}<div class="t">${esc(s.title)}</div><div class="small" style="margin-top:4px">${esc(s.lines[0] ? s.lines[0].t : 'No lines yet')}</div></div>
    <div class="small">Swipe right Mine &middot; left Not mine &middot; up Not sure</div><div class="cbtns"><button data-act="cbtn" data-v="n">Not mine</button><button data-act="cbtn" data-v="s">Not sure</button><button class="m" data-act="cbtn" data-v="m">Mine</button></div></div>`;
  }
  if (r === 'settings') return `${topBar('Settings')}
    ${S.edit ? `<div class="sec" style="display:block;padding-top:8px"><div class="small">Laptop address</div><div class="edit"><input id="lap" value="${esc(S.laptop)}"></div><div class="edit"><button class="pill" data-act="lcancel">Cancel</button><button class="pill" style="background:#fff;color:#000" data-act="lsave">Save</button></div></div>`
    : `<button class="sec" data-act="laptop"><span><span class="dotst"></span>Laptop connected<div class="small" style="margin-left:18px">${esc(S.laptop)}</div></span><span class="gr">Edit</span></button>`}
    <button class="sec" data-act="hidden"><span>Hidden songs &middot; ${38 - S.restored.size}</span><span class="gr">${ic('back', 16).replace('M15 5l-7 7 7 7', 'M9 5l7 7-7 7')}</span></button>
    <button class="sec" data-act="log"><span>Lock-screen log<div class="small">What the lock screen did, last 3</div></span><span class="gr">${S.log ? 'Hide' : 'Show'}</span></button>
    ${S.log ? '<div class="small" style="padding:8px 0;line-height:1.8">9:41 Play Cold Cuts v2<br>9:38 Next Rooftop Weather<br>9:30 Pause Night Shift Freestyle</div>' : ''}`;
  if (r === 'hidden') {
    const f = HID.map((h, i) => [h, i]).filter(([h]) => (S.hf === 'All' || h[1] === S.hf) && h[0].toLowerCase().includes(S.hq.toLowerCase()));
    return `${topBar(`Hidden songs &middot; ${38 - S.restored.size}`)}<div class="edit"><input id="hq" placeholder="Search hidden songs" value="${esc(S.hq)}"></div>${chipsHTML(['All', 'FL Exports', 'Phone Memos', 'Old Beats'], S.hf, 'hchip', 'hchips')}
    <div id="hl">${f.map(([h, i]) => `<div class="row"><div class="tile t44" style="background:#1c1c21">${h[0].slice(0, 2)}</div><div class="rt"><div class="rtitle">${h[0]}</div><div class="rsub">${h[1]}</div></div>${S.restored.has(i) ? '<span class="gr">In Library</span>' : `<button class="pill" data-act="restore" data-i="${i}">Restore</button>`}</div>`).join('')}</div>`;
  }
  return '';
}
function resHTML() {
  const q = S.q.trim().toLowerCase(), all = SONGS.filter(live);
  if (!q) { S.res = []; return `<div class="lbl">Recent searches</div>${S.recent.map((t) => `<button class="srow" style="border-top:0" data-act="recent" data-t="${t}">${esc(t)}</button>`).join('')}${S.recent.length ? '<button class="word dim" style="color:var(--dim);text-decoration:none;padding:0" data-act="clearrecent">Clear recent</button>' : ''}`; }
  const lm = all.filter((s) => s.lines.some((l) => l.t.toLowerCase().includes(q))), tm = all.filter((s) => s.title.toLowerCase().includes(q) && !lm.includes(s));
  S.res = [...lm, ...tm].map((s) => s.id);
  const row = (s, l) => `<button class="row" data-act="play" data-id="${s.id}" data-list="search" data-hold="song" data-from="search">${tile(s, 't44')}<div class="rt"><div class="rtitle">${hl(s.title, tm.includes(s) ? q : '')}</div><div class="rsub">${l ? hl(l.t, q) : esc(sub(s))}</div></div></button>`;
  return (lm.length ? '<div class="lbl">Lines</div>' + lm.map((s) => row(s, s.lines.find((l) => l.t.toLowerCase().includes(q)))).join('') : '') + (tm.length ? '<div class="lbl">Songs</div>' + tm.map((s) => row(s)).join('') : '') || '<p class="dim">No matches.</p>';
}
const menuHTML = () => { if (!S.menu) return ''; const it = S.menu === 'home' ? [['sort', `Sort &middot; ${unsorted().length} left`], ['tagsongs', 'Tag songs'], ['settings', 'Settings']] : [['lshuffle', 'Shuffle'], ['order', 'Order'], ['select', 'Select songs']]; return `<div class="mb" data-act="closemenu"></div><div class="menu">${it.map(([a, l]) => `<button data-act="${a}">${l}</button>`).join('')}</div>`; };

function playerHTML() {
  const s = byId(S.cur); if (!s) return '';
  const f = fam(s), n = f.length, pct = (x) => (x / s.dur * 100).toFixed(2) + '%', tg = S.tagging;
  const art = S.lines ? `<div class="linesbox" data-sk="lb">${s.lines.length ? s.lines.map((l) => `<button class="lrow" data-act="lineseek" data-s="${l.s}"><b>${fmt(l.s)}</b><span>${esc(l.t)}</span></button>`).join('') : '<p class="dim">No lines yet. Tap Tag while it plays.</p>'}</div>` : tile(s, 'tart');
  const slot = tg ? `<div class="tagp"><input id="tagin" placeholder="Words for ${fmt(tg.sec)}" value="${esc(tg.text)}" autocomplete="off"><div class="tagbtns"><button data-act="earlier">Earlier</button><button data-act="later">Later</button><button data-act="tagcancel">Cancel</button><button class="amb" data-act="tagsave">Add</button></div></div>`
    : S.cmp ? `<div class="slot">${f.map((x, i) => `<button class="cv ${x.id === s.id ? 'on' : ''}" data-act="cmpv" data-id="${x.id}">${'ABCDEF'[i]}</button>`).join('')}<button class="word" data-act="cmpdone">Done</button></div>`
    : `<div class="slot">${s.state === 'u' ? '<button class="pill2" data-act="notmine">Not mine</button><button class="pill2" data-act="mine">Mine</button>' : ''}${n > 1 && !S.session ? '<button class="word" data-act="compare">Compare</button>' : ''}</div>`;
  return `<div class="ptop" data-drag="player"><button class="ib" data-act="closeplayer" aria-label="Close">${ic('down')}</button><div class="grab"></div><span class="ib"></span></div>
  <div class="artw ${tg ? 'tg' : ''}" id="art" ${S.lines ? '' : 'data-drag="art"'}>${art}</div>
  <div class="ptitle">${esc(s.title)}</div><div class="pmeta">${S.cmp ? 'Comparing' : meta(s)}</div>${slot}
  <div class="seek" id="seek" data-act="seek" data-drag="seek"><div class="trk"><i id="sf" style="width:${pct(S.pos)}"></i></div>${s.lines.map((l) => `<button class="dotb" data-act="dot" data-s="${l.s}" style="left:${pct(l.s)}"><i></i></button>`).join('')}</div>
  <div class="times"><span id="t0">${fmt(S.pos)}</span><span class="words">${S.dot ? esc(S.dot) : ''}</span><span>${fmt(s.dur)}</span></div>
  <div class="trans"><button class="ib" data-act="prev" aria-label="Previous">${ic('prev', 26)}</button><button class="playb" data-act="pp" aria-label="Play or pause">${ic(S.playing ? 'pause' : 'play', 28)}</button><button class="ib" data-act="next" aria-label="Next">${ic('next', 26)}</button></div>${S.toast ? `<div class="tbx" style="margin-top:8px"><span>${esc(S.toast.msg)}</span><button data-act="undo">Undo</button></div>` : ''}
  <div class="acts"><button class="${s.fav ? 'onx' : ''}" data-act="fav">${ic('heart', 22, s.fav)}Favorite</button><button class="amb" data-act="tag">${ic('tag')}Tag</button><button data-act="lines">${ic('lines')}Lines &middot; ${s.lines.length}</button><button data-act="psheet">${ic('dots')}More</button></div>`;
}
function queueHTML() {
  return `<div class="qh"><button class="ib" data-act="qback" aria-label="Back">${ic('back')}</button><h2>Queue</h2><button class="pill" data-act="qshuf">Shuffle: ${S.shuf}</button></div><div class="hint">Hold a row to move it</div><div id="ql">${S.queue.map((i) => {
    const s = byId(i); return `<button class="row qrow ${S.cur === i ? 'on' : ''}" data-act="qjump" data-id="${i}" data-hold="lift">${tile(s, 't44')}<div class="rt"><div class="rtitle">${esc(s.title)}</div><div class="rsub">${esc(sub(s))}</div></div></button>`; }).join('')}</div>`;
}
function songRows(s, from) {
  const n = fam(s).length, r = [[s.fav ? 'Unfavorite' : 'Favorite', 'sfav']]; if (S.cmp) return r;
  if (s.state !== 'm') r.push(['Mine', 'smine']); if (s.state !== 'n') r.push(['Not mine', 'snot']);
  if (n > 1) r.push([`Versions (${n})`, 'sver', 1]); if (n > 1 && !S.session) r.push(['Compare', 'scompare']); if (n < 2) r.push(['Add as a version of...', 'saddver', 1]);
  r.push([s.arch ? 'Unarchive' : 'Archive', 'sarch']); if (from === 'player' && !S.session) r.push(['Queue', 'squeue']); if (from === 'library' || from === 'home') r.push(['Select', 'sselect']); return r;
}
const chev = '<span class="chev">&rsaquo;</span>';
function addList(q) { const s = byId(S.sheet.id); return SONGS.filter((x) => x.id !== s.id && x.state !== 'n' && x.title.toLowerCase().includes((q || '').toLowerCase())).slice(0, 12).map((x) => `<button class="srow row" data-act="vlink" data-id="${x.id}">${tile(x, 't44')}<div class="rt"><div class="rtitle">${esc(x.title)}</div></div></button>`).join(''); }
function sheetHTML() {
  const sh = S.sheet; if (!sh) return ''; let head, body = '', extra = '';
  if (sh.kind === 'song') {
    const s = byId(sh.id), f = fam(s), bk = (t) => `<div class="shead"><button class="ib" data-act="sback" aria-label="Back">${ic('back')}</button><div class="st">${t}</div></div>`;
    if (sh.page === 'main') { head = `<div class="shead">${tile(s, 't44')}<div><div class="st">${esc(s.title)}</div><div class="ss">${esc(s.lines[0] ? s.lines[0].t : meta(s))}</div></div></div>`; body = songRows(s, sh.from).map(([l, a, c]) => `<button class="srow" data-act="${a}">${l}${c ? chev : ''}</button>`).join(''); }
    else if (sh.page === 'versions') { head = bk(`Versions (${f.length})`); body = f.map((x) => `<button class="srow row ${S.cur === x.id ? 'on' : ''}" data-act="vplay" data-id="${x.id}" data-hold="vermenu">${tile(x, 't44')}<div class="rt"><div class="rtitle">${esc(x.title)}</div><div class="rsub">${mainOf(f) === x ? 'Main' : ''}</div></div></button>`).join('') + '<div class="hint">Hold a version for more</div>'; }
    else { head = bk('Add as a version of...'); body = `<div class="field"><input id="aq" placeholder="Search songs" autocomplete="off"></div><div id="al">${addList('')}</div>`; }
    if (sh.vm != null) { const x = byId(sh.vm); extra = `<div class="vmback" data-act="vmcancel"></div><div class="vmenu"><button data-act="vmain">${mainOf(f) === x ? 'Keep as Main' : 'Make main'}</button><button data-act="vrem">Remove from Versions</button><button data-act="vnot">Not mine</button><button data-act="vmcancel">Cancel</button></div>`; }
  } else if (sh.kind === 'pool') { head = '<div class="shead"><div class="st">Shuffle from</div></div>'; body = ['Mine', 'Favorites', 'Unsorted'].map((p) => `<button class="srow" data-act="pool" data-p="${p}">${p}</button>`).join(''); }
  else if (sh.kind === 'order') { head = '<div class="shead"><div class="st">Order</div></div>'; body = Object.keys(ORDERS).map((o) => `<button class="srow" data-act="setorder" data-o="${o}">${o}${o === S.order ? '<span class="chev" style="color:#fff">&#10003;</span>' : ''}</button>`).join(''); }
  else { const v = sets().find(([n]) => n === sh.n)[1]; head = `<div class="shead">${tile(v[0], 't44')}<div><div class="st">${esc(sh.n)}</div><div class="ss">${v.length} songs</div></div></div>`; body = '<button class="srow" data-act="setall" data-v="m">All mine</button><button class="srow" data-act="setall" data-v="n">All not mine</button>' + v.map((x) => `<button class="srow row" data-act="play" data-id="${x.id}" data-list="" data-close="1">${tile(x, 't44')}<div class="rt"><div class="rtitle">${esc(x.title)}</div></div></button>`).join(''); }
  const fresh = sh.fresh; sh.fresh = false;
  return `<div class="back" data-act="closesheet"></div><div class="panel ${fresh ? 'fresh' : ''}" id="panel" data-sk="panel"><div class="sdrag" data-drag="sheet"><i class="grabber"></i>${head}</div>${body}</div>${extra}`;
}

// ---------- render ----------
let lastRoute;
function render() {
  if (lastRoute !== undefined && S.route !== lastRoute && S.toast) { clearTimeout(toastT); S.toast = null; }
  const el = $('#screen'), keep = {}; document.querySelectorAll('[data-sk]').forEach((e) => (keep[e.dataset.sk] = [e.scrollLeft, e.scrollTop])); const st = el.scrollTop;
  if (S.route !== 'library' && S.sel) S.sel = null;
  el.innerHTML = screenHTML(); el.scrollTop = lastRoute === S.route ? st : 0; lastRoute = S.route;
  const s = byId(S.cur), pg = ['cards'].includes(S.route) || S.sel;
  $('#mini').innerHTML = s && !S.player && !pg ? `<div class="mini"><button class="mm" data-act="openplayer">${tile(s, 't44')}<div class="rt"><div class="rtitle ${'amb'}">${esc(s.title)}</div><div class="rsub">${esc(s.lines[0] ? s.lines[0].t : S.playing ? 'Playing' : 'Paused')}</div></div></button><button class="ib" data-act="pp" aria-label="Play or pause">${ic(S.playing ? 'pause' : 'play', 22)}</button><button class="ib" data-act="next" aria-label="Next">${ic('next', 22)}</button><i class="prog" id="mp" style="width:${(S.pos / s.dur * 100).toFixed(1)}%"></i></div>` : '';
  $('#tabs').innerHTML = pg ? '' : `<div class="tb"><button class="${S.route === 'home' ? 'on' : ''}" data-act="tab" data-tab="home">${ic('home')}Home</button><button class="${S.route === 'library' ? 'on' : ''}" data-act="tab" data-tab="library">${ic('lib')}Library</button></div><button class="sb" id="searchtab" data-act="tab" data-tab="search" aria-label="Search">${ic('search')}</button>`;
  const sl = S.sel, off = !sl || sl.size < 1 ? 'off' : '';
  $('#bar').innerHTML = sl ? `<div class="bar"><button data-act="selcancel">Cancel</button><button class="${sl.size < 2 ? 'off' : ''}" data-act="selgroup">Group as versions</button><button class="${off}" data-act="selmine">Mine</button><button class="${off}" data-act="selnot">Not mine</button></div>` : '';
  const pl = $('#player'); pl.className = 'layer' + (S.player ? '' : ' closed'); pl.style.transform = ''; pl.innerHTML = playerHTML();
  const q = $('#queue'); q.className = 'layer' + (S.queueOpen ? '' : ' closed'); q.style.transform = ''; q.innerHTML = queueHTML();
  $('#menu').innerHTML = menuHTML(); $('#sheet').innerHTML = sheetHTML();
  $('#toast').innerHTML = S.toast && !S.sheet && (!S.player || S.queueOpen) ? `<div class="tbx"><span>${esc(S.toast.msg)}</span><button data-act="undo">Undo</button></div>` : '';
  document.querySelectorAll('[data-sk]').forEach((e) => { const k = keep[e.dataset.sk]; if (k) { e.scrollLeft = k[0]; e.scrollTop = k[1]; } });
}

// ---------- actions ----------
const A = {
  tab: (d) => { S.route = d.tab; S.stack = []; S.menu = null; S.sel = null; if (d.tab !== 'search') S.tabPrev = d.tab; },
  scancel: () => { S.q = ''; S.route = S.tabPrev; },
  menu: (d) => { S.menu = S.menu === d.m ? null : d.m; }, closemenu: () => { S.menu = null; },
  sort: () => go('sort'), settings: () => go('settings'), hidden: () => go('hidden'), back: () => { S.route = S.stack.pop() || 'home'; },
  tagsongs: () => { S.menu = null; S.session = true; const s = ROWS[4][1]()[0] || SONGS[0]; play(s.id); S.session = true; S.player = true; },
  play: (d) => { if (S.sel) { const i = +d.id; S.sel.has(i) ? S.sel.delete(i) : S.sel.add(i); return; } S.sheet = d.close ? null : S.sheet; S.session = false; play(+d.id, listFor(d.list)); if (d.from === 'library' || d.from === 'search') S.player = true; },
  yourline: () => { S.session = false; play(S.yl.id, null, S.yl.s); S.player = true; S.yl = null; },
  shuffle: () => { S.session = false; shufflePlay('Mine'); }, pool: (d) => { S.sheet = null; S.session = false; shufflePlay(d.p); },
  rowhead: (d) => { S.chip = d.c; S.route = 'library'; S.stack = []; },
  chip: (d) => { S.chip = d.c; }, lshuffle: () => { S.menu = null; const l = libList().map((s) => s.id); play(shuffled(l)[0], shuffled(l)); },
  order: () => { S.menu = null; S.sheet = { kind: 'order', fresh: true }; }, setorder: (d) => { S.order = d.o; S.sheet = null; },
  select: () => { S.menu = null; S.sel = new Set(); }, selcancel: () => { S.sel = null; },
  selgroup: () => { if (S.sel.size < 2) return; const ids = [...S.sel], f = 'F' + Date.now(); change(ids, () => ids.forEach((i) => (byId(i).fam = f)), `${ids.length} songs grouped as versions`); S.sel = null; },
  selmine: () => { if (!S.sel.size) return; const ids = [...S.sel]; change(ids, () => ids.forEach((i) => (byId(i).state = 'm')), `${ids.length} marked Mine`); S.sel = null; },
  selnot: () => { if (!S.sel.size) return; const ids = [...S.sel]; change(ids, () => ids.forEach((i) => (byId(i).state = 'n')), `${ids.length} marked Not mine`); S.sel = null; },
  openplayer: () => { S.player = true; }, closeplayer: () => { S.player = false; S.queueOpen = false; },
  pp: () => { S.playing = !S.playing; }, next: () => step(1), prev: () => { S.pos > 3 ? (S.pos = 0) : step(-1); },
  fav: () => { const s = byId(S.cur); s.fav = !s.fav; }, lines: () => { S.lines = !S.lines; },
  tag: () => { S.tagging = { sec: Math.floor(S.pos), text: '' }; }, tagcancel: () => { S.tagging = null; },
  earlier: () => { S.tagging.sec = Math.max(0, S.tagging.sec - 2); }, later: () => { S.tagging.sec += 2; },
  tagsave: () => { const s = byId(S.cur), t = S.tagging; s.lines.push({ t: t.text.trim() || 'New line', s: t.sec }); s.lines.sort((a, b) => a.s - b.s); S.tagging = null; },
  dot: (d) => { const l = byId(S.cur).lines.find((x) => x.s === +d.s); S.dot = l ? l.t : ''; S.pos = +d.s; }, lineseek: (d) => { S.pos = +d.s; S.lines = false; },
  mine: () => change([S.cur], () => (byId(S.cur).state = 'm'), `${byId(S.cur).title} marked Mine`), notmine: () => change([S.cur], () => (byId(S.cur).state = 'n'), `${byId(S.cur).title} marked Not mine`),
  compare: () => { S.cmp = {}; }, cmpv: (d) => { S.cur = +d.id; }, cmpdone: () => { S.cmp = null; },
  psheet: () => openSheet(S.cur, 'player'), qback: () => { S.queueOpen = false; }, qshuf: () => setShuf({ Off: 'Mine', Mine: 'Unsorted', Unsorted: 'Off' }[S.shuf]), qjump: (d) => { play(+d.id); },
  closesheet: () => { S.sheet = null; }, sback: () => { S.sheet.page = 'main'; S.sheet.vm = null; },
  sfav: () => { const s = byId(S.sheet.id); s.fav = !s.fav; S.sheet = null; },
  smine: () => { const s = byId(S.sheet.id); change([s.id], () => (s.state = 'm'), `${s.title} marked Mine`); }, snot: () => { const s = byId(S.sheet.id); change([s.id], () => (s.state = 'n'), `${s.title} marked Not mine`); },
  sver: () => { S.sheet.page = 'versions'; }, saddver: () => { S.sheet.page = 'addver'; },
  sarch: () => { const s = byId(S.sheet.id); change([s.id], () => (s.arch = !s.arch), s.arch ? `${s.title} unarchived` : `${s.title} archived`); },
  scompare: () => { const id = S.sheet.id; S.sheet = null; if (S.cur !== id) play(id); S.player = true; S.cmp = {}; },
  squeue: () => { S.sheet = null; S.queueOpen = true; }, sselect: () => { S.sheet = null; S.route = 'library'; S.stack = []; S.sel = new Set([...(S.sel || []), S.lastHold]); },
  vplay: (d) => { S.session = false; play(+d.id); S.sheet = null; },
  vmcancel: () => { S.sheet.vm = null; },
  vmain: () => { const x = byId(S.sheet.vm), f = fam(x); change(f.map((y) => y.id), () => f.forEach((y) => (y.main = y === x)), `${x.title} is now Main`); },
  vrem: () => { const x = byId(S.sheet.vm), f = fam(x); change(f.map((y) => y.id), () => { x.fam = null; x.main = false; const r = fam(f.find((y) => y !== x)); if (r.length < 2) r.forEach((y) => (y.fam = null)); }, `${x.title} removed from Versions`); },
  vnot: () => { const x = byId(S.sheet.vm); change([x.id], () => (x.state = 'n'), `${x.title} marked Not mine`); },
  vlink: (d) => { const s = byId(S.sheet.id), t = byId(+d.id), f = t.fam || 'F' + Date.now(); change([s.id, t.id], () => { s.fam = f; t.fam = f; }, `${s.title} added as a version of ${t.title}`); },
  setopen: (d) => openCards(unsorted().filter((s) => s.set === d.n).map((s) => s.id)),
  setall: (d) => { const v = sets().find(([n]) => n === S.sheet.n)[1], ids = v.map((s) => s.id); change(ids, () => v.forEach((s) => { s.state = d.v; s.ns = false; }), `${ids.length} songs marked ${d.v === 'm' ? 'Mine' : 'Not mine'}`); },
  swipe: () => openCards(unsorted().map((s) => s.id)), notsure: () => openCards(unsorted().filter((s) => s.ns).map((s) => s.id)), cbtn: (d) => cardAct(d.v),
  laptop: () => { S.edit = true; }, lcancel: () => { S.edit = false; }, lsave: () => { S.laptop = $('#lap').value.trim() || S.laptop; S.edit = false; }, log: () => { S.log = !S.log; },
  restore: (d) => { S.restored.add(+d.i); }, hchip: (d) => { S.hf = d.c; },
  recent: (d) => { S.q = d.t; }, clearrecent: () => { S.recent = []; },
  undo: () => { const t = S.toast; S.toast = null; if (t) t.undo(); },
};
function act(n, d = {}) { if (!A[n]) return; A[n](d); buzz(); render(); if (n === 'tag') $('#tagin').focus(); }
function hold(el, g) {
  const k = el.dataset.hold, d = el.dataset; buzz();
  if (k === 'song') { S.lastHold = +d.id; openSheet(+d.id, d.from); }
  else if (k === 'pool') S.sheet = { kind: 'pool', fresh: true };
  else if (k === 'set') S.sheet = { kind: 'set', n: d.n, fresh: true };
  else if (k === 'vermenu') S.sheet.vm = +d.id;
  else if (k === 'lift') { D = { kind: 'lift', el, y0: g.y, idx: [...el.parentNode.children].indexOf(el) }; el.classList.add('lift'); return; }
  render();
}

// ---------- gestures: tap = click, hold 0.45 s, drag ----------
let G = null, D = null, heldAt = 0;
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerdown', (e) => {
  const a = e.target.closest('[data-act]'); if (a) { a.classList.add('p'); setTimeout(() => a.classList.remove('p'), 160); }
  const h = e.target.closest('[data-hold]');
  if (h && !(S.sel && h.dataset.hold === 'song')) { G = { x: e.clientX, y: e.clientY, el: h }; G.t = setTimeout(() => { const g = G; G = null; heldAt = Date.now(); hold(g.el, g); }, 450); }
  const d = e.target.closest('[data-drag]');
  if (d && !e.target.closest('input') && !e.target.closest('[data-act=dot]')) {
    D = { kind: d.dataset.drag, el: d, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
    if (D.kind === 'seek') seekTo(e.clientX);
  }
});
document.addEventListener('pointermove', (e) => {
  if (G && Math.hypot(e.clientX - G.x, e.clientY - G.y) > 8) { clearTimeout(G.t); G = null; }
  if (!D) return; const k = D.kind;
  if (k === 'lift') { const dy = e.clientY - D.y0, rows = [...D.el.parentNode.children], ni = Math.max(0, Math.min(rows.length - 1, D.idx + Math.round(dy / 60))); D.ni = ni; D.el.style.transform = `translateY(${dy}px)`; rows.forEach((r, i) => { if (r !== D.el) r.style.transform = D.idx < ni && i > D.idx && i <= ni ? 'translateY(-60px)' : D.idx > ni && i < D.idx && i >= ni ? 'translateY(60px)' : ''; }); return; }
  D.dx = e.clientX - D.x0; D.dy = e.clientY - D.y0;
  if (k === 'seek') seekTo(e.clientX);
  if (k === 'player' && D.dy > 0) $('#player').style.transform = `translateY(${D.dy}px)`;
  if (k === 'sheet' && D.dy > 0) $('#panel').style.transform = `translateY(${D.dy}px)`;
  if (k === 'card') D.el.style.transform = `translate(${D.dx}px,${Math.min(0, D.dy)}px) rotate(${D.dx / 25}deg)`;
});
function endPointer() {
  if (G) { clearTimeout(G.t); G = null; } if (!D) return; const d = D; D = null;
  if (d.kind === 'lift') { const ni = d.ni == null ? d.idx : d.ni; if (ni !== d.idx) { const q = S.queue.slice(), [m] = q.splice(d.idx, 1); q.splice(ni, 0, m); S.queue = q; } render(); return; }
  if (d.kind === 'player') { if (d.dy > 110) act('closeplayer'); else $('#player').style.transform = ''; }
  if (d.kind === 'sheet') { if (d.dy > 90) act('closesheet'); else if ($('#panel')) $('#panel').style.transform = ''; }
  if (d.kind === 'art' && d.dy < -50 && Math.abs(d.dy) > Math.abs(d.dx)) { S.queueOpen = true; buzz(); render(); }
  if (d.kind === 'card') {
    const v = d.dx > 90 && Math.abs(d.dx) > Math.abs(d.dy) ? 'm' : d.dx < -90 && Math.abs(d.dx) > Math.abs(d.dy) ? 'n' : d.dy < -90 ? 's' : null;
    if (!v) { d.el.style.transition = 'transform .2s'; d.el.style.transform = ''; return; }
    d.el.style.transition = 'transform .18s'; d.el.style.transform = v === 'm' ? 'translateX(500px)' : v === 'n' ? 'translateX(-500px)' : 'translateY(-700px)';
    heldAt = Date.now(); setTimeout(() => act('cbtn', { v }), 180);
  }
}
document.addEventListener('pointerup', endPointer); document.addEventListener('pointercancel', endPointer);
document.addEventListener('touchmove', (e) => { if (D && D.kind === 'lift') e.preventDefault(); }, { passive: false });
function seekTo(x) { const r = $('#seek').getBoundingClientRect(), s = byId(S.cur); S.pos = Math.max(0, Math.min(1, (x - r.left) / r.width)) * s.dur; S.dot = null; tickDom(); const w = document.querySelector('.times .words'); if (w) w.textContent = ''; }
document.addEventListener('click', (e) => {
  if (Date.now() - heldAt < 400) { e.stopPropagation(); e.preventDefault(); return; }
  const a = e.target.closest('[data-act]'); if (a) act(a.dataset.act, a.dataset);
}, true);
document.addEventListener('input', (e) => {
  const i = e.target.id;
  if (i === 'q') { S.q = e.target.value; $('#res').innerHTML = resHTML(); } else if (i === 'tagin') S.tagging.text = e.target.value;
  else if (i === 'hq') { S.hq = e.target.value; const keep = e.target.selectionStart; render(); const n = $('#hq'); n.focus(); n.setSelectionRange(keep, keep); }
  else if (i === 'aq') $('#al').innerHTML = addList(e.target.value);
});
function tickDom() { const s = byId(S.cur); if (!s) return; const p = (S.pos / s.dur * 100).toFixed(2) + '%'; [['#sf'], ['#mp']].forEach(([q]) => { const n = $(q); if (n) n.style.width = p; }); const t = $('#t0'); if (t) t.textContent = fmt(S.pos); }
setInterval(() => { if (!S.playing || S.cur == null) return; S.pos += 0.5; if (S.pos >= byId(S.cur).dur) { step(1); render(); } else tickDom(); }, 500);
S.queue = SONGS.filter(live).map((s) => s.id);
render();
