import { AppState } from '../types';
import { db } from './firebase';
import { getDefaultUserPreferences, getDefaultProtocolContexts, getDefaultWeeklyActivities } from '../defaultPreferences';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';

const STORAGE_KEY = 'noeman_kernel_local_v2';
const META_KEY = 'noeman_kernel_meta_v1';
const CLIENT_KEY = 'noeman_kernel_client_id';
const SNAPSHOT_DOC_ID = 'app';

type ChangeAction = 'create' | 'update' | 'delete';

export type SnapshotMeta = {
  version: number;
  updatedAt: number;
  clientId: string | null;
};

type ChangeRecord = {
  entity: string;
  entityId: string;
  action: ChangeAction;
  data?: any;
  prev?: any;
};

let currentUserId: string | null = null;
let lastSnapshotMeta: SnapshotMeta = { version: 0, updatedAt: 0, clientId: null };
let lastSavedState: AppState | null = null;

// --- DEFAULT STATE ---
const INITIAL_STATE: AppState = {
  activeSession: {
    taskId: null,
    startTime: null
  },
  tasks: [],
  clients: [],
  transactions: [],
  notes: [],
  resources: [],
  marketing: [],
  activities: [],
  accounts: [],
  shoppingList: [],
  workoutSessions: [],
  workoutTemplates: [],
  exercises: [
    { id: 'ex-bench-press', name: 'Bench Press', category: 'CHEST', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-incline-bench', name: 'Incline Bench Press', category: 'CHEST', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-dumbbell-press', name: 'Dumbbell Press', category: 'CHEST', isCustom: false, defaultRestTime: 120 },
    { id: 'ex-chest-fly', name: 'Chest Fly', category: 'CHEST', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-pushups', name: 'Push-ups', category: 'CHEST', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-deadlift', name: 'Deadlift', category: 'BACK', isCustom: false, defaultRestTime: 240 },
    { id: 'ex-barbell-row', name: 'Barbell Row', category: 'BACK', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-pullups', name: 'Pull-ups', category: 'BACK', isCustom: false, defaultRestTime: 120 },
    { id: 'ex-lat-pulldown', name: 'Lat Pulldown', category: 'BACK', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-seated-row', name: 'Seated Cable Row', category: 'BACK', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-squat', name: 'Squat', category: 'LEGS', isCustom: false, defaultRestTime: 240 },
    { id: 'ex-leg-press', name: 'Leg Press', category: 'LEGS', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-lunges', name: 'Lunges', category: 'LEGS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-leg-curl', name: 'Leg Curl', category: 'LEGS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-leg-extension', name: 'Leg Extension', category: 'LEGS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-calf-raise', name: 'Calf Raises', category: 'LEGS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-overhead-press', name: 'Overhead Press', category: 'SHOULDERS', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-lateral-raise', name: 'Lateral Raises', category: 'SHOULDERS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-front-raise', name: 'Front Raises', category: 'SHOULDERS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-rear-delt-fly', name: 'Rear Delt Fly', category: 'SHOULDERS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-barbell-curl', name: 'Barbell Curl', category: 'ARMS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-hammer-curl', name: 'Hammer Curl', category: 'ARMS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-tricep-dips', name: 'Tricep Dips', category: 'ARMS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-tricep-extension', name: 'Tricep Extension', category: 'ARMS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-close-grip-bench', name: 'Close Grip Bench', category: 'ARMS', isCustom: false, defaultRestTime: 120 },
    { id: 'ex-plank', name: 'Plank', category: 'CORE', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-crunches', name: 'Crunches', category: 'CORE', isCustom: false, defaultRestTime: 45 },
    { id: 'ex-hanging-leg-raise', name: 'Hanging Leg Raises', category: 'CORE', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-russian-twist', name: 'Russian Twists', category: 'CORE', isCustom: false, defaultRestTime: 45 }
  ],
  metrics: {
    revenue: 0,
    target: 0,
    streak: 0,
    lastSync: new Date().toISOString(),
    outreachCount: 0
  },
  prayerLog: {},
  adhkarLog: {},
  chatHistory: [],
  horizonGoals: [],
  stickyNotes: {},
  dayMeta: {},
  userPreferences: getDefaultUserPreferences(),
  distractions: [],
  focusSessions: [],
  protocolContexts: getDefaultProtocolContexts(),
  weeklyActivities: getDefaultWeeklyActivities(),
  dailyProtocolState: {},
  timeBlocks: {}

};

const cloneState = (state: AppState) => JSON.parse(JSON.stringify(state));

const getClientIdInternal = () => {
  try {
    const existing = localStorage.getItem(CLIENT_KEY);
    if (existing) return existing;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `client_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(CLIENT_KEY, id);
    return id;
  } catch {
    return `client_${Date.now()}`;
  }
};

const loadLocalMeta = (): SnapshotMeta => {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { version: 0, updatedAt: 0, clientId: null };
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || 0,
      updatedAt: parsed.updatedAt || 0,
      clientId: parsed.clientId || null
    };
  } catch {
    return { version: 0, updatedAt: 0, clientId: null };
  }
};

const saveLocalMeta = (meta: SnapshotMeta) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.error('Local meta save failed', e);
  }
};

const persistLocalState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Local save failed', e);
  }
};

const extractMeta = (data: any): SnapshotMeta => {
  const updatedAt = data?.updatedAt instanceof Timestamp
    ? data.updatedAt.toMillis()
    : data?.updatedAt
      ? new Date(data.updatedAt).getTime()
      : 0;
  return {
    version: data?.version || 0,
    updatedAt,
    clientId: data?.clientId || null
  };
};

const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

const diffArrayById = (entity: string, prev: any[], next: any[]): ChangeRecord[] => {
  const prevMap = new Map(prev.map(item => [String(item.id), item]));
  const nextMap = new Map(next.map(item => [String(item.id), item]));
  const changes: ChangeRecord[] = [];

  nextMap.forEach((nextItem, id) => {
    const prevItem = prevMap.get(id);
    if (!prevItem) {
      changes.push({ entity, entityId: id, action: 'create', data: nextItem });
      return;
    }
    if (!isEqual(prevItem, nextItem)) {
      changes.push({ entity, entityId: id, action: 'update', data: nextItem, prev: prevItem });
    }
  });

  prevMap.forEach((prevItem, id) => {
    if (!nextMap.has(id)) {
      changes.push({ entity, entityId: id, action: 'delete', prev: prevItem });
    }
  });

  return changes;
};

const diffArrayByTimestamp = (entity: string, prev: any[], next: any[]): ChangeRecord[] => {
  const prevMap = new Map(prev.map(item => [String(item.timestamp), item]));
  const nextMap = new Map(next.map(item => [String(item.timestamp), item]));
  const changes: ChangeRecord[] = [];

  nextMap.forEach((nextItem, id) => {
    const prevItem = prevMap.get(id);
    if (!prevItem) {
      changes.push({ entity, entityId: id, action: 'create', data: nextItem });
      return;
    }
    if (!isEqual(prevItem, nextItem)) {
      changes.push({ entity, entityId: id, action: 'update', data: nextItem, prev: prevItem });
    }
  });

  prevMap.forEach((prevItem, id) => {
    if (!nextMap.has(id)) {
      changes.push({ entity, entityId: id, action: 'delete', prev: prevItem });
    }
  });

  return changes;
};

const diffRecord = (entity: string, prev: Record<string, any>, next: Record<string, any>): ChangeRecord[] => {
  const changes: ChangeRecord[] = [];
  const prevKeys = new Set(Object.keys(prev || {}));
  const nextKeys = new Set(Object.keys(next || {}));

  nextKeys.forEach((key) => {
    if (!prevKeys.has(key)) {
      changes.push({ entity, entityId: key, action: 'create', data: next[key] });
      return;
    }
    if (!isEqual(prev[key], next[key])) {
      changes.push({ entity, entityId: key, action: 'update', data: next[key], prev: prev[key] });
    }
  });

  prevKeys.forEach((key) => {
    if (!nextKeys.has(key)) {
      changes.push({ entity, entityId: key, action: 'delete', prev: prev[key] });
    }
  });

  return changes;
};

const diffSingleton = (entity: string, prev: any, next: any): ChangeRecord[] => {
  if (isEqual(prev, next)) return [];
  return [{ entity, entityId: 'singleton', action: 'update', data: next, prev }];
};

const computeChanges = (prevState: AppState, nextState: AppState): ChangeRecord[] => {
  const changes: ChangeRecord[] = [];

  changes.push(...diffArrayById('task', prevState.tasks, nextState.tasks));
  changes.push(...diffArrayById('activity', prevState.activities, nextState.activities));
  changes.push(...diffArrayById('client', prevState.clients, nextState.clients));
  changes.push(...diffArrayById('transaction', prevState.transactions, nextState.transactions));
  changes.push(...diffArrayById('account', prevState.accounts, nextState.accounts));
  changes.push(...diffArrayById('shoppingItem', prevState.shoppingList, nextState.shoppingList));
  changes.push(...diffArrayById('note', prevState.notes, nextState.notes));
  changes.push(...diffArrayById('resource', prevState.resources, nextState.resources));
  changes.push(...diffArrayById('marketingItem', prevState.marketing, nextState.marketing));
  changes.push(...diffArrayById('horizonGoal', prevState.horizonGoals, nextState.horizonGoals));
  changes.push(...diffArrayById('workoutSession', prevState.workoutSessions, nextState.workoutSessions));
  changes.push(...diffArrayById('workoutTemplate', prevState.workoutTemplates, nextState.workoutTemplates));
  changes.push(...diffArrayById('exercise', prevState.exercises, nextState.exercises));
  changes.push(...diffArrayByTimestamp('chatMessage', prevState.chatHistory, nextState.chatHistory));

  changes.push(...diffRecord('prayerLog', prevState.prayerLog, nextState.prayerLog));
  changes.push(...diffRecord('adhkarLog', prevState.adhkarLog, nextState.adhkarLog));
  changes.push(...diffRecord('stickyNote', prevState.stickyNotes, nextState.stickyNotes));
  changes.push(...diffRecord('dayMeta', prevState.dayMeta, nextState.dayMeta));

  changes.push(...diffSingleton('metrics', prevState.metrics, nextState.metrics));
  changes.push(...diffSingleton('activeSession', prevState.activeSession, nextState.activeSession));

  return changes;
};

export const setCurrentUser = (uid: string | null) => {
  currentUserId = uid;
};

export const getClientId = () => getClientIdInternal();

export const getSnapshotMeta = () => lastSnapshotMeta;

export const applyRemoteState = (state: AppState, meta: SnapshotMeta) => {
  persistLocalState(state);
  lastSnapshotMeta = meta;
  saveLocalMeta(meta);
  lastSavedState = cloneState(state);
};

// 1. LOAD
export const loadState = async (): Promise<AppState> => {
  let localData: AppState | null = null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      localData = { ...INITIAL_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Local read error', e);
  }

  const localMeta = loadLocalMeta();
  lastSnapshotMeta = localMeta;

  let resolvedState = localData || INITIAL_STATE;

  if (db && currentUserId) {
    try {
      const docRef = doc(db, 'users', currentUserId, 'state', SNAPSHOT_DOC_ID);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        const remoteMeta = extractMeta(data);
        const remoteState = data?.data ? { ...INITIAL_STATE, ...data.data } : null;

        const useRemote = remoteState &&
          (remoteMeta.version > localMeta.version || remoteMeta.updatedAt > localMeta.updatedAt);

        if (useRemote && remoteState) {
          resolvedState = remoteState;
          lastSnapshotMeta = remoteMeta;
          persistLocalState(resolvedState);
          saveLocalMeta(remoteMeta);
        }
      } else {
        const clientId = getClientIdInternal();
        const seedVersion = Math.max(localMeta.version || 0, 0) + 1;
        await setDoc(docRef, {
          version: seedVersion,
          updatedAt: serverTimestamp(),
          clientId,
          data: resolvedState
        });
        lastSnapshotMeta = { version: seedVersion, updatedAt: Date.now(), clientId };
        saveLocalMeta(lastSnapshotMeta);
      }
    } catch (e) {
      console.error('Cloud load error, falling back to local:', e);
    }
  }

  lastSavedState = cloneState(resolvedState);
  console.log(localData ? '💾 Loaded from Local' : '✨ Starting Fresh (Default State)');
  return resolvedState;
};

export const subscribeToRemoteState = (
  onUpdate: (state: AppState, meta: SnapshotMeta) => void
): Unsubscribe | null => {
  if (!db || !currentUserId) return null;

  try {
    const docRef = doc(db, 'users', currentUserId, 'state', SNAPSHOT_DOC_ID);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const remoteState = data?.data ? { ...INITIAL_STATE, ...data.data } : null;
      if (!remoteState) return;
      const remoteMeta = extractMeta(data);
      onUpdate(remoteState, remoteMeta);
    }, (error) => {
      console.error('Real-time sync error:', error);
    });

    return unsubscribe;
  } catch (e) {
    console.error('Subscription setup failed', e);
    return null;
  }
};

// 2. SAVE
export const saveState = async (state: AppState) => {
  persistLocalState(state);

  if (!db || !currentUserId) {
    lastSavedState = cloneState(state);
    return;
  }

  const clientId = getClientIdInternal();
  const nextVersion = (lastSnapshotMeta.version || 0) + 1;
  const changes = computeChanges(lastSavedState || INITIAL_STATE, state);

  const docRef = doc(db, 'users', currentUserId, 'state', SNAPSHOT_DOC_ID);
  try {
    await setDoc(docRef, {
      version: nextVersion,
      updatedAt: serverTimestamp(),
      clientId,
      data: state
    });

    if (changes.length > 0) {
      await addDoc(collection(db, 'users', currentUserId, 'events'), {
        version: nextVersion,
        createdAt: serverTimestamp(),
        clientId,
        changes
      });
    }
  } catch (error) {
    console.error('Cloud save failed:', error);
    throw error;
  }

  lastSnapshotMeta = { version: nextVersion, updatedAt: Date.now(), clientId };
  saveLocalMeta(lastSnapshotMeta);
  lastSavedState = cloneState(state);
};
