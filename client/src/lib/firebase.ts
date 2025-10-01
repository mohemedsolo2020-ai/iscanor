import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

// Check if Firebase config is valid
const hasValidFirebaseConfig = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  
  return apiKey && projectId && appId && 
         apiKey !== 'undefined' && projectId !== 'undefined' && appId !== 'undefined';
};

let app: any = null;
export let auth: any = null;

// Only initialize Firebase if config is valid
if (hasValidFirebaseConfig()) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    auth = null;
  }
} else {
  console.warn('Firebase configuration is incomplete or invalid. Running without authentication.');
}

const provider = new GoogleAuthProvider();

// Authentication functions - with null checks
export function signInWithGoogle() {
  if (!auth) {
    console.warn('Firebase auth not initialized');
    return Promise.reject(new Error('Firebase not configured'));
  }
  return signInWithRedirect(auth, provider);
}

export function signInWithEmail(email: string, password: string) {
  if (!auth) {
    console.warn('Firebase auth not initialized');
    return Promise.reject(new Error('Firebase not configured'));
  }
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(email: string, password: string) {
  if (!auth) {
    console.warn('Firebase auth not initialized');
    return Promise.reject(new Error('Firebase not configured'));
  }
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
  if (!auth) {
    console.warn('Firebase auth not initialized');
    return Promise.resolve();
  }
  return signOut(auth);
}

// Auth state listener
export function onAuthStateChangedListener(callback: (user: User | null) => void) {
  if (!auth) {
    // If Firebase is not initialized, immediately call callback with null
    setTimeout(() => callback(null), 0);
    return () => {}; // Return empty unsubscribe function
  }
  return onAuthStateChanged(auth, callback);
}

// Get current user token
export async function getCurrentUserToken(): Promise<string | null> {
  if (!auth || !auth.currentUser) return null;
  
  try {
    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
}