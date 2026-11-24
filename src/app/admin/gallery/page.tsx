'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldAlert, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_PLAYER_DIRECTORY_MAP } from '@/lib/espn';
import { GolferHeadshot } from '@/components/GolferHeadshot';
import { useAllPlayers } from '@/lib/firebase/firestore';

export default function AdminPlayerGalleryPage() {
  const { user, loading: authLoading, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { playerMap } = useAllPlayers();

  if (authLoading) {
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
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Sign in with your authorized admin Google account to manage tournament configurations, participant rosters, and player directory assets.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => signInWithGoogle()}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-bold text-sm shadow-md transition cursor-pointer"
            >
              <LogIn className="w-5 h-5 text-white" /> Sign In with Google
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
              onClick={() => signOut()}
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

  const allPlayerEntries = Object.values(DEFAULT_PLAYER_DIRECTORY_MAP);

  return (
    <div className="min-h-screen bg-surface text-on-surface p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-bold text-tertiary hover:underline bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin Panel
          </Link>
          <h1 className="text-xl font-black uppercase tracking-wider text-on-surface">
            PGA Golfer Directory & Headshots Reference Gallery
          </h1>
        </div>
        <span className="text-xs font-bold bg-surface-container-high text-tertiary px-3 py-1 rounded-full border border-tertiary/30">
          {allPlayerEntries.length} PGA Golfers Cataloged
        </span>
      </div>

      <p className="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
        This reference gallery displays all cataloged PGA Tour players in the application database alongside their exact ESPN athlete IDs, names, and live headshots.
      </p>

      {/* Grid of Golfers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allPlayerEntries.map((p) => {
          const stored = playerMap[p.id];
          const displayName = stored?.name || p.name;
          const headshotUrl = stored?.headshotUrl || p.headshotUrl;

          return (
            <div
              key={p.id}
              className="bg-surface-container-low border border-outline-variant/60 hover:border-tertiary/60 p-4 rounded-xl flex items-center gap-3 transition shadow-xs"
            >
              <GolferHeadshot
                name={displayName}
                src={headshotUrl}
                playerId={p.id}
                size={56}
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-on-surface truncate" title={displayName}>
                  {displayName}
                </div>
                <div className="text-[11px] font-mono text-on-surface-variant">
                  ID: <code className="bg-surface-container-high px-1 rounded">{p.id}</code>
                </div>
                <div className="text-[10px] text-tertiary font-medium mt-0.5">
                  Verified PGA Player
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
