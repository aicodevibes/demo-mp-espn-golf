'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, LogIn, LogOut, Trophy, Calendar, Activity } from 'lucide-react';
import { ESPNEvent } from '@/types/espn';
import { formatEventDates } from '@/lib/espn/eventHelpers';

interface HeaderProps {
  eventName?: string;
  eventObj?: ESPNEvent;
}

export function Header({ eventName, eventObj }: HeaderProps) {
  const { user, loading, isAdmin, signInWithGoogle, signOut } = useAuth();

  const formattedDates = formatEventDates(eventObj?.date, eventObj?.endDate);
  const eventState = eventObj?.status?.type?.state;
  const statusDetail = eventObj?.status?.type?.detail || 'Scheduled';

  return (
    <header className="w-full border-b border-emerald-900/40 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Branding & Event Badge */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-100">
                PGA Performance Pulse
              </h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> Admin Mode
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {eventName && (
                <p className="text-xs text-emerald-400 font-semibold truncate max-w-xs sm:max-w-md">
                  <span className="text-slate-200">{eventName}</span>
                </p>
              )}

              {formattedDates && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  <Calendar className="w-3 h-3 text-slate-400" /> {formattedDates}
                </span>
              )}

              {/* Status Badge */}
              {eventState === 'in' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                  <Activity className="w-3 h-3 text-emerald-400" /> Live ({statusDetail})
                </span>
              ) : eventState === 'post' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  <Trophy className="w-3 h-3 text-amber-400" /> Final
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Scheduled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Auth Section */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-right">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-700"
                  />
                )}
                <div className="text-xs">
                  <p className="font-semibold text-slate-200">{user.displayName || 'Golfer Fan'}</p>
                  <p className="text-slate-400 text-[10px] truncate max-w-30">{user.email}</p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition"
            >
              <LogIn className="w-3.5 h-3.5" /> Google Sign-In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
