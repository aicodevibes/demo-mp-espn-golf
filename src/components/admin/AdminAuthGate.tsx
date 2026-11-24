'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldAlert, LogIn, LogOut } from 'lucide-react';

export interface AdminAuthGateProps {
  loading: boolean;
  user: { email?: string | null } | null;
  isAdmin: boolean;
  onSignIn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  signInDescription?: string;
  showDevQuickLogin?: boolean;
  children?: React.ReactNode;
}

const DEFAULT_SIGN_IN_DESCRIPTION =
  'Sign in with your authorized admin Google account to manage tournament configurations, participant rosters, and payout settings.';

export function AdminAuthGate({
  loading,
  user,
  isAdmin,
  onSignIn,
  onSignOut,
  signInDescription = DEFAULT_SIGN_IN_DESCRIPTION,
  showDevQuickLogin = false,
  children,
}: AdminAuthGateProps) {
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div
          role="status"
          aria-label="Loading authentication"
          className="w-10 h-10 border-4 border-outline-variant border-t-tertiary rounded-full animate-spin"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center border border-tertiary/30">
            <ShieldCheck className="w-8 h-8 text-tertiary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Admin Access Portal</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">{signInDescription}</p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => onSignIn()}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-bold text-sm shadow-md transition cursor-pointer"
            >
              <LogIn className="w-5 h-5 text-white" /> Sign In with Google
            </button>

            {showDevQuickLogin && process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => onSignIn()}
                className="w-full text-xs font-semibold py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant border border-outline-variant transition cursor-pointer"
              >
                ⚡ Dev Quick Login (aicodevibes@gmail.com)
              </button>
            )}
          </div>

          <div className="border-t border-outline-variant/60 pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Tournament Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center border border-error/30">
            <ShieldAlert className="w-8 h-8 text-error" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Access Denied</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Signed in as <span className="font-semibold text-on-surface">{user.email}</span>. This Google account does not have admin privileges.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => onSignOut()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-sm border border-outline-variant transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-on-surface" /> Sign Out & Switch Account
            </button>
          </div>

          <div className="border-t border-outline-variant/60 pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Tournament Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
