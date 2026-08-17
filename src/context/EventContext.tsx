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

  /** True during initial cold-start data fetching. */
  loading: boolean;
  /** True when a background leaderboard refresh is currently underway. */
  isRefreshing: boolean;
  /** Error object if any subscription or fetch failed. */
  error: Error | null;
  /** Manual trigger to force re-fetch latest ESPN leaderboard. */
  refreshLeaderboard: () => Promise<void>;
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
  loading: true,
  isRefreshing: false,
  error: null,
  refreshLeaderboard: async () => {},
});

const LEADERBOARD_POLL_INTERVAL_MS = 5 * 60 * 1000;

interface EventContextProviderProps {
  children: ReactNode;
  initialEventId?: string;
}

export function EventContextProvider({ children, initialEventId = '' }: EventContextProviderProps) {
  // 1. Core Firestore State
  const [activeConfigId, setActiveConfigId] = useState<string>(() => {
    if (initialEventId) return initialEventId;
    const cached = readScoreboardCache();
    return cached?.lastActiveEventId || '';
  });
  const [activeSeason, setActiveSeason] = useState<number>(new Date().getFullYear());
  const [activeConfig, setActiveConfig] = useState<AppConfig | null>(null);
  const [contestConfig, setContestConfig] = useState<ContestConfig | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [firestorePlayerMap, setFirestorePlayerMap] = useState<
    Record<string, { id: string; name: string; headshotUrl?: string }>
  >(DEFAULT_PLAYER_DIRECTORY_MAP);

  // 2. Scoreboard & Event State
  const [events, setEvents] = useState<ESPNEvent[]>(() => {
    const cached = readScoreboardCache();
    return cached?.events || [];
  });
  const [activeEventObj, setActiveEventObj] = useState<ESPNEvent | null>(null);
  const [competitors, setCompetitors] = useState<ESPNCompetitor[]>([]);
  const [viewerEventIdOverride, setViewerEventIdOverride] = useState<string>('');

  // 3. Status Flags
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // 4. Fetch ESPN Scoreboard (Events List)
  useEffect(() => {
    async function fetchScoreboard() {
      try {
        const res = await fetch('/api/espn/scoreboard');
        if (res.ok) {
          const data = await res.json();
          const fetchedEvents: ESPNEvent[] = data.events || [];
          setEvents(fetchedEvents);
          writeScoreboardCache(fetchedEvents, activeConfigId || undefined);
        }
      } catch (err) {
        console.error('Failed to fetch ESPN Scoreboard:', err);
      }
    }
    fetchScoreboard();
  }, [activeConfigId]);

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
  const fetchLeaderboard = useCallback(async () => {
    if (!selectedViewerEventId) return;

    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/espn/leaderboard?event=${selectedViewerEventId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.events && data.events[0]) {
          setActiveEventObj(data.events[0]);
          const comps = data.events[0]?.competitions?.[0]?.competitors || [];
          const resolvedComps = resolveEventCompetitorsWithFallback(comps, []);
          setCompetitors(resolvedComps);
          syncPlayersToFirestore(resolvedComps);
        }
      }
    } catch (err: unknown) {
      console.error('EventContext failed to fetch ESPN Leaderboard:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [selectedViewerEventId]);

  // Initial leaderboard fetch whenever selected event changes
  useEffect(() => {
    setCompetitors([]);
    setActiveEventObj(null);
    setLoading(true);
    fetchLeaderboard();
  }, [selectedViewerEventId, fetchLeaderboard]);

  // 11. 45-Second Interval & Tab Visibility Polling
  useEffect(() => {
    if (!selectedViewerEventId) return;

    const pollIfVisible = () => {
      if (!document.hidden) {
        fetchLeaderboard();
      }
    };

    const interval = setInterval(pollIfVisible, LEADERBOARD_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLeaderboard();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedViewerEventId, fetchLeaderboard]);

  // 12. Deep Domain Evaluators
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

  return (
    <EventContext.Provider
      value={{
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
        loading,
        isRefreshing,
        error,
        refreshLeaderboard: fetchLeaderboard,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext(): EventContextState {
  return useContext(EventContext);
}
