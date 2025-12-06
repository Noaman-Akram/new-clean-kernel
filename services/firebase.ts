
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 1. Replace these with your keys from the Firebase Console -> Project Settings
// 2. Or create a .env file with VITE_FIREBASE_API_KEY, etc.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// We wrap this in a try-catch so the app doesn't crash if keys are missing
let db: any = null;

try {
    if (firebaseConfig.apiKey) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("🔥 Firebase initialized");
    } else {
        console.log("⚠️ No Firebase keys found. Running in Offline Mode.");
    }
} catch (e) {
    console.error("Firebase init failed:", e);
}

export { db };
