'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, LogIn, LogOut, Trophy, Calendar, Activity, Award } from 'lucide-react';
import { ESPNEvent } from '@/types/espn';
import { formatEventDates } from '@/lib/espn';

interface HeaderProps {
  eventName?: string;
  eventObj?: ESPNEvent;
  loading?: boolean;
}

export function Header({ eventName, eventObj, loading: eventLoading }: HeaderProps) {
  const { user, loading, isAdmin, signInWithGoogle, signOut } = useAuth();

  const formattedDates = formatEventDates(eventObj?.date, eventObj?.endDate);
  const eventState = eventObj?.status?.type?.state;
  const statusDetail = eventObj?.status?.type?.detail || 'Scheduled';
  const isEventUnpopulated = !eventName && !eventObj;
  const isLoadingEvent = eventLoading || isEventUnpopulated;

  return (
    <header className="w-full border-b border-outline-variant bg-surface-container-lowest/90 text-on-surface backdrop-blur-md shadow-xs px-4 lg:px-8 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Branding & Event Badge */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center shadow-xs shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-on-surface">
                Texas-Florida Golf Majors Showdown
              </h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/30">
                  <ShieldCheck className="w-3 h-3" /> Admin Mode
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-0.5 min-h-[22px]">
              {isLoadingEvent ? (
                <div className="flex items-center gap-2" data-testid="header-event-skeleton">
                  <div className="h-4 w-32 bg-surface-container-high animate-pulse rounded" />
                  <div className="h-4 w-24 bg-surface-container-high animate-pulse rounded hidden sm:block" />
                  <div className="h-5 w-20 bg-surface-container-high animate-pulse rounded-md" />
                </div>
              ) : (
                <>
                  {eventName && (
                    <p className="text-xs font-semibold truncate max-w-xs sm:max-w-md text-on-surface-variant">
                      <span>{eventName}</span>
                    </p>
                  )}

                  {formattedDates && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant">
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
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant">
                      Scheduled
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* User Auth & Navigation Section */}
        <div className="flex items-center gap-3">
          <a
            href="/greedy"
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition"
          >
            <Award className="w-3.5 h-3.5" /> Greedy Bet
          </a>

          {loading ? (
            <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded-lg" />
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
                <div className="text-xs text-on-surface">
                  <p className="font-semibold">{user.displayName || 'Golfer Fan'}</p>
                  <p className="text-on-surface-variant text-[10px] truncate max-w-30">{user.email}</p>
                </div>
              </div>

              {isAdmin && (
                <a
                  href="/admin"
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-tertiary/10 hover:bg-tertiary/20 text-tertiary border border-tertiary/30 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin Panel
                </a>
              )}

              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container border border-outline-variant transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <a
              href="/admin"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant border border-outline-variant transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-tertiary" /> Admin
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
