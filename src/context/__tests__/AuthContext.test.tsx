// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/firebase/config', () => ({
  auth: {},
  googleProvider: {},
}));

describe('AuthContext dev mock fallback & memoization', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnableMock = process.env.NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(onAuthStateChanged).mockImplementation(((_auth: unknown, callback: (u: null) => void) => {
      callback(null);
      return vi.fn();
    }) as never);
    vi.mocked(signInWithPopup).mockRejectedValue(new Error('Popup blocked'));
    vi.mocked(firebaseSignOut).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalNodeEnv ?? 'test');
    if (originalEnableMock === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH = originalEnableMock;
    }
    vi.restoreAllMocks();
  });

  it('does NOT fall back to mock admin on signIn failure in development by default', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    delete process.env.NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('allows mock admin fallback in development only when NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH=true', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH', 'true');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.user?.email).toBe('aicodevibes@gmail.com');
    expect(result.current.isAdmin).toBe(true);
  });

  it('does NOT allow mock admin fallback outside development even if NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH=true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_MOCK_AUTH', 'true');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('memoizes the AuthContext value across parent re-renders when state is unchanged', () => {
    const observedValues: ReturnType<typeof useAuth>[] = [];
    function Consumer() {
      const val = useAuth();
      observedValues.push(val);
      return null;
    }

    const { rerender } = renderHook(() => null, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>
          <Consumer />
          {children}
        </AuthProvider>
      ),
    });

    rerender();

    expect(observedValues.length).toBeGreaterThanOrEqual(2);
    expect(observedValues[observedValues.length - 1]).toBe(observedValues[observedValues.length - 2]);
  });

  it('requires emailVerified to be true for allowlisted email to receive isAdmin === true', () => {
    vi.mocked(onAuthStateChanged).mockImplementation(((_auth: unknown, callback: (u: unknown) => void) => {
      callback({
        uid: 'unverified-uid',
        email: 'aicodevibes@gmail.com',
        emailVerified: false,
      });
      return vi.fn();
    }) as never);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user?.email).toBe('aicodevibes@gmail.com');
    expect(result.current.isAdmin).toBe(false);
  });
});
