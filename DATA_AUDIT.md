# Data Audit (Local-Only Reset)

This document maps current UI screens to the data they read/write. Use it to rebuild storage with full CRUD plus an append-only event log.

## Global State (AppState)
- tasks
- activities
- clients
- transactions
- accounts
- shoppingList (unused in UI)
- notes
- resources
- marketing
- metrics
- prayerLog
- adhkarLog
- chatHistory
- activeSession
- horizonGoals
- stickyNotes
- dayMeta
- workoutSessions
- workoutTemplates
- exercises

## Cockpit (DashboardView)
- Reads: tasks, metrics, prayerLog, clients, transactions
- Writes: tasks (add/update), prayerLog, adhkarLog, notes (add/update)
- Derived: overdue tasks, revenue progress, outreach stats, next prayer

## Weekly Planner (WeeklyPlannerView)
- Reads: tasks, stickyNotes, dayMeta, prayerLog
- Writes: tasks (add/update/delete), stickyNotes, dayMeta
- Extra: task scheduling (slot, scheduledTime, duration), habitTracking, dockSection, pillar

## CRM (CRMView)
- Reads/Writes: clients (full CRUD + stage, tags, deal metadata)
- Derived: leads/clients/team/partners, accounts (derived from company)

## Network (NetworkView)
- Reads/Writes: clients filtered by context=PERSONAL
- Minimal personal fields: name, role, contactHandle, nextAction, lastInteraction

## Ledger (LedgerView)
- Reads/Writes: accounts, transactions
- Derived: net balance, income/expense, per-account totals

## Marketing (MarketingView)
- Reads/Writes: marketing items (content, identity, platform, posted state)

## Notes (NotesView)
- Reads/Writes: notes (title, content, updatedAt, tags)

## Resources (ResourcesView)
- Reads/Writes: resources (title, url, category, description)

## Activities (ActivitiesView)
- Reads/Writes: activities (title, location, category, vibe, details, lastVisited)

## Gym (GymView)
- Reads/Writes: workoutSessions, workoutTemplates, exercises
- Notes: sessions include exercises, sets, rest times, PRs

## Supplications (SupplicationsView)
- Reads/Writes: prayerLog, adhkarLog
- Static data: adhkar/prayer texts are local constants

## Mentor (MentorView)
- Reads/Writes: chatHistory, horizonGoals
- Network call: OpenRouter for chat responses (not storage)

## Metrics
- Writes happen in cockpit or other modules (revenue/target/outreach/streak)

## Storage Notes
- currentPage is local UI only (not persisted)
- New storage should support:
  - Full CRUD for primary collections
  - Append-only event log (immutable) for every change
  - Tombstone events for deletes
  - Periodic snapshots for fast load
