# Meeting Capture Procedure

How the Chief of Staff captures a Google Meet call: live captions (Google's voice-to-text) → full transcript + essential notes → action items onto the board.

## Trigger

Rohan says "join my meeting", "take notes on this call", or similar, with a Meet running or about to run in his Chrome.

## 1. Setup

1. Load Chrome tools via ToolSearch in one call:
   `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_page`
2. Find the Google Meet tab (`tabs_context_mcp`). If Rohan gave an invite URL instead, open it and wait for him to be admitted.
3. **Turn on captions:** check the page for a caption region. If off, click the "Turn on captions" (CC) button via the computer tool (bottom toolbar; keyboard shortcut `c` also works when focus is on the call).
4. Confirm captions are rendering (speaker name + text visible in page text).
5. Tell Rohan: "Capture running." Ask the meeting topic if not obvious — needed for filenames.
6. **If captions are unavailable** (button missing, feature disabled): say so immediately and stop. Never pretend to capture.

## 2. Capture loop

- Every ~45–60 seconds, `get_page_text` the Meet tab.
- Extract the caption region: lines of `Speaker Name` followed by their words.
- Append only NEW text to the running transcript: compare against the last ~20 captured lines and keep unseen text (captions scroll and repeat — dedupe by exact line match, and for a partially-extended line keep the longer version).
- Keep the accumulating transcript in the conversation; optionally checkpoint to the transcript file every ~10 minutes for long calls.

## 3. End of meeting

When Rohan says it's over, or the tab shows the call ended, write two files:

**`meetings/YYYY-MM-DD-<topic-slug>-transcript.md`**

```markdown
# <Topic> — Transcript
**Date:** YYYY-MM-DD · **Duration:** ~Xm · **Attendees:** (names seen in captions)

**Rohan:** ...
**Other Person:** ...
```

**`meetings/YYYY-MM-DD-<topic-slug>-notes.md`**

```markdown
# <Topic> — Notes
**Date:** YYYY-MM-DD

## Decisions
- ...

## Action items
- [ ] Who — what — by when

## Key numbers
- ...

## Follow-ups
- ...

## Open questions
- ...
```

Keep notes essential: only what changes what someone does next. No transcript re-narration.

## 4. Board hand-off

For every action item owned by Rohan (or unassigned):
- Add a card to board **Inbox** (`data/board.json` — follow backup + `updated` rules in `../CLAUDE.md`)
- `title` = the action, `due` = deadline if one was said, `notes` = "From meeting: meetings/<notes-file>"
- `stream` = best match (Meta Ads / SEO/Basecamp / Leads & Bookings / Partnerships / Personal Brand)

Then tell Rohan: X action items added to Inbox, link both files.

## 5. Interruptions

Capture breaks (tab closed, PC slept, call dropped):
- Save whatever transcript exists with this line at the top: `> ⚠ Partial — capture interrupted at HH:MM`
- Still produce the notes file from what was captured.
- Tell Rohan exactly where capture stopped.
