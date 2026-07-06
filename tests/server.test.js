'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createServer } = require('../server');

function tmpBoard() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-'));
  const file = path.join(dir, 'board.json');
  fs.writeFileSync(file, JSON.stringify({ version: 1, columns: ['Inbox'], streams: [], cards: [] }));
  return file;
}

function listen(server) {
  return new Promise(resolve => server.listen(0, () => resolve(server.address().port)));
}

test('GET /api/board returns board json', async () => {
  const file = tmpBoard();
  const server = createServer(file);
  const port = await listen(server);
  const res = await fetch(`http://localhost:${port}/api/board`);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.version, 1);
  server.close();
});

test('POST /api/board writes file and creates backup', async () => {
  const file = tmpBoard();
  const server = createServer(file);
  const port = await listen(server);
  const newBoard = { version: 1, columns: ['Inbox'], streams: [], cards: [{ id: 'x', title: 'T', column: 'Inbox' }] };
  const res = await fetch(`http://localhost:${port}/api/board`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBoard)
  });
  assert.equal(res.status, 200);
  const written = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(written.cards.length, 1);
  const backups = fs.readdirSync(path.join(path.dirname(file), 'backups'));
  assert.equal(backups.length, 1);
  server.close();
});

test('POST with invalid shape returns 400 and does not write', async () => {
  const file = tmpBoard();
  const before = fs.readFileSync(file, 'utf8');
  const server = createServer(file);
  const port = await listen(server);
  const res = await fetch(`http://localhost:${port}/api/board`, { method: 'POST', body: '{"nope":true}' });
  assert.equal(res.status, 400);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  server.close();
});

test('leads API: GET bootstraps empty ledger, POST writes with backup', async () => {
  const file = tmpBoard();
  const leadsFile = path.join(path.dirname(file), 'leads.json');
  const server = createServer(file, leadsFile);
  const port = await listen(server);
  const j1 = await (await fetch(`http://localhost:${port}/api/leads`)).json();
  assert.deepEqual(j1.leads, []);
  const r2 = await fetch(`http://localhost:${port}/api/leads`, {
    method: 'POST', body: JSON.stringify({ version: 1, leads: [{ id: 'l1', name: 'Aman', status: 'new' }] })
  });
  assert.equal(r2.status, 200);
  const written = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
  assert.equal(written.leads.length, 1);
  const backups = fs.readdirSync(path.join(path.dirname(file), 'backups')).filter(f => f.startsWith('leads-'));
  assert.equal(backups.length, 1);
  server.close();
});

test('static path traversal is blocked', async () => {
  const file = tmpBoard();
  const server = createServer(file);
  const port = await listen(server);
  const res = await fetch(`http://localhost:${port}/..%2f..%2fserver.js`);
  assert.equal(res.status, 404);
  server.close();
});
