'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import {
  resolveActiveEvent,
  resolveEventCompetitorsWithFallback,
  readScoreboardCache,
  writeScoreboardCache,
  writeCachedActiveEventId,
  EspnTournamentAdapter,
  NormalizedTournament,
  DEFAULT_PLAYER_DIRECTORY_MAP,
} from '@/lib/espn';
import { syncPlayersToFirestore } from '@/lib/firebase/firestore';

export interface TournamentContextState {
  /** Selected event ID currently being viewed (accounts for viewer override). */
  selectedEventId: string;
  /** Effective active event ID. */
  activeEventId: string;
  /** Whether the user is viewing a historical tournament archive rather than the live event. */
  isHistoricalView: boolean;
  /** Method to set or clear historical viewer event override. */
  setEventOverride: (eventId: string) => void;
  /** All PGA scoreboard events. */
  events: ESPNEvent[];
  /** Resolved active/selected ESPN event object. */
  activeEvent: ESPNEvent | null;
  /** Raw competitors list for the selected event. */
  competitors: ESPNCompetitor[];
  /** Unified normalized tournament snapshot with indexed competitor maps. */
  tournament: NormalizedTournament;
  /** Loading status for tournament data. */
  loading: boolean;
  /** Raw trigger to fetch leaderboard data for the active tournament. */
  fetchLeaderboard: (isForce?: boolean) => Promise<boolean>;
  /** Error encountered during tournament fetching. */
  error: Error | null;
  /** Whether last response was served from stale cache. */
  isStaleData: boolean;
  /** Timestamp of last successful refresh. */
  lastRefreshedAt: Date | null;
  /** Set the active event ID from global app config. */
  setActiveConfigId: (id: string) => void;
}

const DEFAULT_TOURNAMENT: NormalizedTournament = {
  id: '',
  name: '',
  datesFormatted: '',
  statusState: 'pre',
  statusDetail: '',
  period: 1,
  isCompleted: false,
  isPlayoff: false,
  rawEvent: null,
  competitors: [],
  competitorMap: new Map(),
  events: [],
};

const TournamentContext = createContext<TournamentContextState>({
  selectedEventId: '',
  activeEventId: '',
  isHistoricalView: false,
  setEventOverride: () => {},
  events: [],
  activeEvent: null,
  competitors: [],
  tournament: DEFAULT_TOURNAMENT,
  loading: true,
  fetchLeaderboard: async () => false,
  error: null,
  isStaleData: false,
  lastRefreshedAt: null,
  setActiveConfigId: () => {},
});

export interface TournamentProviderProps {
  children: ReactNode;
  initialEventId?: string;
  firestorePlayerMap?: Record<string, { id: string; name: string; headshotUrl?: string }>;
}

export function TournamentProvider({
  children,
  initialEventId = '',
  firestorePlayerMap = DEFAULT_PLAYER_DIRECTORY_MAP,
}: TournamentProviderProps) {
  const [activeConfigId, setActiveConfigId] = useState<string>(initialEventId || '');
  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [activeEventObj, setActiveEventObj] = useState<ESPNEvent | null>(null);
  const [competitors, setCompetitors] = useState<ESPNCompetitor[]>([]);
  const [viewerEventIdOverride, setViewerEventIdOverride] = useState<string>('');

  const [isStaleData, setIsStaleData] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Safe client-side hydration from local cache
  useEffect(() => {
    const cached = readScoreboardCache();
    if (cached) {
      if (cached.events && cached.events.length > 0) {
        setEvents((prev) => (prev.length === 0 ? cached.events : prev));
      }
      if (cached.lastActiveEventId && !initialEventId) {
        setActiveConfigId((prev) => (!prev ? cached.lastActiveEventId! : prev));
      }
    }
  }, [initialEventId]);

  // Fetch ESPN Scoreboard (Events List)
  useEffect(() => {
    async function fetchScoreboard() {
      try {
        const res = await fetch('/api/espn/scoreboard');
        if (res.ok) {
          const data = await res.json();
          const fetchedEvents: ESPNEvent[] = data.events || [];
          setEvents(fetchedEvents);
          writeScoreboardCache(fetchedEvents);
        }
      } catch (err) {
        console.error('Failed to fetch ESPN Scoreboard:', err);
      }
    }
    fetchScoreboard();
  }, []);

  // Resolve Effective Event ID & Historical View Status
  const defaultEventId = useMemo(() => {
    const live = events.find(
      (e) =>
        e.status?.type?.state === 'in' ||
        e.status?.type?.description?.toLowerCase().includes('in progress') ||
        e.status?.type?.detail?.toLowerCase().includes('in progress')
    );
    return live?.id || events[0]?.id || '';
  }, [events]);

  const effectiveActiveEventId = activeConfigId || defaultEventId;
  const selectedViewerEventId = viewerEventIdOverride || effectiveActiveEventId;
  const isHistoricalView = Boolean(
    viewerEventIdOverride && viewerEventIdOverride !== effectiveActiveEventId
  );

  useEffect(() => {
    if (effectiveActiveEventId) {
      writeCachedActiveEventId(effectiveActiveEventId);
    }
  }, [effectiveActiveEventId]);

  const activeEvent = useMemo(() => {
    return resolveActiveEvent(events, activeEventObj, selectedViewerEventId);
  }, [events, activeEventObj, selectedViewerEventId]);

  const fetchLeaderboard = useCallback(
    async (isForce: boolean = false): Promise<boolean> => {
      if (!selectedViewerEventId) return false;

      try {
        const url = isForce
          ? `/api/espn/leaderboard?event=${selectedViewerEventId}&force=true`
          : `/api/espn/leaderboard?event=${selectedViewerEventId}`;
        const res = await fetch(url);
        if (!res.ok) {
          let errorMessage = `ESPN Leaderboard API returned status ${res.status}`;
          try {
            const errorData = await res.json();
            if (errorData && (errorData.error || errorData.message)) {
              errorMessage = errorData.error || errorData.message;
            }
          } catch {
            // Fall back to status string
          }
          setError(new Error(errorMessage));
          return false;
        }

        const isStale = Boolean(res.headers?.get && res.headers.get('X-Cache-Stale') === 'true');
        setIsStaleData(isStale);

        const data = await res.json();
        if (data.events && data.events[0]) {
          setActiveEventObj(data.events[0]);
          const comps = data.events[0]?.competitions?.[0]?.competitors || [];
          const resolvedComps = resolveEventCompetitorsWithFallback(comps, []);
          setCompetitors(resolvedComps);
          syncPlayersToFirestore(resolvedComps);
          setError(null);
          setLastRefreshedAt(new Date());
          return true;
        }
        return false;
      } catch (err: unknown) {
        console.error('Failed to fetch ESPN Leaderboard:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedViewerEventId]
  );

  // Initial leaderboard fetch whenever selected event changes
  useEffect(() => {
    setCompetitors([]);
    setActiveEventObj(null);
    setLoading(true);
    fetchLeaderboard();
  }, [selectedViewerEventId, fetchLeaderboard]);

  const tournament = useMemo(() => {
    return EspnTournamentAdapter.normalizeTournamentSnapshot(
      { events },
      activeEventObj,
      { activeEventId: selectedViewerEventId, playerDirectoryMap: firestorePlayerMap }
    );
  }, [events, activeEventObj, selectedViewerEventId, firestorePlayerMap]);

  const value: TournamentContextState = useMemo(
    () => ({
      selectedEventId: selectedViewerEventId,
      activeEventId: effectiveActiveEventId,
      isHistoricalView,
      setEventOverride: setViewerEventIdOverride,
      events,
      activeEvent,
      competitors,
      tournament,
      loading,
      fetchLeaderboard,
      error,
      isStaleData,
      lastRefreshedAt,
      setActiveConfigId,
    }),
    [
      selectedViewerEventId,
      effectiveActiveEventId,
      isHistoricalView,
      setViewerEventIdOverride,
      events,
      activeEvent,
      competitors,
      tournament,
      loading,
      fetchLeaderboard,
      error,
      isStaleData,
      lastRefreshedAt,
    ]
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament(): TournamentContextState {
  return useContext(TournamentContext);
}
