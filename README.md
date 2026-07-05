# Chief of Staff

A personal Chief of Staff that runs entirely on your own computer: a Trello-style kanban board, an automatic morning brief, and a meeting note-taker — all controlled by talking to Claude in plain words. No accounts, no cloud, no dependencies. Your data is a JSON file you own.

![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen) ![Zero dependencies](https://img.shields.io/badge/dependencies-0-blue) ![License MIT](https://img.shields.io/badge/license-MIT-lightgrey)

## What you get

- **Board** — 5 columns (Inbox → This Week → Doing → Waiting On → Done), work-stream tags, due dates, "waiting on person" tracking. Drag cards in the browser or tell Claude "move pixel setup to doing".
- **Daily brief** — one command (or a Claude scheduled task) writes a morning summary: overdue, due today, stalled > 5 days, people who haven't replied in > 3 days.
- **Meeting notes** — with [Claude Code](https://claude.com/claude-code) + Chrome: Claude reads Google Meet live captions, saves a full transcript + essential notes (decisions, action items, key numbers), and drops action items into your board Inbox. See [meetings/README.md](meetings/README.md).
- **Safety** — every write backs up the previous board first (last 50 kept).

## Quick start

Requires [Node.js](https://nodejs.org) 18+.

```bash
git clone <this-repo>
cd chief-of-staff
npm start
```

Open http://localhost:4820. First run creates your board from a template.

## Install as a Windows app

Double-click **`install-windows.bat`**. It:

1. Makes the server start automatically (hidden) when you log in
2. Puts a **Chief of Staff** shortcut on your desktop that opens the board in its own app window
3. Starts the server right now

To uninstall: delete the desktop shortcut and `ChiefOfStaff-Server.lnk` from your Startup folder (`Win+R` → `shell:startup`).

On Mac/Linux: `npm start` and bookmark http://localhost:4820.

## Control it by chat (Claude Code)

Open this folder in Claude Code. [CLAUDE.md](CLAUDE.md) teaches Claude the board's rules, so you can just say:

- "add card: follow up with the landlord, due Friday"
- "what's stalled?"
- "I'm waiting on the accountant for the GST filing"
- "join my meeting" (with a Google Meet open in Chrome)

Personalize the intro of `CLAUDE.md` and the streams in `data/board.json` to your own life/business.

## Daily brief

```bash
npm run brief
```

Writes `briefs/YYYY-MM-DD.md`. With Claude Code, create a scheduled task that runs it every morning and messages you the top 3 items.

## Files

```
data/board.json        your board (created on first run, never committed)
data/board.example.json  starter template
dashboard/             the web UI
server.js              zero-dependency Node server (port 4820)
generate-brief.js      morning brief generator
CLAUDE.md              operating manual for Claude
meetings/              meeting transcripts + notes land here
```

## License

MIT
