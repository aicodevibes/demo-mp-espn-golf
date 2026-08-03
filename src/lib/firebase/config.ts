import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAM4O6F1-mmRxp8GCMfQP4qFle9vq4ZCEE',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'fir-demo-mp.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'fir-demo-mp',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'fir-demo-mp.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '508985905426',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:508985905426:web:a0f53f3f2a8c00dc3163cb',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Connect to custom named Firestore database ID 'fir-demo-mp' (or process.env setting)
const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || 'fir-demo-mp';
export const db = getFirestore(app, databaseId);
export const googleProvider = new GoogleAuthProvider();
