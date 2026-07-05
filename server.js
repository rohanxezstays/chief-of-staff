'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DEFAULT_DATA = path.join(ROOT, 'data', 'board.json');
const DASHBOARD = path.join(ROOT, 'dashboard');
const PORT = process.env.COS_PORT ? Number(process.env.COS_PORT) : 4820;
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
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(dataFile, path.join(backups, `board-${stamp}.json`));
  const files = fs.readdirSync(backups).filter(f => f.startsWith('board-')).sort();
  while (files.length > MAX_BACKUPS) fs.unlinkSync(path.join(backups, files.shift()));
}

function createServer(dataFile = DEFAULT_DATA) {
  ensureBoard(dataFile);
  return http.createServer((req, res) => {
    if (req.url === '/api/board' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(dataFile));
      return;
    }
    if (req.url === '/api/board' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed.cards) || !Array.isArray(parsed.columns)) {
            throw new Error('board must have cards[] and columns[]');
          }
          backupBoard(dataFile);
          fs.writeFileSync(dataFile, JSON.stringify(parsed, null, 2));
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
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
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

module.exports = { createServer, backupBoard, ensureBoard };
