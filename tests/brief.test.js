'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { generateBrief, daysBetween } = require('../lib/brief');

const TODAY = '2026-07-05';

function board(cards) {
  return {
    version: 1,
    columns: ['Inbox', 'This Week', 'Doing', 'Waiting On', 'Done'],
    streams: ['Meta Ads', 'SEO/Basecamp'],
    cards
  };
}

function card(over) {
  return Object.assign({
    id: 'c1', title: 'Test card', notes: '', stream: 'Meta Ads',
    column: 'Inbox', due: null, waitingOn: null,
    created: '2026-07-01T09:00:00Z', updated: '2026-07-04T09:00:00Z', done: null
  }, over);
}

test('daysBetween counts whole days', () => {
  assert.equal(daysBetween('2026-07-01', '2026-07-05'), 4);
});

test('calm board says so in one line', () => {
  const out = generateBrief(board([]), TODAY);
  assert.match(out, /Nothing due, stalled, or waiting today/);
});

test('overdue card listed under Overdue', () => {
  const out = generateBrief(board([card({ title: 'Refill ad balance', due: '2026-07-03' })]), TODAY);
  assert.match(out, /## Overdue/);
  assert.match(out, /Refill ad balance.*was due 2026-07-03/);
});

test('due today listed under Due Today, not Overdue', () => {
  const out = generateBrief(board([card({ due: TODAY })]), TODAY);
  assert.match(out, /## Due Today/);
  assert.doesNotMatch(out, /## Overdue/);
});

test('Done cards never flagged', () => {
  const out = generateBrief(board([card({ column: 'Done', due: '2026-07-01', done: '2026-07-02T10:00:00Z' })]), TODAY);
  assert.match(out, /Nothing due, stalled, or waiting today/);
});

test('card in Doing untouched >5 days is stalled', () => {
  const out = generateBrief(board([card({ column: 'Doing', updated: '2026-06-25T09:00:00Z' })]), TODAY);
  assert.match(out, /## Stalled/);
  assert.match(out, /10 days/);
});

test('Waiting On older than 3 days flagged with person and age', () => {
  const out = generateBrief(board([card({ column: 'Waiting On', waitingOn: 'Sharda warden', updated: '2026-07-01T09:00:00Z' })]), TODAY);
  assert.match(out, /## Waiting On/);
  assert.match(out, /Sharda warden — 4 days/);
});

test('summary line has per-column counts', () => {
  const out = generateBrief(board([card({}), card({ id: 'c2', column: 'Done' })]), TODAY);
  assert.match(out, /Inbox: 1/);
  assert.match(out, /Done: 1/);
});
