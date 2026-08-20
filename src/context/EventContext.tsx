'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { TournamentProvider, useTournament } from './TournamentContext';
import { ContestProvider, useContest } from './ContestContext';
import { LiveSyncProvider, useLiveSync, LIVE_POLL_INTERVAL_MS, RELAXED_POLL_INTERVAL_MS } from './LiveSyncContext';
import { useFieldEvaluation, useContestEvaluation } from '@/hooks/useDomainEvaluation';
import { AppConfig } from '@/lib/firebase/firestore';
import { Participant, ContestConfig } from '@/types/contest';
import { ContestEvaluationResult } from '@/lib/contestEngine';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import { NormalizedTournament } from '@/lib/espn';
import { FieldLeaderboardEvaluation } from '@/lib/domain';

export { LIVE_POLL_INTERVAL_MS, RELAXED_POLL_INTERVAL_MS };

export interface EventContextState {
  activeEventId: string;
  activeSeason: number;
  activeConfig: AppConfig | null;
  contestConfig: ContestConfig | null;
  participants: Participant[];
  firestorePlayerMap: Record<string, { id: string; name: string; headshotUrl?: string }>;
  selectedEventId: string;
  isHistoricalView: boolean;
  setEventOverride: (eventId: string) => void;
  events: ESPNEvent[];
  activeEvent: ESPNEvent | null;
  competitors: ESPNCompetitor[];
  tournament: NormalizedTournament;
  fieldEvaluation: FieldLeaderboardEvaluation;
  contestEvaluation: ContestEvaluationResult;
  isStaleData: boolean;
  loading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  error: Error | null;
  refreshLeaderboard: (options?: { force?: boolean }) => Promise<void>;
}

const EventContext = createContext<EventContextState | null>(null);

function EventContextBridge({ children }: { children: ReactNode }) {
  const tournamentState = useTournament();
  const contestState = useContest();
  const liveSyncState = useLiveSync();

  const fieldEvaluation = useFieldEvaluation({
    tournament: tournamentState.tournament,
    competitors: tournamentState.competitors,
    participants: contestState.participants,
    eventStatus: tournamentState.activeEvent?.status,
    playerDirectoryMap: contestState.firestorePlayerMap,
  });

  const contestEvaluation = useContestEvaluation({
    participants: contestState.participants,
    competitors: tournamentState.competitors,
    contestConfig: contestState.contestConfig,
    eventStatus: tournamentState.activeEvent?.status,
    playerDirectoryMap: contestState.firestorePlayerMap,
  });

  const contextValue: EventContextState = useMemo(
    () => ({
      activeEventId: tournamentState.activeEventId,
      activeSeason: contestState.activeSeason,
      activeConfig: contestState.activeConfig,
      contestConfig: contestState.contestConfig,
      participants: contestState.participants,
      firestorePlayerMap: contestState.firestorePlayerMap,
      selectedEventId: tournamentState.selectedEventId,
      isHistoricalView: tournamentState.isHistoricalView,
      setEventOverride: tournamentState.setEventOverride,
      events: tournamentState.events,
      activeEvent: tournamentState.activeEvent,
      competitors: tournamentState.competitors,
      tournament: tournamentState.tournament,
      fieldEvaluation,
      contestEvaluation,
      isStaleData: liveSyncState.isStaleData,
      loading: tournamentState.loading,
      isRefreshing: liveSyncState.isRefreshing,
      lastRefreshedAt: liveSyncState.lastRefreshedAt,
      error: liveSyncState.error || tournamentState.error,
      refreshLeaderboard: liveSyncState.refreshLeaderboard,
    }),
    [
      tournamentState,
      contestState,
      liveSyncState,
      fieldEvaluation,
      contestEvaluation,
    ]
  );

  return <EventContext.Provider value={contextValue}>{children}</EventContext.Provider>;
}

interface EventContextProviderInnerProps {
  children: ReactNode;
  initialEventId?: string;
}

function EventContextProviderInner({ children }: { children: ReactNode }) {
  const tournamentState = useTournament();
  const contestState = useContest();

  // Keep tournament active config ID synchronized when contest config loads
  const handleActiveEventIdResolved = useCallback(
    (id: string) => {
      tournamentState.setActiveConfigId(id);
    },
    [tournamentState]
  );

  return (
    <LiveSyncProvider
      activeEventId={tournamentState.selectedEventId}
      isLive={tournamentState.tournament.statusState === 'in'}
      isStaleData={tournamentState.isStaleData}
      lastRefreshedAt={tournamentState.lastRefreshedAt}
      error={tournamentState.error}
      onFetchLeaderboard={tournamentState.fetchLeaderboard}
    >
      <EventContextBridge>{children}</EventContextBridge>
    </LiveSyncProvider>
  );
}

export function EventContextProvider({
  children,
  initialEventId = '',
}: EventContextProviderInnerProps) {
  return (
    <TournamentProvider initialEventId={initialEventId}>
      <EventContextContainer initialEventId={initialEventId}>{children}</EventContextContainer>
    </TournamentProvider>
  );
}

function EventContextContainer({ children }: { children: ReactNode; initialEventId?: string }) {
  const tournament = useTournament();

  return (
    <ContestProvider
      eventId={tournament.selectedEventId}
      onActiveEventIdResolved={tournament.setActiveConfigId}
    >
      <EventContextProviderInner>{children}</EventContextProviderInner>
    </ContestProvider>
  );
}

export function useEventContext(): EventContextState {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error('useEventContext must be used within an EventContextProvider');
  }
  return ctx;
}
