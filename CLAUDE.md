# CLAUDE.md — Noeman Kernel

## Project Overview

**Noeman Kernel** is a personal operating system — a monolithic single-user React SPA that integrates productivity, CRM, finance, fitness, spiritual practice, and AI mentorship into one coherent UI. It runs on Firebase for cloud sync and falls back gracefully to localStorage-only when Firebase is not configured.

**Stack:** React 19 + TypeScript + Vite + Firebase + Tailwind CSS (via CDN utility classes) + Lucide React icons.

---

## Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server on http://localhost:3000
npm run build     # Production build (outputs to dist/)
npm run preview   # Preview the production build locally
```

No test runner is configured. There is no lint script. The TypeScript compiler is set to `noEmit: true` — type checking is only done via IDE integration or manual `tsc --noEmit`.

---

## Environment Variables

Create a `.env.local` file (gitignored) with the following keys:

```
# Firebase (required for cloud sync; app runs locally without these)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_USER_UID=   # UID of the single authorized user

# AI (optional)
VITE_OPENROUTER_API_KEY=  # For the Protocol (Mentor) AI chat feature
GEMINI_API_KEY=            # Legacy Gemini key exposed via process.env
```

The app runs in **local-only mode** if `VITE_FIREBASE_API_KEY` is absent. All state is persisted to `localStorage` under the key `noeman_kernel_local_v2`.

---

## Repository Structure

```
/
├── App.tsx                  # Root component: auth, routing, all state handlers
├── index.tsx                # React DOM entry point
├── types.ts                 # ALL shared TypeScript types and enums (single source of truth)
├── utils.ts                 # Shared utility functions (generateId, formatDate, prayer utils)
├── defaultPreferences.ts    # Factory functions for default AppState values
├── vite.config.ts           # Vite config: port 3000, @-alias to root, Gemini env injection
├── tsconfig.json            # TS config: ESNext, bundler resolution, @/* path alias
├── package.json
├── metadata.json            # App metadata for AI Studio
│
├── services/
│   ├── firebase.ts          # Firebase initialization (graceful no-op if unconfigured)
│   ├── storageService.ts    # All persistence logic: load/save/sync state with Firestore
│   └── openRouterService.ts # OpenRouter API client for AI chat (MentorView)
│
├── components/              # All UI views and shared components
│   ├── DashboardView.tsx    # COCKPIT — main hub with KPIs, quick nav, prayer widget
│   ├── WeeklyPlannerView.tsx# WEEKLY — week-at-a-glance planner
│   ├── DayView.tsx          # DAY — detailed day view (timeline/periods/kanban layouts)
│   ├── DayLayouts.tsx       # Sub-layouts for DayView (timeline, periods, kanban)
│   ├── PlannerView.tsx      # Inner planner component used by WeeklyPlannerView
│   ├── CRMView.tsx          # CRM — client/lead pipeline management
│   ├── NetworkView.tsx      # NETWORK — personal network (friends, family, mentors)
│   ├── LedgerView.tsx       # LEDGER — income/expense tracking with accounts
│   ├── MarketingView.tsx    # MARKETING — content drafts and post tracking
│   ├── MentorView.tsx       # PROTOCOL — AI mentor chat (OpenRouter) + horizon goals
│   ├── SupplicationsView.tsx# SANCTUARY — prayer log + adhkar
│   ├── NotesView.tsx        # INTEL — note-taking
│   ├── ResourcesView.tsx    # ARSENAL — curated resource/link library
│   ├── ActivitiesView.tsx   # ACTIVITIES — location/activity log
│   ├── GymView.tsx          # GYM — workout tracker (templates + sessions + sets)
│   ├── FocusView.tsx        # FOCUS — distraction-free task focus with distraction logging
│   ├── Backlog.tsx          # Backlog panel component
│   ├── ChallengeSetupModal.tsx  # Iron Protocol challenge setup modal
│   ├── ChallengeWidget.tsx  # Dashboard widget for active challenge
│   ├── ContextMenu.tsx      # Shared right-click context menu
│   ├── DashboardSettings.tsx# Dashboard customization panel
│   ├── DockItemDialog.tsx   # Dialog for editing dock/task items
│   ├── FinancialHUD.tsx     # Financial summary heads-up display
│   ├── HourOverlay.tsx      # Hour-based time overlay for day view
│   ├── HunterLog.tsx        # Activity/log display component
│   ├── IdentitySelector.tsx # Identity switcher (AGENCY/CAREER/PERSONAL)
│   ├── InspectorPanel.tsx   # Detail panel for inspecting selected items
│   ├── MonoFocus.tsx        # Mono-focus mode component
│   ├── PrayerAnchor.tsx     # Prayer time anchor/indicator
│   ├── ProtocolsEditor.tsx  # Editor for daily protocol contexts
│   ├── ProtocolsSidebar.tsx # Sidebar for protocol display
│   ├── SmartEditPopover.tsx # Inline smart edit popover
│   └── WeeklyActivitiesEditor.tsx # Editor for per-day weekly activities
│
└── utils/
    ├── prayerTimes.ts       # Prayer time calculation using adhan lib (Cairo coords)
    └── quotes.ts            # Motivational quotes for display
```

---

## Architecture & Key Patterns

### State Management

All application state lives in a single `AppState` object (`types.ts:465`) managed by React `useState` in `App.tsx`. There is **no Redux, Zustand, or Context API** — state is prop-drilled from `App.tsx` down to every view component.

**Pattern:** Every view receives the full `state: AppState` plus specific `onXxx` callback handlers. Handler functions in `App.tsx` use the immutable update pattern:

```typescript
setState(prev => prev ? ({ ...prev, tasks: [...prev.tasks, newTask] }) : null);
```

### Persistence Layer (`services/storageService.ts`)

Two-tier persistence:
1. **localStorage** (`noeman_kernel_local_v2`) — always-on, fast, works offline
2. **Firestore** (`users/{uid}/state/app`) — cloud sync when Firebase is configured

**Sync strategy:**
- On load: compare local version vs remote version; use whichever is newer
- On save: debounce 1 second, then write to localStorage + Firestore atomically
- Real-time: Firestore `onSnapshot` listener updates state from other devices
- Conflict resolution: version number wins; dirty writes are queued in `pendingRemoteRef`
- Change log: every save appends a diff to `users/{uid}/events` (append-only audit log)

**Key exported functions:**
- `loadState()` — async, merges local + remote on startup
- `saveState(state)` — debounced via `App.tsx` useEffect; call directly to save now
- `subscribeToRemoteState(callback)` — sets up Firestore real-time listener
- `applyRemoteState(state, meta)` — applies incoming remote state without triggering re-save

### Routing

No React Router. Navigation is a simple `Page` enum value stored in `useState<Page>` in `App.tsx`. The current page is persisted to `localStorage` under `noeman_local_page`. The `renderView()` function in `App.tsx:727` is a switch statement that maps `Page` values to view components.

### ID Generation

Use `generateId()` from `utils.ts` — returns a 7-character alphanumeric string via `Math.random().toString(36).substring(2, 9)`. All entity IDs in `AppState` use this format.

### Date Keys

Date-keyed records (prayers, day meta, sticky notes, protocol state) use `YYYY-MM-DD` string format. Use `getTodayKey()` from `utils.ts` for consistency.

---

## Domain Model (types.ts)

### Core Entities

| Type | Purpose |
|------|---------|
| `Task` | The central work unit. Has status, category, impact, scheduling, subtasks, habit tracking |
| `Client` | Unified entity for CRM (clients/leads) and Network (personal contacts) |
| `Transaction` | Financial record linked to an account and optionally a client |
| `Account` | Financial account (cash/bank/crypto/asset) |
| `Note` | Free-form note with tags |
| `Resource` | Curated URL with category and description |
| `MarketingItem` | Content draft/post with identity and platform |
| `Activity` | Location-based activity log |
| `WorkoutSession` / `WorkoutTemplate` / `Exercise` | Gym tracking data |
| `Challenge` | Iron Protocol challenge with daily history |
| `ProtocolContext` | Named daily routine context with checklist items |

### Key Enums

- `Page` — navigation destinations (COCKPIT, WEEKLY, DAY, CRM, NETWORK, LEDGER, MARKETING, MENTOR/PROTOCOL, SUPPLICATIONS/SANCTUARY, INTEL, ARSENAL, GYM, FOCUS)
- `TaskStatus` — BACKLOG, TODO, IN_PROGRESS, DONE
- `Category` — CORE, GROWTH, SERVICE
- `DockSection` — ROUTINE, TEMPLATE, PROJECT, TODO, LATER, HABIT
- `CRMStage` — LEAD, CONTACTED, DISCOVERY, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST
- `EntityContext` — NEMO (business) | PERSONAL
- `EntityType` — TEAM, CANDIDATE, CLIENT, NETWORK, PARTNER

---

## Styling Conventions

- **No separate CSS files** — all styling via Tailwind utility classes inline in JSX
- **Color palette:** `zinc-*` for neutrals, `emerald-*` for active/success states, `red-*` for destructive/error, `amber-*` for warnings
- **Design tokens (used as class patterns):**
  - `bg-background` — main page background (dark near-black)
  - `bg-surface` — card/panel backgrounds (slightly lighter)
  - `border-border` — standard border color
  - `text-zinc-400` — default body text
  - `text-zinc-200` / `text-zinc-100` — emphasized text
  - `text-zinc-500` — muted/label text
- **Typography:** `font-mono` for labels, badges, and metadata; `font-sans` for content
- **Active state indicator:** emerald left-border bar (`absolute left-0 ... bg-emerald-500`)
- **Density:** All UI is designed for dark mode; no light mode exists

---

## Component Conventions

### View Components

Each page view follows this interface shape:
```typescript
interface Props {
  state: AppState;           // Full app state (read-only from view's perspective)
  onXxx: (args) => void;    // Specific action callbacks only relevant to this view
}

const ViewName: React.FC<Props> = ({ state, onXxx }) => { ... };
export default ViewName;
```

Views never call `setState` directly — they call the `onXxx` handlers that `App.tsx` provides.

### Icon Usage

All icons come from `lucide-react`. Import only what you use:
```typescript
import { LayoutGrid, Users, CreditCard } from 'lucide-react';
```

Standard icon sizes: `size={18}` for nav icons, `size={16}` for inline/button icons, `size={14}` for compact UI.

---

## AI Integration

### Protocol / Mentor View (`MentorView.tsx` + `services/openRouterService.ts`)

Uses OpenRouter API (configurable model, defaults to `deepseek/deepseek-r1-0528:free`). Chat history is stored in `AppState.chatHistory` and synced to Firebase like any other state. The system prompt is defined in `MentorView.tsx`.

To change the AI model, update the `model` parameter in `sendMessageToOpenRouter()` calls within `MentorView.tsx`.

---

## Firebase Setup (for cloud sync)

See `DATABASE_GUIDE.md` for full Firestore setup instructions. Summary:

1. Create Firebase project → enable Firestore (Native) + Auth (Email/Password)
2. Create one user, copy UID
3. Create Web App config, copy all values to `.env.local`
4. Deploy Firestore security rules from `DATABASE_GUIDE.md`

**Firestore structure:**
```
users/{uid}/state/app       # Full state snapshot (overwritten on every save)
users/{uid}/events/{id}     # Append-only change log (never deleted)
```

---

## Common Development Tasks

### Adding a new Page/View

1. Add the new value to the `Page` enum in `types.ts`
2. Create `components/NewView.tsx` following the standard Props interface
3. Add a `case Page.NEW_VIEW:` to `renderView()` in `App.tsx`
4. Add `NavIcon` entries to the sidebar in `App.tsx` (desktop + mobile)
5. Add `MobileNavIcon` entry to the mobile nav bar in `App.tsx`

### Adding a new field to AppState

1. Update the relevant interface in `types.ts`
2. Add a default value in `INITIAL_STATE` in `services/storageService.ts`
3. Add the merge into loaded state in `loadState()`: `{ ...INITIAL_STATE, ...parsed }` already handles this automatically for new fields
4. Add a handler function in `App.tsx` if mutation is needed
5. Pass the handler down to relevant view components

### Adding a new entity type

1. Define the interface/type in `types.ts`
2. Add the array/record to `AppState` interface
3. Initialize it in `INITIAL_STATE`
4. Add diff logic in `computeChanges()` in `storageService.ts` (for audit log)
5. Create CRUD handlers in `App.tsx`

---

## Important Constraints

- **Single user only:** Firebase rules and the `VITE_FIREBASE_USER_UID` check enforce one authorized user. Do not build multi-user features.
- **No test suite:** There are no unit or integration tests. Validate behavior manually in the browser.
- **No TypeScript strict mode:** `strict` is not enabled in `tsconfig.json` — be careful with null checks and optional fields.
- **Prayer times are Cairo-specific:** `utils/prayerTimes.ts` hardcodes `CAIRO_COORDS`. The fallback in `utils.ts` also uses hardcoded Cairo times.
- **State is a single blob:** Firestore stores the entire `AppState` as one document. For large datasets this can approach Firestore's 1MB document limit — keep individual arrays lean.
- **No router library:** Do not introduce React Router or similar. Navigation is handled by the `Page` enum state.
- **Tailwind via CDN:** There is no PostCSS/Tailwind build step. Do not use `tailwind.config.js` or `@apply`. Use only inline utility classes.
