

import { AppState, Category, TaskStatus, Page } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  activities: [
    {
        id: 'act-1',
        title: 'Nemo HQ Work Sprint',
        category: 'WORK',
        location: 'Greek Campus, Downtown',
        vibe: 'FOCUS',
        details: 'Great wifi, desk setup, coffee downstairs',
        lastVisited: Date.now() - 86400000 * 2
    },
    {
        id: 'act-2',
        title: 'Boxing + Sauna',
        category: 'SPORT',
        location: 'MMA Factory, 6th October',
        vibe: 'ENERGY',
        details: 'Coach Ahmed, Tuesday/Thursday 7pm',
        lastVisited: Date.now() - 86400000 * 3
    },
    {
        id: 'act-3',
        title: 'Night Drive + Shawerma',
        category: 'HANGOUT',
        location: 'New Cairo -> Rehab street food',
        vibe: 'RELAX',
        details: 'Decompress after long sprint',
        lastVisited: Date.now() - 86400000 * 6
    }
  ],
  accounts: [
    { id: 'acc-cash', name: 'Cash', type: 'CASH', currency: 'USD' },
    { id: 'acc-bank', name: 'Bank', type: 'BANK', currency: 'USD' },
    { id: 'acc-crypto', name: 'Crypto', type: 'CRYPTO', currency: 'USD' }
  ],
  tasks: [
    {
      id: 't-1',
      title: 'Agency: Close 2 Clients to hit $1k Goal',
      status: TaskStatus.TODO,
      category: Category.AGENCY,
      createdAt: Date.now(),
      impact: 'HIGH',
      deadline: generateFutureDate(14),
      slot: { day: 'MON', hour: '09:00' },
      pillar: 'DESIGN'
    },
    {
      id: 't-2',
      title: 'Zoho: Finalize Migration Plan (KSA)',
      status: TaskStatus.TODO,
      category: Category.ZOHO,
      createdAt: Date.now(),
      impact: 'HIGH',
      deadline: generateFutureDate(0),
      slot: { day: 'WED', hour: '15:00' },
      pillar: 'MASTERY'
    },
    {
      id: 't-3',
      title: 'Outreach: Send 10 cold messages',
      status: TaskStatus.TODO,
      category: Category.AGENCY,
      createdAt: Date.now(),
      impact: 'HIGH',
      deadline: generateFutureDate(1),
      slot: { day: 'FRI', hour: '18:00' },
      pillar: 'KNOWLEDGE'
    }
  ],
  clients: [
    // --- NEMO AGENCY: TEAM ---
    {
      id: 'c-team-1',
      name: 'Ahmed S.',
      role: 'Backend Dev',
      context: 'NEMO',
      type: 'TEAM',
      status: 'ACTIVE',
      tags: ['Node.js', 'Firebase', 'Core'],
      rate: 15,
      rateType: 'HOURLY',
      currency: 'USD',
      lastInteraction: Date.now(),
      nextAction: 'Review API Endpoints',
      contactHandle: '@ahmed_core',
      profileUrl: 'https://linkedin.com/in/ahmed',
      focusArea: 'APIs'
    },
    {
      id: 'c-team-2',
      name: 'Sarah M.',
      role: 'UI Designer',
      context: 'NEMO',
      type: 'TEAM',
      status: 'ACTIVE',
      tags: ['Figma', 'UI/UX', 'Freelance'],
      rate: 400,
      rateType: 'MONTHLY',
      currency: 'USD',
      lastInteraction: Date.now() - 86400000,
      nextAction: 'Brief for Granite Site',
      contactHandle: '@sarah.design',
      profileUrl: 'https://dribbble.com/sarah',
      focusArea: 'UI Systems'
    },
    
    // --- NEMO AGENCY: RECRUITMENT ---
    {
      id: 'c-rec-1',
      name: 'Karim F.',
      role: 'React Native Dev',
      company: 'Freelance',
      context: 'NEMO',
      type: 'CANDIDATE',
      status: 'INTERVIEWING',
      tags: ['Mobile', 'React', 'Senior'],
      rate: 20,
      rateType: 'HOURLY',
      currency: 'USD',
      lastInteraction: Date.now() - 86400000 * 2,
      nextAction: 'Schedule Technical Test',
      profileUrl: 'https://github.com/karimf',
      contactHandle: '@karim.react'
    },

    // --- NEMO AGENCY: CLIENTS ---
    {
      id: 'c-client-1',
      name: 'Eng. Mahmoud',
      role: 'CEO',
      company: 'Red Sea Construction',
      context: 'NEMO',
      type: 'CLIENT',
      status: 'LEAD',
      tags: ['Construction', 'High Value', 'KSA'],
      rate: 1500,
      rateType: 'FIXED',
      currency: 'USD',
      lastInteraction: Date.now() - 86400000 * 3,
      nextAction: 'Send Portfolio',
      stage: 'DISCOVERY',
      needs: 'Full bilingual site revamp + SEO rollout',
      contactHandle: 'mahmoud@redsea.com'
    },
    {
      id: 'c-partner-1',
      name: 'Shift Studio',
      role: 'Brand Partner',
      company: 'Shift Studio',
      context: 'NEMO',
      type: 'PARTNER',
      status: 'ACTIVE',
      tags: ['Design', 'Brand'],
      rate: 0,
      rateType: 'NONE',
      currency: 'USD',
      lastInteraction: Date.now() - 86400000 * 6,
      nextAction: 'Share Nemo case studies',
      focusArea: 'Brand systems',
      contactHandle: 'hello@shiftstudio.com'
    },

    // --- PERSONAL: NETWORK ---
    {
      id: 'c-pers-1',
      name: 'Dr. Tarek',
      role: 'Mentor',
      company: 'University',
      context: 'PERSONAL',
      type: 'NETWORK',
      status: 'WARM',
      circle: 'MENTOR',
      tags: ['Academia', 'Mentor', 'Career Advice'],
      rate: 0,
      rateType: 'NONE',
      currency: 'USD',
      lastInteraction: Date.now() - 86400000 * 10,
      nextAction: 'Coffee Catchup'
    }
  ],
  transactions: [
    {
      id: 'tx-1',
      amount: 250,
      date: Date.now() - 86400000 * 5,
      description: 'Marble Site Maintenance',
      type: 'INCOME',
      category: Category.FREELANCE,
      relatedEntityId: 'c-client-1'
    }
  ],
  notes: [
      {
          id: 'n-1',
          title: 'Agency Strategy Q4',
          content: 'Focus on Construction niche.\n\n- Build 3 case studies\n- Fix LinkedIn Profile\n- Outreach 5/day',
          updatedAt: Date.now(),
          tags: ['Strategy', 'Agency']
      }
  ],
  resources: [
      {
          id: 'r-1',
          title: 'Firebase Console',
          url: 'https://console.firebase.google.com',
          category: 'DEV',
          description: 'Database Management'
      }
  ],
  marketing: [
      {
          id: 'm-1',
          content: 'The biggest mistake Zoho consultants make is focusing on features, not workflows. Here is why...',
          identity: 'CAREER',
          platform: 'LINKEDIN',
          isPosted: false,
          createdAt: Date.now()
      },
      {
          id: 'm-2',
          content: 'Just launched a new Marble/Granite SEO case study. Ranked #1 in Cairo in 3 weeks. #SEO #WebDev',
          identity: 'AGENCY',
          platform: 'LINKEDIN',
          isPosted: false,
          createdAt: Date.now() - 86400000
      }
  ],
  metrics: {
    revenue: 200,
    target: 1000,
    streak: 2,
    lastSync: new Date().toISOString(),
    outreachCount: 3
  },
  prayerLog: {},
  chatHistory: [
    {
      role: 'model',
      text: "Salam Noeman. Protocol Active. Database connection standing by.",
      timestamp: Date.now()
    }
  ]
};

// --- DATA LAYER ---

// 1. LOAD
export const loadState = async (): Promise<AppState> => {
  // A. Try Firebase First
  if (db) {
      try {
          const docRef = doc(db, "users", USER_ID);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
              console.log("☁️ Loaded from Cloud");
              const data = docSnap.data();
              // Merge with initial state to ensure new fields (like marketing) exist if DB is old
              return { 
                ...INITIAL_STATE, 
                ...data, 
                marketing: data.marketing || INITIAL_STATE.marketing,
                accounts: data.accounts || INITIAL_STATE.accounts,
                activities: data.activities || INITIAL_STATE.activities
              } as AppState;
          } else {
              console.log("☁️ New Cloud User - Creating Initial Data");
              await setDoc(docRef, INITIAL_STATE);
              return INITIAL_STATE;
          }
      } catch (e) {
          console.error("Cloud load error, falling back to local:", e);
      }
  }

  // B. Fallback to LocalStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log("💾 Loaded from Local");
    if (stored) {
        const parsed = JSON.parse(stored);
        return { 
          ...INITIAL_STATE, 
          ...parsed,
          accounts: parsed.accounts || INITIAL_STATE.accounts,
          activities: parsed.activities || INITIAL_STATE.activities
        } as AppState;
    }
    return INITIAL_STATE;
  } catch (e) {
    return INITIAL_STATE;
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
          await setDoc(doc(db, "users", USER_ID), state);
          // console.log("☁️ Synced to Cloud");
      } catch (e) {
          console.error("Cloud sync failed", e);
      }
  }
};
