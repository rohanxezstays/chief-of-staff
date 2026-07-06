'use strict';
const fs = require('fs');
const path = require('path');
const { generateBrief } = require('./lib/brief');
const { ensureBoard, ensureLeads } = require('./server');

const ROOT = __dirname;
const dataFile = path.join(ROOT, 'data', 'board.json');
const leadsFile = path.join(ROOT, 'data', 'leads.json');
ensureBoard(dataFile);
ensureLeads(leadsFile);
const board = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8')).leads;
const today = process.argv[2] || new Date().toISOString().slice(0, 10);
const outDir = path.join(ROOT, 'briefs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${today}.md`);
fs.writeFileSync(outFile, generateBrief(board, today, leads));
console.log(`Brief written: ${outFile}`);
