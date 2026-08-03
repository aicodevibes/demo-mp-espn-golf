'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'aicodevibes@gmail.com';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Failed to sign in with Google:', error);
      // Local dev fallback: if Firebase popup fails due to unconfigured Firebase Console API keys,
      // log in as local dev admin so all admin controls can be tested immediately!
      if (process.env.NODE_ENV === 'development') {
        console.warn('Firebase Auth popup failed or unconfigured. Falling back to Local Dev Admin session for aicodevibes@gmail.com');
        setUser({
          uid: 'dev-admin-uid',
          email: ADMIN_EMAIL,
          displayName: 'AI Code Vibes (Dev Admin)',
          photoURL: 'https://lh3.googleusercontent.com/a/default-user',
          emailVerified: true,
        } as User);
      }
    }
  };


  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const isAdmin = Boolean(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
