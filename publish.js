'use strict';
// Publishes a read-only snapshot of the board (never leads) to GitHub Pages.
// Usage: node publish.js  — requires PUBLISH_REPO remote to exist and gh/git auth.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const PUBLISH_REPO = process.env.COS_PUBLISH_REPO || 'https://github.com/rohanxezstays/ezstays-board.git';
const VIEWER = path.join(ROOT, 'viewer');

const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'board.json'), 'utf8'));

const logoFile = path.join(ROOT, 'dashboard', 'logo.png');
const logoDataUri = fs.existsSync(logoFile)
  ? `data:image/png;base64,${fs.readFileSync(logoFile).toString('base64')}`
  : '';

const PALETTE = ['#f59e0b', '#34d399', '#6c8cff', '#e879f9', '#f472b6', '#f87171', '#4ade80', '#fbbf24', '#38bdf8', '#c084fc'];
const publishedAt = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const safeJson = JSON.stringify(board).replace(/</g, '\\u003c');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>EzStays — Board</title>
<style>
:root { --bg:#12141a; --col:#1b1e27; --card:#242836; --text:#e8e9ee; --muted:#9aa0b0; --accent:#6c8cff; --danger:#ff6b6b; --green:#34d399; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,Segoe UI,sans-serif; }
header { display:flex; align-items:center; gap:12px; padding:14px 16px 6px; flex-wrap:wrap; }
header img { height:24px; }
h1 { font-size:16px; margin:0; }
.sub { font-size:11px; color:var(--muted); margin-left:auto; }
#summary { display:flex; gap:8px; flex-wrap:wrap; padding:6px 16px 14px; font-size:11px; color:var(--muted); }
#summary .badge { background:var(--col); }
#streams { display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:12px; padding:0 16px 20px; align-items:start; }
.stream { background:var(--col); border-radius:10px; padding:10px 12px; }
.stream h2 { font-size:12px; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); margin:2px 2px 8px; display:flex; align-items:center; gap:8px; }
.stream h2 .count { margin-left:auto; font-weight:400; }
.row { display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:7px; background:var(--card); margin-bottom:6px; }
.row .name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
.row.done .name { color:var(--muted); text-decoration:line-through; }
.badge { border-radius:4px; padding:1px 6px; background:#333a4d; font-size:10px; color:var(--muted); white-space:nowrap; }
.badge.overdue { background:var(--danger); color:#fff; }
.badge.doneb { color:var(--green); }
.dot { width:7px; height:7px; border-radius:50%; flex:none; }
.mini { width:52px; height:4px; background:#333a4d; border-radius:999px; overflow:hidden; flex:none; }
.mini .bar { height:100%; background:var(--accent); }
.mini .bar.complete { background:var(--green); }
.pct { font-size:10px; color:var(--muted); width:30px; text-align:right; flex:none; }
footer { text-align:center; color:var(--muted); font-size:11px; padding:6px 0 24px; }
</style>
</head>
<body>
<header>
  ${logoDataUri ? `<img src="${logoDataUri}" alt="EzStays">` : ''}
  <h1>Board</h1>
  <span class="sub">read-only · updated ${publishedAt} IST</span>
</header>
<div id="summary"></div>
<main id="streams"></main>
<footer>Published from Chief of Staff</footer>
<script>
const board = ${safeJson};
const PALETTE = ${JSON.stringify(PALETTE)};
const streamColor = s => { const i = board.streams.indexOf(s); return i >= 0 ? PALETTE[i % PALETTE.length] : '#9aa0b0'; };
const today = new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

// summary strip: totals per workflow column
const summary = document.getElementById('summary');
summary.innerHTML = '<span class="badge">' + board.cards.length + ' cards</span>' +
  board.columns.map(col => {
    const n = board.cards.filter(c => c.column === col).length;
    return n ? '<span class="badge">' + esc(col) + ' ' + n + '</span>' : '';
  }).join('');

// one section per stream, compact rows
const root = document.getElementById('streams');
const columnRank = Object.fromEntries(board.columns.map((c, i) => [c, i]));
for (const stream of board.streams) {
  const cards = board.cards
    .filter(c => c.stream === stream)
    .sort((a, b) => (a.column === 'Done') - (b.column === 'Done') || columnRank[b.column] - columnRank[a.column]);
  if (!cards.length) continue;
  const doneN = cards.filter(c => c.column === 'Done').length;
  const sec = document.createElement('section');
  sec.className = 'stream';
  sec.innerHTML = '<h2><span class="dot" style="background:' + streamColor(stream) + '"></span>' + esc(stream) +
    '<span class="count">' + (doneN ? doneN + '/' : '') + cards.length + '</span></h2>';
  for (const c of cards) {
    const list = c.checklist || [];
    const ticked = list.filter(i => i.done).length;
    const pct = list.length ? Math.round(ticked / list.length * 100) : null;
    const overdue = c.due && c.due < today && c.column !== 'Done';
    const row = document.createElement('div');
    row.className = 'row' + (c.column === 'Done' ? ' done' : '');
    row.innerHTML =
      '<span class="name">' + esc(c.title) + '</span>' +
      (c.column === 'Done' ? '<span class="badge doneb">done</span>'
        : c.column !== 'Inbox' ? '<span class="badge">' + esc(c.column) + '</span>' : '') +
      (overdue ? '<span class="badge overdue">due ' + esc(c.due) + '</span>' : c.due && c.column !== 'Done' ? '<span class="badge">due ' + esc(c.due) + '</span>' : '') +
      (c.waitingOn ? '<span class="badge">⏳ ' + esc(c.waitingOn) + '</span>' : '') +
      (pct !== null ? '<span class="mini"><span class="bar' + (pct === 100 ? ' complete' : '') + '" style="width:' + pct + '%; display:block"></span></span><span class="pct">' + pct + '%</span>' : '');
    sec.appendChild(row);
  }
  root.appendChild(sec);
}
</script>
</body>
</html>
`;

fs.mkdirSync(VIEWER, { recursive: true });
fs.writeFileSync(path.join(VIEWER, 'index.html'), html);
console.log('Viewer generated.');

const run = cmd => execSync(cmd, { cwd: VIEWER, stdio: 'pipe' }).toString().trim();
if (!fs.existsSync(path.join(VIEWER, '.git'))) {
  run('git init -b main');
  run(`git remote add origin ${PUBLISH_REPO}`);
}
run('git add index.html');
try {
  run(`git commit -m "publish board snapshot"`);
} catch (e) {
  console.log('No changes since last publish.');
  process.exit(0);
}
run('git push -f origin main');
console.log('Published. Link: https://rohanxezstays.github.io/ezstays-board/');
