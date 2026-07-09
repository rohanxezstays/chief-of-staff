'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DEFAULT_DATA = path.join(ROOT, 'data', 'board.json');
const DEFAULT_LEADS = path.join(ROOT, 'data', 'leads.json');
const DASHBOARD = path.join(ROOT, 'dashboard');
const PORT = Number(process.env.COS_PORT || process.env.PORT || 4820);
const MAX_BACKUPS = 50;

// Cloud mode: when GIST_ID + GITHUB_TOKEN are set, board/leads live in a
// GitHub Gist so data survives restarts on ephemeral free hosting.
// BOARD_PASSWORD, when set, gates every request with HTTP Basic Auth.
const GIST_ID = process.env.GIST_ID || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const CLOUD = !!(GIST_ID && GITHUB_TOKEN);
const PASSWORD = process.env.BOARD_PASSWORD || '';

const DEFAULT_BOARD = { version: 1, columns: ['Inbox', 'This Week', 'Doing', 'Waiting On', 'Done'], streams: ['Work', 'Personal'], cards: [] };
const DEFAULT_LEADS_DOC = { version: 1, leads: [] };

async function gistRead(name, fallback) {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'chief-of-staff' }
  });
  if (!r.ok) throw new Error(`gist read failed: ${r.status}`);
  const gist = await r.json();
  const file = gist.files[name];
  return file && file.content ? file.content : JSON.stringify(fallback, null, 2);
}

async function gistWrite(name, content) {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'chief-of-staff', 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [name]: { content } } })
  });
  if (!r.ok) throw new Error(`gist write failed: ${r.status}`);
}

function basename(file, fallbackName) {
  return file ? path.basename(file) : fallbackName;
}

function isAuthed(req) {
  if (!PASSWORD) return true;
  const h = String(req.headers.authorization || '');
  const [scheme, val] = h.split(' ');
  if (scheme !== 'Basic' || !val) return false;
  const pass = Buffer.from(val, 'base64').toString().split(':').slice(1).join(':');
  return pass === PASSWORD;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function ensureBoard(dataFile) {
  if (fs.existsSync(dataFile)) return;
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const example = path.join(path.dirname(dataFile), 'board.example.json');
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, dataFile);
    return;
  }
  fs.writeFileSync(dataFile, JSON.stringify({
    version: 1,
    columns: ['Inbox', 'This Week', 'Doing', 'Waiting On', 'Done'],
    streams: ['Work', 'Personal'],
    cards: []
  }, null, 2));
}

function backupBoard(dataFile) {
  const backups = path.join(path.dirname(dataFile), 'backups');
  fs.mkdirSync(backups, { recursive: true });
  const prefix = path.basename(dataFile, '.json');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(dataFile, path.join(backups, `${prefix}-${stamp}.json`));
  const files = fs.readdirSync(backups).filter(f => f.startsWith(prefix + '-')).sort();
  while (files.length > MAX_BACKUPS) fs.unlinkSync(path.join(backups, files.shift()));
}

function ensureLeads(leadsFile) {
  if (fs.existsSync(leadsFile)) return;
  fs.mkdirSync(path.dirname(leadsFile), { recursive: true });
  fs.writeFileSync(leadsFile, JSON.stringify({ version: 1, leads: [] }, null, 2));
}

function createServer(dataFile = DEFAULT_DATA, leadsFile = DEFAULT_LEADS) {
  if (!CLOUD) { ensureBoard(dataFile); ensureLeads(leadsFile); }
  const resources = {
    '/api/board': { file: dataFile, name: basename(dataFile, 'board.json'), fallback: DEFAULT_BOARD, validate: p => Array.isArray(p.cards) && Array.isArray(p.columns), error: 'board must have cards[] and columns[]' },
    '/api/leads': { file: leadsFile, name: basename(leadsFile, 'leads.json'), fallback: DEFAULT_LEADS_DOC, validate: p => Array.isArray(p.leads), error: 'payload must have leads[]' }
  };

  async function readResource(r) {
    if (CLOUD) return gistRead(r.name, r.fallback);
    return fs.readFileSync(r.file, 'utf8');
  }
  async function writeResource(r, content) {
    if (CLOUD) return gistWrite(r.name, content);
    backupBoard(r.file);
    fs.writeFileSync(r.file, content);
  }

  return http.createServer(async (req, res) => {
    try {
      // password gate (cloud) — protects the whole app
      if (!isAuthed(req)) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Chief of Staff"', 'Content-Type': 'text/plain' });
        res.end('Authentication required');
        return;
      }

      // leads hold phone numbers — owner-only. With a password, an authed
      // request IS the owner, so leads are allowed. Without a password
      // (local/tunnel), fall back to a localhost Host-header check so
      // tunnel visitors can't reach the ledger.
      if (req.url.startsWith('/api/leads') && !PASSWORD) {
        const host = String(req.headers.host || '');
        if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end('{"error":"leads are private to the owner"}');
          return;
        }
      }

      const resource = resources[req.url];
      if (resource && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(await readResource(resource));
        return;
      }
      if (resource && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body);
            if (!resource.validate(parsed)) throw new Error(resource.error);
            await writeResource(resource, JSON.stringify(parsed, null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
        return;
      }

      // static dashboard files
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
      const full = path.resolve(DASHBOARD, rel);
      if (!full.startsWith(DASHBOARD + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(fs.readFileSync(full));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} already in use — dashboard probably already running. Open http://localhost:${PORT}`);
      process.exit(1);
    }
    throw err;
  });
  server.listen(PORT, () => console.log(`Chief of Staff dashboard: http://localhost:${PORT}`));
}

module.exports = { createServer, backupBoard, ensureBoard, ensureLeads };
