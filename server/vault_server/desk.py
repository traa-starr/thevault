"""The laptop desk (ROADMAP O.7, calm part 1, 2026-11-12): the server's own page in the laptop's browser, opened by the
`Vault Desk` desktop icon. Counts at the top, then the hidden songs: search (title or folder), a folder list, play in the
browser, Restore.

Served at /desk on 127.0.0.1 only (server.on_desk). Every link is relative and nothing is loaded from outside, so the page
holds no laptop address and no song path. Restore sends the very change the phone's outbox sends (POST /changes, kind
mine_restore, the X-Vault-Client header, a fresh id), so it lands in the journal like the phone's and the manual choice
rules stay the server's. A row leaves only once the laptop says it's saved; a refusal shows its reason on the row.
"""

DESK = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vault Desk</title>
<style>
:root { --bg: #000; --surface: #111114; --raised: #1c1c21; --line: #2a2a30; --text: #f2f2f4; --dim: #a0a0aa; --faint: #6a6a74;
        --accent: #ffb020; --warn: #ffd58a; --danger: #ff6961; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px -apple-system, "Segoe UI", system-ui, sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 24px; }
h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 16px; }
h2 { font-size: 20px; font-weight: 700; margin: 28px 0 12px; }
.counts { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.count { background: var(--surface); border-radius: 14px; padding: 14px 16px; }
.count small { display: block; color: var(--dim); font-size: 13px; margin-bottom: 4px; }
.count b { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
.count b.time { font-size: 16px; font-weight: 600; }
.count.warn b { color: var(--warn); }
#asof { color: var(--dim); font-size: 13px; margin-top: 8px; }
.player { position: sticky; top: 0; z-index: 2; background: var(--bg); padding: 12px 0; border-bottom: 1px solid var(--line); }
#now { min-height: 1.3em; margin: 0 0 8px; color: var(--dim); }
#now.playing { color: var(--accent); }
audio { width: 100%; height: 40px; }
.tools { display: flex; gap: 8px; margin: 12px 0 4px; }
input, select { height: 44px; border: 0; border-radius: 12px; background: var(--raised); color: var(--text); font: inherit; padding: 0 12px; }
input { flex: 1; min-width: 0; }
select { max-width: 40%; }
#shown { color: var(--dim); font-size: 13px; padding: 8px 0; font-variant-numeric: tabular-nums; }
.row { display: flex; align-items: center; gap: 12px; min-height: 56px; border-bottom: 1px solid var(--line); }
.row:hover { background: var(--surface); }
.row .text { flex: 1; min-width: 0; padding: 6px 4px; }
.row .title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 16px; }
.row.playing .title { color: var(--accent); }
.row .meta { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--dim); font-size: 13px; margin-top: 2px; }
.row button.back { width: 104px; }  /* Restore and In Library the same width: nothing beside them moves */
.row .why { color: var(--danger); font-size: 13px; }
button { height: 36px; min-width: 76px; border: 0; border-radius: 18px; background: var(--raised); color: var(--text); font: inherit;
         font-size: 14px; font-weight: 600; padding: 0 14px; cursor: pointer; }
button:hover { background: #26262c; }
button:disabled { opacity: 0.4; cursor: default; }
.empty { color: var(--dim); text-align: center; padding: 32px 0; }
#more { margin: 16px auto; display: block; }
#more[hidden] { display: none; }
.problem { color: var(--warn); }
</style></head>
<body><main>
<h1>Vault Desk</h1>
<div class="counts" id="counts"></div>
<p id="asof"></p>
<h2>Hidden songs</h2>
<div class="player"><p id="now">Click Play on a song to hear it here.</p><audio id="player" controls preload="none"></audio></div>
<div class="tools">
  <input id="search" type="search" placeholder="Search title or folder" autocomplete="off" autofocus>
  <select id="folder"><option value="">All folders</option></select>
</div>
<p id="shown"></p>
<div id="rows"></div>
<button id="more" hidden>Show more</button>
</main>
<script>
const PAGE = 200;  // rows drawn at a time: 815 songs never land in the page at once
const $ = (id) => document.getElementById(id);
const player = $("player"), now = $("now");
let songs = [], restored = new Set(), limit = PAGE, playingId = null, inFlight = 0;

const fmt = (n) => Number(n).toLocaleString("en-US");
function ago(iso) {
  if (!iso) return null;
  const then = new Date(iso), hours = (Date.now() - then) / 36e5;
  if (isNaN(hours)) return null;
  if (hours < 1) return Math.max(1, Math.round(hours * 60)) + " min ago";
  if (hours < 48) return Math.round(hours) + " h ago";
  return Math.round(hours / 24) + " days ago";
}
function card(label, value, time, warn) {
  const c = document.createElement("div"), s = document.createElement("small"), b = document.createElement("b");
  c.className = "count" + (warn ? " warn" : "");
  s.textContent = label; b.textContent = value; if (time) { b.className = "time"; b.title = time; }
  c.append(s, b);
  return c;
}
async function loadCounts() {
  try {
    const r = await fetch("desk-status");
    if (!r.ok) throw new Error((await r.json()).error);
    const d = await r.json(), box = $("counts");
    box.replaceChildren(card("Mine", fmt(d.mine)), card("Hidden", fmt(d.hidden)), card("Unsorted", fmt(d.unsorted)),
      card("Tags", fmt(d.tags)),
      card("Last scan", ago(d.last_scan) || "never", d.last_scan, d.last_scan && (Date.now() - new Date(d.last_scan)) > 7 * 864e5),
      card("Last render click", ago(d.last_render) || "not yet", d.last_render));
    $("asof").textContent = "As of " + new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}) + ". Changes still on the phone show once it sends them.";
  } catch (e) {
    $("asof").textContent = "Counts couldn't be read: " + e.message;
    $("asof").className = "problem";
  }
}
// `again` (the window came back): rows already shown keep their place and In Library stays; a song hidden on the phone
// meanwhile joins at the top; one restored there leaves. Never while a restore is on its way (review catch 3).
async function loadSongs(again) {
  if (again && inFlight) return;
  try {
    const r = await fetch("songs?hidden=1");
    if (!r.ok) throw new Error((await r.json()).error);
    const fresh = (await r.json()).songs;
    if (again && inFlight) return;
    if (again) {
      const now = new Set(fresh.map((song) => song.id)), had = new Set(songs.map((song) => song.id));
      songs = [...fresh.filter((song) => !had.has(song.id)), ...songs.filter((song) => now.has(song.id) || restored.has(song.id))];
    } else {
      songs = fresh;
      restored = new Set();
    }
    fillFolders();
    draw();
  } catch (e) {
    $("shown").textContent = "The hidden songs couldn't be read: " + e.message;
    $("shown").className = "problem";
  }
}
const folderOf = (song) => song.folder || "Loose files";
function fillFolders() {
  const counts = new Map();
  for (const song of songs) counts.set(folderOf(song), (counts.get(folderOf(song)) || 0) + 1);
  const pick = $("folder"), was = pick.value;
  const list = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  pick.replaceChildren(new Option("All folders", ""), ...list.map(([name, n]) => new Option(name + " · " + fmt(n), name)));
  pick.value = counts.has(was) ? was : "";
}
// plain text, any case, in the title or the folder: "(" or "[" are just letters (the phone's hiddenCore.ts does the same)
function shownSongs() {
  const words = $("search").value.trim().toLowerCase(), folder = $("folder").value;
  return songs.filter((song) => (!folder || folderOf(song) === folder) &&
    (!words || song.title.toLowerCase().includes(words) || folderOf(song).toLowerCase().includes(words)));
}
const WHERE = {cloud: "Cloud only", gone: "File missing"};
function draw() {
  const shown = shownSongs(), rows = $("rows"), total = songs.length - restored.size;
  const narrowed = $("search").value.trim() || $("folder").value;
  const left = shown.filter((song) => !restored.has(song.id)).length;
  $("shown").className = "";
  $("shown").textContent = narrowed ? fmt(left) + " of " + fmt(total) : (total === 1 ? "1 hidden song" : fmt(total) + " hidden songs");
  rows.replaceChildren(...shown.slice(0, limit).map(row));
  if (!shown.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = !songs.length ? "Nothing hidden" : "No hidden songs" + ($("search").value.trim() ? ' match "' + $("search").value.trim() + '"' : "") + ($("folder").value ? " in " + $("folder").value : "");
    rows.append(p);
  }
  $("more").hidden = shown.length <= limit;
}
function row(song) {
  const r = document.createElement("div"), text = document.createElement("div"), t = document.createElement("div"), m = document.createElement("div");
  r.className = "row" + (song.id === playingId ? " playing" : "");
  r.dataset.id = song.id;
  text.className = "text"; t.className = "title"; m.className = "meta";
  t.textContent = song.title;
  m.textContent = [song.date, WHERE[song.where], folderOf(song)].filter(Boolean).join(" · ");
  text.append(t, m);
  const play = document.createElement("button"), back = document.createElement("button");
  back.className = "back";
  play.textContent = "Play";
  play.disabled = song.where !== "laptop";
  play.onclick = () => playSong(song);
  if (restored.has(song.id)) { back.textContent = "In Library"; back.disabled = true; }
  else { back.textContent = "Restore"; back.onclick = () => restore(song, r, back); }
  r.append(text, play, back);
  return r;
}
function playSong(song) {
  playingId = song.id;
  now.textContent = song.title;
  now.className = "playing";
  player.src = "songs/" + song.id + "/audio";
  player.play().catch(() => {});
  draw();
}
player.addEventListener("error", () => {
  if (player.getAttribute("src")) { now.textContent = now.textContent + ": not on the laptop right now"; now.className = ""; }
});
// the phone's change, word for word: same route, same kind, same header, a fresh id the laptop remembers
function changeId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
}
async function restore(song, r, button) {
  button.disabled = true;  // one click, one change
  button.textContent = "Restoring…";
  inFlight++;
  let why = "";
  try {
    const res = await fetch("changes", {method: "POST", headers: {"Content-Type": "application/json", "X-Vault-Client": "desk"},
      body: JSON.stringify({changes: [{id: changeId(), kind: "mine_restore", data: {song_id: song.id}}]})});
    const d = await res.json();
    if (!res.ok) why = d.error || ("the laptop said " + res.status);
    else if (d.results[0].status === "refused") why = d.results[0].why;
  } catch (e) {
    why = "the laptop didn't answer";
  }
  inFlight--;
  if (!why) {
    restored.add(song.id);
    draw();
    loadCounts();
    return;
  }
  button.disabled = false;
  button.textContent = "Restore";
  let w = r.querySelector(".why");
  if (!w) { w = document.createElement("div"); w.className = "why"; r.querySelector(".text").append(w); }
  w.textContent = "Not restored: " + why;
}
let typing = null;
$("search").addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(() => { limit = PAGE; draw(); }, 120); });
$("folder").addEventListener("change", () => { limit = PAGE; draw(); });
$("more").addEventListener("click", () => { limit += PAGE; draw(); });
// back to the window: ask again, so a song hidden on the phone meanwhile shows up here
window.addEventListener("focus", () => { loadCounts(); loadSongs(true); });
loadCounts();
loadSongs();
</script>
</body></html>
"""
