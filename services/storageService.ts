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
          shoppingList: data.shoppingList || INITIAL_STATE.shoppingList
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
