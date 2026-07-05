'use strict';

const STREAM_COLORS = {
  'Meta Ads': 'var(--s-meta)',
  'SEO/Basecamp': 'var(--s-seo)',
  'Leads & Bookings': 'var(--s-leads)',
  'Partnerships': 'var(--s-partners)',
  'Personal Brand': 'var(--s-brand)'
};

let board = null;
let activeStream = null; // null = all
let editingId = null;

const $ = sel => document.querySelector(sel);
const todayIso = () => new Date().toISOString().slice(0, 10);
const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function load() {
  board = await (await fetch('/api/board')).json();
  render();
}

async function save() {
  const res = await fetch('/api/board', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(board)
  });
  if (!res.ok) alert('Save failed — is the server running?');
  render();
}

function touch(card) {
  card.updated = new Date().toISOString();
}

function render() {
  renderFilters();
  const root = $('#board');
  root.innerHTML = '';
  for (const col of board.columns) {
    const colEl = document.createElement('section');
    colEl.className = 'column';
    colEl.dataset.column = col;
    const cards = board.cards.filter(c => c.column === col && (!activeStream || c.stream === activeStream));
    colEl.innerHTML = `<h2><span>${col}</span><span>${cards.length}</span></h2>`;
    for (const card of cards) colEl.appendChild(renderCard(card));
    const add = document.createElement('button');
    add.className = 'addBtn';
    add.textContent = '+ Add';
    add.onclick = () => quickAdd(col);
    colEl.appendChild(add);
    colEl.ondragover = e => { e.preventDefault(); colEl.classList.add('dragover'); };
    colEl.ondragleave = () => colEl.classList.remove('dragover');
    colEl.ondrop = e => {
      e.preventDefault();
      colEl.classList.remove('dragover');
      moveCard(e.dataTransfer.getData('text/plain'), col);
    };
    root.appendChild(colEl);
  }
}

function renderCard(card) {
  const el = document.createElement('article');
  el.className = 'card';
  el.draggable = true;
  const overdue = card.due && card.due < todayIso() && card.column !== 'Done';
  el.innerHTML = `
    <div class="title"></div>
    <div class="meta">
      <span class="badge stream"><span class="dot"></span></span>
      ${card.due ? `<span class="badge ${overdue ? 'overdue' : ''}">due ${card.due}</span>` : ''}
      ${card.waitingOn ? `<span class="badge">⏳ ${escapeHtml(card.waitingOn)}</span>` : ''}
    </div>`;
  el.querySelector('.title').textContent = card.title;
  el.querySelector('.dot').style.background = STREAM_COLORS[card.stream] || 'var(--muted)';
  el.querySelector('.stream').appendChild(document.createTextNode(card.stream));
  el.ondragstart = e => e.dataTransfer.setData('text/plain', card.id);
  el.onclick = () => openEdit(card.id);
  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function renderFilters() {
  const el = $('#filters');
  el.innerHTML = '';
  const all = document.createElement('button');
  all.className = 'chip' + (activeStream === null ? ' active' : '');
  all.textContent = 'All';
  all.onclick = () => { activeStream = null; render(); };
  el.appendChild(all);
  for (const s of board.streams) {
    const b = document.createElement('button');
    b.className = 'chip' + (activeStream === s ? ' active' : '');
    b.textContent = s;
    b.onclick = () => { activeStream = activeStream === s ? null : s; render(); };
    el.appendChild(b);
  }
}

function moveCard(id, column) {
  const card = board.cards.find(c => c.id === id);
  if (!card || card.column === column) return;
  card.column = column;
  card.done = column === 'Done' ? new Date().toISOString() : null;
  touch(card);
  save();
}

function quickAdd(column) {
  const title = prompt(`New card in ${column}:`);
  if (!title || !title.trim()) return;
  const now = new Date().toISOString();
  board.cards.push({
    id: uid(), title: title.trim(), notes: '', stream: activeStream || board.streams[0],
    column, due: null, waitingOn: null, created: now, updated: now, done: null
  });
  save();
}

function openEdit(id) {
  const card = board.cards.find(c => c.id === id);
  if (!card) return;
  editingId = id;
  const form = $('#editForm');
  form.title.value = card.title;
  form.notes.value = card.notes || '';
  form.due.value = card.due || '';
  form.waitingOn.value = card.waitingOn || '';
  const sel = form.stream;
  sel.innerHTML = board.streams.map(s => `<option${s === card.stream ? ' selected' : ''}>${s}</option>`).join('');
  $('#editDialog').showModal();
}

$('#editDialog').addEventListener('close', () => {
  const action = $('#editDialog').returnValue;
  const card = board.cards.find(c => c.id === editingId);
  editingId = null;
  if (!card) return;
  if (action === 'delete') {
    if (confirm(`Delete "${card.title}"?`)) {
      board.cards = board.cards.filter(c => c.id !== card.id);
      save();
    }
    return;
  }
  if (action !== 'save') return;
  const form = $('#editForm');
  card.title = form.title.value.trim() || card.title;
  card.notes = form.notes.value;
  card.stream = form.stream.value;
  card.due = form.due.value || null;
  card.waitingOn = form.waitingOn.value.trim() || null;
  touch(card);
  save();
});

load();
