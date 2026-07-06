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
header { display:flex; align-items:center; gap:12px; padding:14px 20px; flex-wrap:wrap; }
header img { height:26px; }
h1 { font-size:16px; margin:0; }
.sub { font-size:11px; color:var(--muted); margin-left:auto; }
#board { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; padding:0 20px 20px; align-items:start; }
.column { background:var(--col); border-radius:10px; padding:10px; min-height:80px; }
.column h2 { font-size:12px; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); margin:2px 4px 10px; display:flex; justify-content:space-between; }
.card { background:var(--card); border-radius:8px; padding:10px 12px; margin-bottom:8px; }
.title { font-weight:600; }
.meta { display:flex; gap:8px; margin-top:6px; flex-wrap:wrap; font-size:11px; color:var(--muted); }
.badge { border-radius:4px; padding:1px 6px; background:#333a4d; }
.badge.overdue { background:var(--danger); color:#fff; }
.dot { display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:5px; vertical-align:1px; }
.progressRow { display:flex; align-items:center; gap:8px; margin-top:8px; }
.progress { flex:1; height:5px; background:#333a4d; border-radius:999px; overflow:hidden; }
.bar { height:100%; background:var(--accent); border-radius:999px; }
.bar.complete { background:var(--green); }
.pct { font-size:10px; color:var(--muted); min-width:28px; text-align:right; }
footer { text-align:center; color:var(--muted); font-size:11px; padding:10px 0 24px; }
@media (max-width:1000px) { #board { grid-template-columns:1fr 1fr; } }
@media (max-width:600px) { #board { grid-template-columns:1fr; } }
</style>
</head>
<body>
<header>
  ${logoDataUri ? `<img src="${logoDataUri}" alt="EzStays">` : ''}
  <h1>Board</h1>
  <span class="sub">read-only · updated ${publishedAt} IST</span>
</header>
<main id="board"></main>
<footer>Published from Chief of Staff</footer>
<script>
const board = ${safeJson};
const PALETTE = ${JSON.stringify(PALETTE)};
const streamColor = s => { const i = board.streams.indexOf(s); return i >= 0 ? PALETTE[i % PALETTE.length] : '#9aa0b0'; };
const today = new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
const root = document.getElementById('board');
for (const col of board.columns) {
  const cards = board.cards.filter(c => c.column === col);
  const sec = document.createElement('section');
  sec.className = 'column';
  sec.innerHTML = '<h2><span>' + esc(col) + '</span><span>' + cards.length + '</span></h2>';
  for (const c of cards) {
    const list = c.checklist || [];
    const ticked = list.filter(i => i.done).length;
    const pct = list.length ? Math.round(ticked / list.length * 100) : 0;
    const overdue = c.due && c.due < today && c.column !== 'Done';
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML =
      '<div class="title">' + esc(c.title) + '</div>' +
      '<div class="meta">' +
        '<span class="badge"><span class="dot" style="background:' + streamColor(c.stream) + '"></span>' + esc(c.stream) + '</span>' +
        (c.due ? '<span class="badge' + (overdue ? ' overdue' : '') + '">due ' + esc(c.due) + '</span>' : '') +
        (c.waitingOn ? '<span class="badge">⏳ ' + esc(c.waitingOn) + '</span>' : '') +
        (list.length ? '<span class="badge">✓ ' + ticked + '/' + list.length + '</span>' : '') +
      '</div>' +
      (list.length ? '<div class="progressRow"><div class="progress"><div class="bar' + (pct === 100 ? ' complete' : '') + '" style="width:' + pct + '%"></div></div><span class="pct">' + pct + '%</span></div>' : '');
    sec.appendChild(el);
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
