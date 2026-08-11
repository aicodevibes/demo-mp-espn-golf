'use client';

import React, { useState, useMemo } from 'react';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import {
  generateTournamentActivityEvents,
  ActivityEvent,
  ActivityEventType,
} from '@/lib/activityFeed';
import {
  Radio,
  DollarSign,
  Flame,
  Scissors,
  Trophy,
  Activity,
  Filter,
} from 'lucide-react';

export interface LiveActivityFeedProps {
  participants?: Participant[];
  competitors?: ESPNCompetitor[];
  contestConfig?: ContestConfig | null;
  eventStatus?: any;
  events?: ActivityEvent[];
  loading?: boolean;
  className?: string;
}

type FilterType = 'all' | ActivityEventType;

interface FilterOption {
  id: FilterType;
  label: string;
  icon: React.ReactNode;
}

export function LiveActivityFeed({
  participants = [],
  competitors = [],
  contestConfig,
  eventStatus,
  events: customEvents,
  loading = false,
  className = '',
}: LiveActivityFeedProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Generate events from tournament state if custom events not provided
  const allEvents = useMemo(() => {
    if (customEvents && Array.isArray(customEvents)) {
      return customEvents;
    }
    return generateTournamentActivityEvents(
      participants,
      competitors,
      contestConfig,
      eventStatus
    );
  }, [customEvents, participants, competitors, contestConfig, eventStatus]);

  // Filter events based on active selection
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return allEvents;
    return allEvents.filter((evt) => evt.type === activeFilter);
  }, [allEvents, activeFilter]);

  const filterOptions: FilterOption[] = [
    { id: 'all', label: 'All', icon: <Filter className="w-3.5 h-3.5" /> },
    { id: 'day_money', label: 'Day Money', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'birdie_streak', label: 'Eagles & Hot Rounds', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'cut', label: 'Cuts & WDs', icon: <Scissors className="w-3.5 h-3.5" /> },
    { id: 'top_10', label: 'Top 10', icon: <Trophy className="w-3.5 h-3.5" /> },
  ];

  // Helper to render icon for event cards
  const renderEventIcon = (type: ActivityEventType, iconName: string) => {
    switch (type) {
      case 'day_money':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'birdie_streak':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'cut':
        return <Scissors className="w-4 h-4 text-rose-400" />;
      case 'top_10':
        return <Trophy className="w-4 h-4 text-amber-300" />;
      default:
        return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  // Helper to get badge and border styles per event type
  const getEventTypeStyles = (type: ActivityEventType) => {
    switch (type) {
      case 'day_money':
        return {
          iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          borderHover: 'hover:border-emerald-500/40',
        };
      case 'birdie_streak':
        return {
          iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          borderHover: 'hover:border-amber-500/40',
        };
      case 'cut':
        return {
          iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
          badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          borderHover: 'hover:border-rose-500/40',
        };
      case 'top_10':
        return {
          iconBg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
          badgeBg: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
          borderHover: 'hover:border-yellow-500/40',
        };
      default:
        return {
          iconBg: 'bg-primary/10 border-primary/20 text-primary',
          badgeBg: 'bg-primary/15 text-primary border-primary/30',
          borderHover: 'hover:border-primary/40',
        };
    }
  };

  if (loading) {
    return (
      <div className={`p-card rounded-xl bg-surface-container-low border border-outline-variant space-y-4 shadow-xs animate-pulse ${className}`}>
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high" />
            <div className="h-5 w-40 bg-surface-container-high rounded" />
          </div>
          <div className="h-6 w-24 bg-surface-container-high rounded-full" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 w-20 bg-surface-container-high rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-surface-container-lowest rounded-xl border border-outline-variant/60"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-surface-container-low border border-outline-variant p-card space-y-4 shadow-xs ${className}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3 flex-wrap gap-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
          Live Activity Feed
        </h3>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.id;
          const count =
            opt.id === 'all'
              ? allEvents.length
              : allEvents.filter((e) => e.type === opt.id).length;

          return (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs ring-1 ring-primary/30'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface border border-outline-variant/50'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-on-primary/20 text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Event Items List */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/60 space-y-2">
          <Radio className="w-8 h-8 text-on-surface-variant/40 mx-auto" />
          <h4 className="text-sm font-semibold text-on-surface">No Activity Events</h4>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            {activeFilter === 'all'
              ? 'No live events recorded yet for this tournament state. Check back as round play progresses.'
              : `No ${activeFilter.replace('_', ' ')} events found in the current tournament data.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {filteredEvents.slice(0, 10).map((evt) => {
            const styles = getEventTypeStyles(evt.type);
            return (
              <div
                key={evt.id}
                className={`group flex items-start justify-between gap-3 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/60 transition-all duration-150 ${styles.borderHover} hover:shadow-xs`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${styles.iconBg}`}
                  >
                    {renderEventIcon(evt.type, evt.icon)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-on-surface leading-snug truncate">
                      {evt.title}
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                      {evt.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded border ${styles.badgeBg}`}
                >
                  {evt.timestamp}
                </span>
              </div>
            );
          })}
          {filteredEvents.length > 10 && (
            <p className="text-center text-[10px] font-bold text-on-surface-variant/60 pt-2 border-t border-outline-variant/40">
              Only showing latest 10 events (total {filteredEvents.length})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
