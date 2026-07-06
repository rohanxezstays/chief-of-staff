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
  ensureBoard(dataFile);
  ensureLeads(leadsFile);
  const resources = {
    '/api/board': { file: dataFile, validate: p => Array.isArray(p.cards) && Array.isArray(p.columns), error: 'board must have cards[] and columns[]' },
    '/api/leads': { file: leadsFile, validate: p => Array.isArray(p.leads), error: 'payload must have leads[]' }
  };
  return http.createServer((req, res) => {
    // leads hold phone numbers — owner-only. Tunnel traffic reaches us
    // over loopback, so the remote IP is useless; the Host header is
    // what the tunnel routes by, so it reliably marks external requests.
    if (req.url.startsWith('/api/leads')) {
      const host = String(req.headers.host || '');
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end('{"error":"leads are private to the owner"}');
        return;
      }
    }
    const resource = resources[req.url];
    if (resource && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(resource.file));
      return;
    }
    if (resource && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (!resource.validate(parsed)) throw new Error(resource.error);
          backupBoard(resource.file);
          fs.writeFileSync(resource.file, JSON.stringify(parsed, null, 2));
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
