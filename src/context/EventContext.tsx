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
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  AppConfig,
  resolveParticipantsFromSnapshot,
  syncPlayersToFirestore,
} from '@/lib/firebase/firestore';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import {
  resolveActiveEvent,
  resolveEventCompetitorsWithFallback,
  DEFAULT_PLAYER_DIRECTORY_MAP,
  readScoreboardCache,
  writeScoreboardCache,
  writeCachedActiveEventId,
  EspnTournamentAdapter,
  NormalizedTournament,
} from '@/lib/espn';
import { evaluateContest, ContestEvaluationResult } from '@/lib/contestEngine';
import { evaluateFieldLeaderboard, FieldLeaderboardEvaluation } from '@/lib/domain';
import {
  useLeaderboardPolling,
  LIVE_POLL_INTERVAL_MS,
  RELAXED_POLL_INTERVAL_MS,
} from '@/hooks/useLeaderboardPolling';

export { LIVE_POLL_INTERVAL_MS, RELAXED_POLL_INTERVAL_MS };

export interface EventContextState {
  /** The globally active event ID configured in Firestore (/config/app). */
  activeEventId: string;
  /** Active season year. */
  activeSeason: number;
  /** Global app config document. */
  activeConfig: AppConfig | null;
  /** Contest configuration for the selected event (payouts, day money, par). */
  contestConfig: ContestConfig | null;
  /** Contest participants list for the selected event. */
  participants: Participant[];
  /** Full player directory map from Firestore/local defaults. */
  firestorePlayerMap: Record<string, { id: string; name: string; headshotUrl?: string }>;

  /** Selected event ID currently being viewed (accounts for viewer override). */
  selectedEventId: string;
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
  /** Pure field leaderboard evaluation (top 10, active field, cut field, rank display map). */
  fieldEvaluation: FieldLeaderboardEvaluation;
  /** Pure contest evaluation (standings, day money results, greedy standings, wager ledger). */
  contestEvaluation: ContestEvaluationResult;

  /** True when the latest data snapshot was served from a stale-while-error cache. */
  isStaleData: boolean;
  /** True during initial cold-start data fetching. */
  loading: boolean;
  /** True when a background leaderboard refresh is currently underway. */
  isRefreshing: boolean;
  /** Timestamp of the last successful leaderboard refresh. */
  lastRefreshedAt: Date | null;
  /** Error object if any subscription or fetch failed. */
  error: Error | null;
  /** Manual trigger to force re-fetch latest ESPN leaderboard. */
  refreshLeaderboard: (options?: { force?: boolean }) => Promise<void>;
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

const DEFAULT_FIELD_EVALUATION: FieldLeaderboardEvaluation = {
  top10Leaders: [],
  draftedGolfers: [],
  activeField: [],
  cutField: [],
  projectedCutIndex: 0,
  playerDraftedByMap: new Map(),
  rankDisplayMap: new Map(),
};

const DEFAULT_CONTEST_EVALUATION: ContestEvaluationResult = {
  standings: [],
  dayMoneyResults: [],
  wagerLedger: {
    totalEntryFeesCollected: 0,
    totalMainPayoutsDistributed: 0,
    totalDayMoneyDistributed: 0,
    totalGreedyDistributed: 0,
    totalPayoutsDistributed: 0,
    netPoolBalance: 0,
    isFinalized: false,
    settlements: [],
  },
  playerDraftedByMap: new Map(),
  greedyStandings: [],
};

const EventContext = createContext<EventContextState>({
  activeEventId: '',
  activeSeason: new Date().getFullYear(),
  activeConfig: null,
  contestConfig: null,
  participants: [],
  firestorePlayerMap: DEFAULT_PLAYER_DIRECTORY_MAP,
  selectedEventId: '',
  isHistoricalView: false,
  setEventOverride: () => {},
  events: [],
  activeEvent: null,
  competitors: [],
  tournament: DEFAULT_TOURNAMENT,
  fieldEvaluation: DEFAULT_FIELD_EVALUATION,
  contestEvaluation: DEFAULT_CONTEST_EVALUATION,
  isStaleData: false,
  loading: true,
  isRefreshing: false,
  lastRefreshedAt: null,
  error: null,
  refreshLeaderboard: async () => {},
});

interface EventContextProviderProps {
  children: ReactNode;
  initialEventId?: string;
}

export function EventContextProvider({ children, initialEventId = '' }: EventContextProviderProps) {
  // 1. Core Firestore State
  const [activeConfigId, setActiveConfigId] = useState<string>(initialEventId || '');
  const [activeSeason, setActiveSeason] = useState<number>(new Date().getFullYear());
  const [activeConfig, setActiveConfig] = useState<AppConfig | null>(null);
  const [contestConfig, setContestConfig] = useState<ContestConfig | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [firestorePlayerMap, setFirestorePlayerMap] = useState<
    Record<string, { id: string; name: string; headshotUrl?: string }>
  >(DEFAULT_PLAYER_DIRECTORY_MAP);

  // 2. Scoreboard & Event State
  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [activeEventObj, setActiveEventObj] = useState<ESPNEvent | null>(null);
  const [competitors, setCompetitors] = useState<ESPNCompetitor[]>([]);
  const [viewerEventIdOverride, setViewerEventIdOverride] = useState<string>('');

  // 3. Status Flags
  const [isStaleData, setIsStaleData] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const lastForcedRefreshRef = React.useRef<number>(0);

  // 4. Safe client-side hydration from local cache
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

  // 4. Fetch ESPN Scoreboard (Events List)
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

  // 5. Subscribe to /config/app
  useEffect(() => {
    const configRef = doc(db, 'config', 'app');
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppConfig;
          setActiveConfig(data);
          if (data.activeEventId) {
            setActiveConfigId(data.activeEventId);
            writeCachedActiveEventId(data.activeEventId);
          }
          if (data.activeSeason) setActiveSeason(data.activeSeason);
        }
      },
      (err) => {
        console.warn('EventContext config subscribe error:', err);
      }
    );
    return () => unsub();
  }, []);

  // 6. Resolve Effective Event ID & Historical View Status
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

  // 7. Subscribe to /players directory
  useEffect(() => {
    const playersRef = collection(db, 'players');
    const unsub = onSnapshot(
      playersRef,
      (snapshot) => {
        const map: Record<string, { id: string; name: string; headshotUrl?: string }> = {
          ...DEFAULT_PLAYER_DIRECTORY_MAP,
        };
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          const canonical = DEFAULT_PLAYER_DIRECTORY_MAP[docId];
          if (data.id && data.name) {
            if (canonical && data.name !== canonical.name) return;
            map[data.id] = {
              id: data.id,
              name: data.name,
              headshotUrl: data.headshotUrl || canonical?.headshotUrl,
            };
          }
        });
        setFirestorePlayerMap(map);
      },
      (err) => {
        console.warn('EventContext players directory subscribe error (using defaults):', err);
      }
    );
    return () => unsub();
  }, []);

  // 8. Subscribe to /events/{eventId}/contestConfig/default
  useEffect(() => {
    if (!selectedViewerEventId) {
      setContestConfig(null);
      return;
    }
    const contestConfigRef = doc(db, 'events', selectedViewerEventId, 'contestConfig', 'default');
    const unsub = onSnapshot(
      contestConfigRef,
      (snap) => {
        if (snap.exists()) {
          setContestConfig(snap.data() as ContestConfig);
        } else {
          setContestConfig(null);
        }
      },
      (err) => console.warn('EventContext contestConfig subscribe error:', err)
    );
    return () => unsub();
  }, [selectedViewerEventId]);

  // 9. Subscribe to /events/{eventId}/participants
  useEffect(() => {
    if (!selectedViewerEventId) {
      setParticipants(resolveParticipantsFromSnapshot([], selectedViewerEventId));
      return;
    }
    const participantsRef = collection(db, 'events', selectedViewerEventId, 'participants');
    const unsub = onSnapshot(
      participantsRef,
      (snapshot) => {
        const list: Participant[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Participant);
          });
        }
        setParticipants(resolveParticipantsFromSnapshot(list, selectedViewerEventId));
      },
      (err) => {
        console.warn('EventContext participants subscribe error:', err);
        setParticipants(resolveParticipantsFromSnapshot([], selectedViewerEventId));
      }
    );
    return () => unsub();
  }, [selectedViewerEventId]);

  // 10. Fetch Leaderboard for Selected Event
  const fetchLeaderboard = useCallback(
    async (isForce: boolean = false) => {
      if (!selectedViewerEventId) return;

      setIsRefreshing(true);
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
          // Optimistically retain existing state
          return;
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
        }
      } catch (err: unknown) {
        console.error('EventContext failed to fetch ESPN Leaderboard:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsRefreshing(false);
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

  // 11. Deep Domain Evaluators
  const tournament = useMemo(() => {
    return EspnTournamentAdapter.normalizeTournamentSnapshot(
      { events },
      activeEventObj,
      { activeEventId: selectedViewerEventId, playerDirectoryMap: firestorePlayerMap }
    );
  }, [events, activeEventObj, selectedViewerEventId, firestorePlayerMap]);

  const fieldEvaluation = useMemo(() => {
    return evaluateFieldLeaderboard({
      tournament,
      competitors,
      participants,
      eventStatus: tournament.rawEvent?.status || activeEvent?.status,
      playerDirectoryMap: firestorePlayerMap,
    });
  }, [tournament, competitors, participants, activeEvent, firestorePlayerMap]);

  const contestEvaluation = useMemo(() => {
    return evaluateContest(
      participants,
      competitors,
      contestConfig,
      activeEvent?.status,
      firestorePlayerMap
    );
  }, [participants, competitors, contestConfig, activeEvent, firestorePlayerMap]);

  // 12. Adaptive Interval & Tab Visibility Polling Hook
  useLeaderboardPolling({
    activeEventId: selectedViewerEventId,
    isLive: tournament.statusState === 'in',
    onPoll: fetchLeaderboard,
  });

  // 13. Eager Drafted Roster Scorecard Pre-fetching
  useEffect(() => {
    if (!selectedViewerEventId || fieldEvaluation.draftedGolfers.length === 0) return;

    // Collect competitor objects for all drafted golfers
    const draftedCompetitors: ESPNCompetitor[] = fieldEvaluation.draftedGolfers
      .map((drafted) => tournament.competitorMap.get(drafted.id) || competitors.find((c) => (c.athlete?.id || c.id) === drafted.id))
      .filter((c): c is ESPNCompetitor => Boolean(c));

    if (draftedCompetitors.length > 0) {
      // Import prefetchPlayerSummaries dynamically/directly to pre-warm client cache in the background
      import('@/hooks/usePlayerSummary').then(({ prefetchPlayerSummaries }) => {
        prefetchPlayerSummaries(selectedViewerEventId, draftedCompetitors);
      });
    }
  }, [selectedViewerEventId, fieldEvaluation.draftedGolfers, tournament.competitorMap, competitors]);

  const handleRefresh = useCallback(
    async (options?: { force?: boolean }) => {
      const isForce = options?.force ?? true;
      if (isForce) {
        const now = Date.now();
        if (now - lastForcedRefreshRef.current < 10000) {
          // In 10-second debounce cooldown window — skip duplicate forced network hit
          return;
        }
        lastForcedRefreshRef.current = now;
      }
      await fetchLeaderboard(isForce);
    },
    [fetchLeaderboard]
  );

  // Vercel Performance: rerender-memo on global context value
  const contextValue: EventContextState = useMemo(
    () => ({
      activeEventId: effectiveActiveEventId,
      activeSeason,
      activeConfig,
      contestConfig,
      participants,
      firestorePlayerMap,
      selectedEventId: selectedViewerEventId,
      isHistoricalView,
      setEventOverride: setViewerEventIdOverride,
      events,
      activeEvent,
      competitors,
      tournament,
      fieldEvaluation,
      contestEvaluation,
      isStaleData,
      loading,
      isRefreshing,
      lastRefreshedAt,
      error,
      refreshLeaderboard: handleRefresh,
    }),
    [
      effectiveActiveEventId,
      activeSeason,
      activeConfig,
      contestConfig,
      participants,
      firestorePlayerMap,
      selectedViewerEventId,
      isHistoricalView,
      setViewerEventIdOverride,
      events,
      activeEvent,
      competitors,
      tournament,
      fieldEvaluation,
      contestEvaluation,
      isStaleData,
      loading,
      isRefreshing,
      lastRefreshedAt,
      error,
      handleRefresh,
    ]
  );

  return (
    <EventContext.Provider value={contextValue}>
      {children}
    </EventContext.Provider>
  );

}

export function useEventContext(): EventContextState {
  return useContext(EventContext);
}
