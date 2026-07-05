'use strict';
const fs = require('fs');
const path = require('path');
const { generateBrief } = require('./lib/brief');
const { ensureBoard } = require('./server');

const ROOT = __dirname;
const dataFile = path.join(ROOT, 'data', 'board.json');
ensureBoard(dataFile);
const board = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const today = process.argv[2] || new Date().toISOString().slice(0, 10);
const outDir = path.join(ROOT, 'briefs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${today}.md`);
fs.writeFileSync(outFile, generateBrief(board, today));
console.log(`Brief written: ${outFile}`);
