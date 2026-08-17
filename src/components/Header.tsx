'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, LogOut, Trophy, Calendar, Activity, Award, RotateCw } from 'lucide-react';
import { ESPNEvent } from '@/types/espn';
import { NormalizedTournament, formatEventDates } from '@/lib/espn';

export function formatRelativeTime(date: Date | null, now: Date = new Date()): string {
  if (!date) return '';
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 0 || diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatTimestamp(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export interface HeaderProps {
  eventName?: string;
  eventObj?: NormalizedTournament | ESPNEvent | null;
  loading?: boolean;
  isRefreshing?: boolean;
  isStaleData?: boolean;
  lastRefreshedAt?: Date | null;
  onRefresh?: (options?: { force?: boolean }) => void | Promise<void>;
}

export function Header({
  eventName,
  eventObj,
  loading: eventLoading,
  isRefreshing = false,
  isStaleData = false,
  lastRefreshedAt = null,
  onRefresh,
}: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      if (lastRefreshedAt) {
        setRelativeTime(formatRelativeTime(lastRefreshedAt));
      } else {
        setRelativeTime('');
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  const { user, loading, isAdmin, signOut } = useAuth();

  const isNorm = Boolean(eventObj && 'datesFormatted' in eventObj);
  const normEvent = isNorm ? (eventObj as NormalizedTournament) : null;
  const rawEvent = !isNorm ? (eventObj as ESPNEvent | null | undefined) : null;

  const formattedDates = normEvent?.datesFormatted || formatEventDates(rawEvent?.date, rawEvent?.endDate);
  const eventState = normEvent?.statusState || rawEvent?.status?.type?.state;
  const statusDetail = normEvent?.statusDetail || rawEvent?.status?.type?.detail || 'Scheduled';
  const isEventUnpopulated = !eventName && !eventObj;
  const isLoadingEvent = !mounted || eventLoading || isEventUnpopulated;
  const displayName = eventName || eventObj?.name;
  const timeFormatted = formatTimestamp(lastRefreshedAt);

  return (
    <header className="w-full border-b border-outline-variant bg-surface-container-lowest/90 text-on-surface backdrop-blur-md shadow-xs px-4 lg:px-8 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Branding & Event Badge */}
        <div className="flex items-center gap-3">
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
                  {displayName && (
                    <p
                      className="text-xs font-semibold truncate max-w-xs sm:max-w-md text-on-surface-variant"
                      data-testid="header-event-name"
                    >
                      <span>{displayName}</span>
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

                  {/* Live Refresh Widget */}
                  {onRefresh && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant">
                      <button
                        type="button"
                        onClick={() => onRefresh({ force: true })}
                        disabled={isRefreshing}
                        aria-label="Refresh leaderboard data"
                        title="Refresh live leaderboard"
                        className="p-0.5 text-on-surface-variant hover:text-on-surface transition rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="header-refresh-button"
                      >
                        <RotateCw
                          className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-tertiary' : ''}`}
                        />
                      </button>
                      {timeFormatted ? (
                        <span className="text-[10px] whitespace-nowrap text-on-surface-variant" data-testid="header-refresh-time">
                          Updated {timeFormatted}
                        </span>
                      ) : relativeTime ? (
                        <span className="text-[10px] whitespace-nowrap text-on-surface-variant" data-testid="header-refresh-time">
                          Updated {relativeTime}
                        </span>
                      ) : (
                        <span className="text-[10px] whitespace-nowrap text-on-surface-variant">Live sync</span>
                      )}
                      {isStaleData && (
                        <span
                          className="text-[9px] font-semibold px-1 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          title="Displaying cached snapshot while upstream data is delayed"
                          data-testid="header-stale-badge"
                        >
                          Cached
                        </span>
                      )}
                    </div>
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
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-tertiary/10 hover:bg-tertiary/20 text-tertiary border border-tertiary/30 transition"
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
