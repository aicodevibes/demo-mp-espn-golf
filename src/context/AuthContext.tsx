'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Failed to sign in with Google:', error);
      // Local dev fallback: strictly opt-in via NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH=true in development.
      if (
        process.env.NODE_ENV === 'development' &&
        process.env.NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH === 'true'
      ) {
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
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, []);

  const isAdmin = Boolean(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  const value = useMemo(
    () => ({ user, loading, isAdmin, signInWithGoogle, signOut }),
    [user, loading, isAdmin, signInWithGoogle, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
