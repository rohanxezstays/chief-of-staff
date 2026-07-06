'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso, toIso) {
  return Math.floor((new Date(toIso.slice(0, 10)) - new Date(fromIso.slice(0, 10))) / DAY_MS);
}

function generateBrief(board, todayIso, leads) {
  const active = board.cards.filter(c => c.column !== 'Done');
  const overdue = active.filter(c => c.due && c.due < todayIso);
  const dueToday = active.filter(c => c.due === todayIso);
  const stalled = active.filter(c =>
    (c.column === 'Doing' || c.column === 'This Week') && daysBetween(c.updated, todayIso) > 5);
  const waiting = active.filter(c =>
    c.column === 'Waiting On' && daysBetween(c.updated, todayIso) > 3);

  const lines = [`# Daily Brief — ${todayIso}`, ''];

  if (!overdue.length && !dueToday.length && !stalled.length && !waiting.length) {
    lines.push('Nothing due, stalled, or waiting today. Board is calm.');
  } else {
    if (overdue.length) {
      lines.push('## Overdue', '');
      for (const c of overdue) lines.push(`- **${c.title}** (${c.stream}) — was due ${c.due}`);
      lines.push('');
    }
    if (dueToday.length) {
      lines.push('## Due Today', '');
      for (const c of dueToday) lines.push(`- **${c.title}** (${c.stream})`);
      lines.push('');
    }
    if (stalled.length) {
      lines.push('## Stalled', '');
      for (const c of stalled) lines.push(`- **${c.title}** (${c.stream}) — untouched ${daysBetween(c.updated, todayIso)} days in ${c.column}`);
      lines.push('');
    }
    if (waiting.length) {
      lines.push('## Waiting On', '');
      for (const c of waiting) lines.push(`- **${c.title}** — waiting on ${c.waitingOn || 'someone'} — ${daysBetween(c.updated, todayIso)} days`);
      lines.push('');
    }
  }

  if (leads && leads.length) {
    const stale = leads.filter(l =>
      l.status === 'new' && daysBetween(l.updated, todayIso) > 2);
    if (stale.length) {
      lines.push('## Leads', '');
      for (const l of stale) lines.push(`- **${l.name}** (${l.source}${l.university ? ', ' + l.university : ''}) — uncontacted ${daysBetween(l.updated, todayIso)} days`);
      lines.push('');
    }
  }

  const counts = board.columns
    .map(col => `${col}: ${board.cards.filter(c => c.column === col).length}`)
    .join(' · ');
  lines.push('', `_${counts}_`);
  if (leads && leads.length) {
    const statuses = ['new', 'contacted', 'visited', 'booked', 'lost'];
    lines.push(`_Leads — ${statuses.map(s => `${s}: ${leads.filter(l => l.status === s).length}`).join(' · ')}_`);
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = { generateBrief, daysBetween };
