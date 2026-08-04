'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, LogIn, LogOut, Trophy, Calendar, Activity } from 'lucide-react';
import { ESPNEvent } from '@/types/espn';
import { formatEventDates } from '@/lib/espn';

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
    <header className="w-full border-b border-outline-variant bg-primary text-on-primary shadow-xs px-4 lg:px-8 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Branding & Event Badge */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center shadow-md shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-on-primary">
                Apex Links Golf Pulse
              </h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container border border-primary-container">
                  <ShieldCheck className="w-3 h-3 text-tertiary" /> Admin Mode
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {eventName && (
                <p className="text-xs font-semibold truncate max-w-xs sm:max-w-md text-primary-container">
                  <span>{eventName}</span>
                </p>
              )}

              {formattedDates && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded border border-outline-variant/40">
                  <Calendar className="w-3 h-3 text-secondary" /> {formattedDates}
                </span>
              )}

              {/* Status Badge */}
              {eventState === 'in' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-on-tertiary bg-tertiary px-2 py-0.5 rounded shadow-xs animate-pulse">
                  <Activity className="w-3 h-3 text-white" /> Live ({statusDetail})
                </span>
              ) : eventState === 'post' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-on-primary-container bg-primary-container px-2 py-0.5 rounded border border-primary-container">
                  <Trophy className="w-3 h-3 text-tertiary" /> Final
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded border border-outline-variant/40">
                  Scheduled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Auth Section */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 bg-secondary/30 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-right">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-outline-variant"
                  />
                )}
                <div className="text-xs text-on-primary">
                  <p className="font-semibold">{user.displayName || 'Golfer Fan'}</p>
                  <p className="text-primary-container text-[10px] truncate max-w-30">{user.email}</p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/90 text-on-secondary border border-outline-variant transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-tertiary hover:bg-tertiary/90 text-on-tertiary shadow-md transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" /> Google Sign-In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
