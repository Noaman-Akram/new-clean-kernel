import { AppState, Category, TaskStatus, Page } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

const STORAGE_KEY = 'noeman_kernel_v11_crm_prod';
const USER_ID = 'user_default';

// --- DEFAULT STATE ---
const generateFutureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d.getTime();
}

const INITIAL_STATE: AppState = {
  currentPage: Page.COCKPIT,
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
    // Chest
    { id: 'ex-bench-press', name: 'Bench Press', category: 'CHEST', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-incline-bench', name: 'Incline Bench Press', category: 'CHEST', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-dumbbell-press', name: 'Dumbbell Press', category: 'CHEST', isCustom: false, defaultRestTime: 120 },
    { id: 'ex-chest-fly', name: 'Chest Fly', category: 'CHEST', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-pushups', name: 'Push-ups', category: 'CHEST', isCustom: false, defaultRestTime: 60 },

    // Back
    { id: 'ex-deadlift', name: 'Deadlift', category: 'BACK', isCustom: false, defaultRestTime: 240 },
    { id: 'ex-barbell-row', name: 'Barbell Row', category: 'BACK', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-pullups', name: 'Pull-ups', category: 'BACK', isCustom: false, defaultRestTime: 120 },
    { id: 'ex-lat-pulldown', name: 'Lat Pulldown', category: 'BACK', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-seated-row', name: 'Seated Cable Row', category: 'BACK', isCustom: false, defaultRestTime: 90 },

    // Legs
    { id: 'ex-squat', name: 'Squat', category: 'LEGS', isCustom: false, defaultRestTime: 240 },
    { id: 'ex-leg-press', name: 'Leg Press', category: 'LEGS', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-lunges', name: 'Lunges', category: 'LEGS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-leg-curl', name: 'Leg Curl', category: 'LEGS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-leg-extension', name: 'Leg Extension', category: 'LEGS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-calf-raise', name: 'Calf Raises', category: 'LEGS', isCustom: false, defaultRestTime: 60 },

    // Shoulders
    { id: 'ex-overhead-press', name: 'Overhead Press', category: 'SHOULDERS', isCustom: false, defaultRestTime: 180 },
    { id: 'ex-lateral-raise', name: 'Lateral Raises', category: 'SHOULDERS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-front-raise', name: 'Front Raises', category: 'SHOULDERS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-rear-delt-fly', name: 'Rear Delt Fly', category: 'SHOULDERS', isCustom: false, defaultRestTime: 60 },

    // Arms
    { id: 'ex-barbell-curl', name: 'Barbell Curl', category: 'ARMS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-hammer-curl', name: 'Hammer Curl', category: 'ARMS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-tricep-dips', name: 'Tricep Dips', category: 'ARMS', isCustom: false, defaultRestTime: 90 },
    { id: 'ex-tricep-extension', name: 'Tricep Extension', category: 'ARMS', isCustom: false, defaultRestTime: 60 },
    { id: 'ex-close-grip-bench', name: 'Close Grip Bench', category: 'ARMS', isCustom: false, defaultRestTime: 120 },

    // Core
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
  stickyNotes: {}
};

// --- DATA LAYER ---

// 1. LOAD
export const loadState = async (): Promise<AppState> => {
  let localData: AppState | null = null;

  // 1. Try LocalStorage (Fastest)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with INITIAL_STATE to ensure new fields (like stickyNotes) exist
      localData = { ...INITIAL_STATE, ...parsed };
    }
  } catch (e) {
    console.error("Local read error", e);
  }

  // 2. Try Firebase (Source of Truth)
  if (db) {
    try {
      const docRef = doc(db, "users", USER_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // CONFLICT RESOLUTION:
        // If LocalStorage has a significantly newer 'lastSync' timestamp than the Cloud,
        // it means we have pending writes. We MUST prefer local to avoid reversion.
        const cloudTime = data.metrics?.lastSync ? new Date(data.metrics.lastSync).getTime() : 0;
        const localTime = localData?.metrics?.lastSync ? new Date(localData.metrics.lastSync).getTime() : 0;

        if (localData && localTime > cloudTime + 2000) {
          console.log("💾 Local is newer than Cloud - Preferring Local");
          setDoc(docRef, localData).catch(e => console.error("Background sync failed", e));
          return localData;
        }

        console.log("☁️ Loaded from Cloud");
        const mergedData = {
          ...INITIAL_STATE,
          ...data,
          marketing: data.marketing || [],
          accounts: data.accounts || [],
          activities: data.activities || [],
          shoppingList: data.shoppingList || [],
          workoutSessions: data.workoutSessions || [],
          workoutTemplates: data.workoutTemplates || [],
          exercises: data.exercises || INITIAL_STATE.exercises,
          stickyNotes: data.stickyNotes || {}
        } as AppState;
        return mergedData;
      } else {
        console.log("☁️ New Cloud User - Seeding Data from Local or Default");
        // If we have local data, upload it to seed the cloud. Otherwise use default.
        const seedData = localData || INITIAL_STATE;
        await setDoc(docRef, seedData);
        return seedData;
      }
    } catch (e) {
      console.error("Cloud load error, falling back to local:", e);
      // Fallback is handled below
    }
  }

  // 3. Final Fallback
  console.log(localData ? "💾 Loaded from Local" : "✨ Starting Fresh (Default State)");
  return localData || INITIAL_STATE;
};

// 1.5 SUBSCRIBE (Real-time)
export const subscribeToState = (onUpdate: (state: AppState) => void): Unsubscribe | null => {
  if (!db) return null;

  try {
    const docRef = doc(db, "users", USER_ID);
    // Turn on the listener
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("🔥 Real-time Update Received");
        const mergedState = {
          ...INITIAL_STATE,
          ...data,
          marketing: data.marketing || INITIAL_STATE.marketing,
          accounts: data.accounts || INITIAL_STATE.accounts,
          activities: data.activities || INITIAL_STATE.activities,
          shoppingList: data.shoppingList || INITIAL_STATE.shoppingList,
          workoutSessions: data.workoutSessions || INITIAL_STATE.workoutSessions,
          workoutTemplates: data.workoutTemplates || INITIAL_STATE.workoutTemplates,
          exercises: data.exercises || INITIAL_STATE.exercises,
          stickyNotes: data.stickyNotes || INITIAL_STATE.stickyNotes
        } as AppState;
        onUpdate(mergedState);
      }
    }, (error) => {
      console.error("Real-time sync error:", error);
    });

    return unsubscribe;
  } catch (e) {
    console.error("Subscription setup failed", e);
    return null;
  }
};

// 2. SAVE (Debounced slightly in UI, but direct here)
export const saveState = async (state: AppState) => {
  // A. Save to Local (Always for speed/backup)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Local save failed', e);
  }

  // B. Sync to Firebase (Fire and forget)
  if (db) {
    try {
      // DEBUG: Log state before save to catch undefined values
      // console.log("☁️ Syncing to Cloud...", state); 
      await setDoc(doc(db, "users", USER_ID), state);
      // console.log("☁️ Synced to Cloud");
    } catch (e: any) {
      console.error("🔥 Cloud sync failed DETAILED:", e);
      if (e.message.includes("undefined")) {
        console.error("UNDEFINED FIELD FOUND. Inspecting state keys:");
        Object.keys(state).forEach(key => {
          const val = (state as any)[key];
          if (val === undefined) console.error(`TOP LEVEL KEY ${key} is UNDEFINED`);
          if (Array.isArray(val)) {
            val.forEach((item, idx) => {
              if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(subKey => {
                  if (item[subKey] === undefined) {
                    console.error(`ARRAY ${key}[${idx}].${subKey} is UNDEFINED`);
                  }
                });
              }
            });
          }
        });
      }
    }
  }
};
