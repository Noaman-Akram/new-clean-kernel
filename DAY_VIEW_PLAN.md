# Day View Plan (Living Doc)

## Status
- Phase: Planning (no implementation yet)
- Owner: Nemo + Codex
- Last Updated: 2025-02-14

## Goals
- Build a reliable Day View that can manage daily tasks and habits end-to-end.
- Keep changes incremental and finishable.

## Scope (Locked)
**Required**
- Date (YYYY-MM-DD)
- Tasks: title, status, category, urgent, notes, scheduledTime (duration optional)
- Task time blocks based on `scheduledTime`
- Rituals/Habits per day (generic habit list)
- Context: Overdue + Tomorrow preview

**Optional (later)**
- Day focus (niyyah)
- Day checklist
- Sticky note
- Metrics (streak/score)

## UX Decisions (Selected)
1) Inline task input + inline edit: **Option A** (quick edit row)
2) Simple capture input: **Option A** (single-line, adds to today inbox time)
3) Habits streaks: **Option A** (per-habit streak count)
4) Niyyah input: **Option B** (single line + pin to header) — needs placement change
5) Quote of the day: **Option A** (local list, rotate by date)
6) Quick stats: **TBD** (generate more options)
7) Tomorrow preview: **TBD** (need other options)

## UI Structure (Draft)
- Header: date nav + prayer strip (optional) + small context
- Left: capture + overdue + tomorrow preview
- Center: schedule (needs redesign; no prayer blocks)
- Right: habits/rituals + quick stats + niyyah

## Schedule Layout Options (Pick One)
A) Timeline + Inbox
- Top: “Inbox / Unscheduled” list
- Below: hourly timeline (chips/cards for scheduled tasks)

B) Dual Column
- Left: Unscheduled list (sortable)
- Right: Scheduled timeline (hour grid)

C) Single Feed
- Mixed list sorted by time; unscheduled pinned at top as a section

## Data Mapping (Draft)
- Tasks for selected day: `state.tasks` filtered by `scheduledTime` date match
- Overdue: `scheduledTime < today` and `status !== DONE`
- Tomorrow: `scheduledTime` date match for tomorrow
- Habits: `dayMeta[date].rituals` (generic list)
- Niyyah: `dayMeta[date].focus`
- Quotes: local file list; daily index via date hash

## Open Questions
- Final quick stats layout and metrics
- Final tomorrow preview format
- Source and storage for habit definitions (list of habits)
- Which schedule layout option (A/B/C)
- Where to place niyyah (right panel vs header footer)

## Next Steps
- Pick schedule layout option
- Pick quick stats option
- Pick tomorrow preview option
- Confirm habit list source
- Then implement incrementally
