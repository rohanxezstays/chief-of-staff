'use strict';

const PALETTE = [
  'var(--s-meta)', 'var(--s-seo)', 'var(--s-leads)', 'var(--s-partners)', 'var(--s-brand)',
  '#f87171', '#4ade80', '#fbbf24', '#38bdf8', '#c084fc'
];

function streamColor(stream) {
  const i = board.streams.indexOf(stream);
  return i >= 0 ? PALETTE[i % PALETTE.length] : 'var(--muted)';
}

const LEAD_STATUSES = ['new', 'contacted', 'visited', 'booked', 'lost'];

let board = null;
let leadsDoc = null;
let view = 'board'; // 'board' | 'leads'
let activeStream = null; // null = all
let editingId = null;
let editingLeadId = null;
let editChecklist = []; // working copy while edit dialog is open

const $ = sel => document.querySelector(sel);
const todayIso = () => new Date().toISOString().slice(0, 10);
const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function load() {
  board = await (await fetch('/api/board')).json();
  leadsDoc = await (await fetch('/api/leads')).json();
  render();
}

async function saveLeads() {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadsDoc)
  });
  if (!res.ok) alert('Save failed — is the server running?');
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
  $('#tabBoard').classList.toggle('active', view === 'board');
  $('#tabLeads').classList.toggle('active', view === 'leads');
  $('#filters').style.display = view === 'board' ? '' : 'none';
  if (view === 'leads') { renderLeads(); return; }
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
  const list = card.checklist || [];
  const ticked = list.filter(i => i.done).length;
  const pct = list.length ? Math.round(ticked / list.length * 100) : 0;
  el.innerHTML = `
    <div class="title"></div>
    <div class="meta">
      <span class="badge stream"><span class="dot"></span></span>
      ${list.length ? `<span class="badge checks ${pct === 100 ? 'complete' : ''}">✓ ${ticked}/${list.length}</span>` : ''}
      ${card.due ? `<span class="badge ${overdue ? 'overdue' : ''}">due ${card.due}</span>` : ''}
      ${card.waitingOn ? `<span class="badge">⏳ ${escapeHtml(card.waitingOn)}</span>` : ''}
    </div>
    ${list.length ? `
    <div class="progressRow">
      <div class="progress"><div class="bar ${pct === 100 ? 'complete' : ''}" style="width:${pct}%"></div></div>
      <span class="pct">${pct}%</span>
    </div>` : ''}`;
  el.querySelector('.title').textContent = card.title;
  el.querySelector('.dot').style.background = streamColor(card.stream);
  el.querySelector('.stream').appendChild(document.createTextNode(card.stream));
  el.ondragstart = e => e.dataTransfer.setData('text/plain', card.id);
  el.onclick = () => openEdit(card.id);
  return el;
}

function renderLeads() {
  const root = $('#board');
  root.innerHTML = '';
  for (const status of LEAD_STATUSES) {
    const colEl = document.createElement('section');
    colEl.className = 'column';
    const leads = leadsDoc.leads.filter(l => l.status === status);
    colEl.innerHTML = `<h2><span>${status}</span><span>${leads.length}</span></h2>`;
    for (const l of leads) colEl.appendChild(renderLead(l));
    if (status === 'new') {
      const add = document.createElement('button');
      add.className = 'addBtn';
      add.textContent = '+ Add lead';
      add.onclick = () => openLead(null);
      colEl.appendChild(add);
    }
    colEl.ondragover = e => { e.preventDefault(); colEl.classList.add('dragover'); };
    colEl.ondragleave = () => colEl.classList.remove('dragover');
    colEl.ondrop = e => {
      e.preventDefault();
      colEl.classList.remove('dragover');
      moveLead(e.dataTransfer.getData('text/plain'), status);
    };
    root.appendChild(colEl);
  }
}

function renderLead(l) {
  const el = document.createElement('article');
  el.className = 'card';
  el.draggable = true;
  const age = Math.floor((Date.now() - new Date(l.created)) / 86400000);
  el.innerHTML = `
    <div class="title"></div>
    <div class="meta">
      <span class="badge src"></span>
      ${l.university ? `<span class="badge uni"></span>` : ''}
      <span class="badge">${age}d</span>
    </div>`;
  el.querySelector('.title').textContent = l.name;
  el.querySelector('.src').textContent = l.source;
  if (l.university) el.querySelector('.uni').textContent = l.university;
  el.ondragstart = e => e.dataTransfer.setData('text/plain', l.id);
  el.onclick = () => openLead(l.id);
  return el;
}

function moveLead(id, status) {
  const l = leadsDoc.leads.find(x => x.id === id);
  if (!l || l.status === status) return;
  l.status = status;
  l.updated = new Date().toISOString();
  saveLeads();
}

function openLead(id) {
  editingLeadId = id;
  const form = $('#leadForm');
  const l = id ? leadsDoc.leads.find(x => x.id === id) : null;
  form.name.value = l ? l.name : '';
  form.phone.value = l ? (l.phone || '') : '';
  form.source.value = l ? l.source : 'Meta';
  form.university.value = l ? (l.university || '') : '';
  form.notes.value = l ? (l.notes || '') : '';
  $('#leadDialog').showModal();
}

$('#leadDialog').addEventListener('close', () => {
  const action = $('#leadDialog').returnValue;
  const form = $('#leadForm');
  const id = editingLeadId;
  editingLeadId = null;
  if (action === 'delete' && id) {
    const l = leadsDoc.leads.find(x => x.id === id);
    if (l && confirm(`Delete lead "${l.name}"?`)) {
      leadsDoc.leads = leadsDoc.leads.filter(x => x.id !== id);
      saveLeads();
    }
    return;
  }
  if (action !== 'save' || !form.name.value.trim()) return;
  const now = new Date().toISOString();
  if (id) {
    const l = leadsDoc.leads.find(x => x.id === id);
    if (!l) return;
    l.name = form.name.value.trim();
    l.phone = form.phone.value.trim();
    l.source = form.source.value;
    l.university = form.university.value.trim();
    l.notes = form.notes.value;
    l.updated = now;
  } else {
    leadsDoc.leads.push({
      id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.value.trim(), phone: form.phone.value.trim(),
      source: form.source.value, university: form.university.value.trim(),
      status: 'new', notes: form.notes.value, created: now, updated: now
    });
  }
  saveLeads();
});

$('#tabBoard').onclick = () => { view = 'board'; render(); };
$('#tabLeads').onclick = () => { view = 'leads'; render(); };

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
  const manage = document.createElement('button');
  manage.className = 'chip manage';
  manage.textContent = '✎ streams';
  manage.onclick = openStreams;
  el.appendChild(manage);
}

function openStreams() {
  renderStreamList();
  $('#streamDialog').showModal();
}

function renderStreamList() {
  const ul = $('#streamList');
  ul.innerHTML = '';
  for (const s of board.streams) {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = streamColor(s);
    const name = document.createElement('span');
    name.textContent = s;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'rm';
    rm.textContent = '✕';
    rm.title = 'Remove stream';
    rm.onclick = () => removeStream(s);
    li.append(dot, name, rm);
    ul.appendChild(li);
  }
}

function addStream() {
  const input = $('#streamNew');
  const name = input.value.trim();
  if (!name) return;
  if (board.streams.some(s => s.toLowerCase() === name.toLowerCase())) {
    alert('That stream already exists.');
    return;
  }
  board.streams.push(name);
  input.value = '';
  save();
  renderStreamList();
}

function removeStream(name) {
  const used = board.cards.filter(c => c.stream === name).length;
  if (used > 0) {
    alert(`${used} card${used > 1 ? 's' : ''} still use "${name}". Move them to another stream first.`);
    return;
  }
  if (board.streams.length === 1) {
    alert('At least one stream is required.');
    return;
  }
  if (!confirm(`Remove stream "${name}"?`)) return;
  board.streams = board.streams.filter(s => s !== name);
  if (activeStream === name) activeStream = null;
  save();
  renderStreamList();
}

$('#streamAddBtn').onclick = addStream;
$('#streamNew').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addStream(); }
});
$('#streamClose').onclick = () => $('#streamDialog').close();

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
    column, due: null, waitingOn: null, checklist: [], created: now, updated: now, done: null
  });
  save();
}

function renderChecklist() {
  const ul = $('#checkList');
  ul.innerHTML = '';
  editChecklist.forEach((item, i) => {
    const li = document.createElement('li');
    if (item.done) li.className = 'checked';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = item.done;
    box.onchange = () => { item.done = box.checked; renderChecklist(); };
    const txt = document.createElement('span');
    txt.className = 'txt';
    txt.textContent = item.text;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'rm';
    rm.textContent = '✕';
    rm.title = 'Remove stage';
    rm.onclick = () => { editChecklist.splice(i, 1); renderChecklist(); };
    li.append(box, txt, rm);
    ul.appendChild(li);
  });
}

$('#checkNew').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const text = e.target.value.trim();
  if (!text) return;
  editChecklist.push({ text, done: false });
  e.target.value = '';
  renderChecklist();
});

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
  editChecklist = (card.checklist || []).map(i => ({ text: i.text, done: !!i.done }));
  renderChecklist();
  $('#checkNew').value = '';
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
  const leftover = $('#checkNew').value.trim();
  if (leftover) editChecklist.push({ text: leftover, done: false });
  const form = $('#editForm');
  card.title = form.title.value.trim() || card.title;
  card.notes = form.notes.value;
  card.stream = form.stream.value;
  card.due = form.due.value || null;
  card.waitingOn = form.waitingOn.value.trim() || null;
  card.checklist = editChecklist;
  touch(card);
  save();
});

load();
