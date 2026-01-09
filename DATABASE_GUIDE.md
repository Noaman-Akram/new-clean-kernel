# Database Guide (Firebase + Event Log)

This app is single-user, multi-device. The goal is:
- normal CRUD for the UI
- a permanent, append-only log so data is never lost
- reliable multi-device sync without flicker

## What You Need To Create in Firebase

1) Create a Firebase project.
2) Enable Firestore (Native mode).
3) Enable Firebase Auth (Email/Password is simplest).
4) Create one user account and record the UID.
5) Create a Web App in Firebase and copy config values.

### Credentials We Need in `.env.local`
These are all from the Firebase Web App config:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

We also need the single user UID from Firebase Auth:
- `VITE_FIREBASE_USER_UID` (we will use this in rules or code, depending on approach)

## Data Model (Recommended)

Use two layers:
1) **Primary CRUD state** for the UI (fast, normal edits)
2) **Append-only event log** for permanent history

### Collections

**Primary State**
- `users/{uid}/state/app`
  - Contains the current app state snapshot for fast load.
  - You can split into modules later (tasks, notes, etc.) if needed.

**Event Log (Append-only)**
- `users/{uid}/events/{eventId}`
  - Every create/update/delete generates an event.
  - Deletes are stored as tombstones (not actual deletes).

### Event Document Shape (suggested)
```
{
  id: string,                // eventId
  entity: string,            // "task" | "note" | "transaction" | ...
  entityId: string,          // id in UI
  action: string,            // "create" | "update" | "delete"
  patch: object,             // the data delta (or full payload)
  createdAt: serverTimestamp(),
  clientId: string,          // device id
  deviceTime: number         // Date.now() on client
}
```

### Snapshot Document Shape (suggested)
```
{
  stateVersion: number,
  updatedAt: serverTimestamp(),
  data: { ...AppState }
}
```

## Why This Works
- UI uses CRUD on the snapshot (fast, normal experience).
- The event log is permanent. Even deletes become events.
- Multi-device sync only merges small deltas, not whole state.
- If needed, we can rebuild state from the log.

## Firestore Security Rules (Single User)

This locks data to your UID and prevents deletion of log events.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/state/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/events/{eventId} {
      allow create: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if false; // append-only log
    }
  }
}
```

## Realtime Sync Best Practices (No Flicker)

When we reintroduce sync:
- Do **not** overwrite whole app state on every snapshot.
- Use **small docs** per module or patch updates.
- Use `update()` with partial writes, not full `set()`.
- Add `updatedAt` to each entity and ignore older updates.
- Debounce saves and ignore remote updates while typing.

## Backups (Optional but Strongly Recommended)
- Schedule Firestore exports (daily/weekly) to Cloud Storage.
- Keep a local export option in the UI for manual backups.

## Notes
- This guide describes the target structure. The app is currently local-only.
- Once you confirm Firebase setup, we will wire it in using this model.
