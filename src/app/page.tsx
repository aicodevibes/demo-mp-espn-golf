'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { TrackedPlayerHeroGrid } from '@/components/TrackedPlayerHeroGrid';
import { ScorecardMatrix } from '@/components/ScorecardMatrix';
import { Top10Leaderboard } from '@/components/Top10Leaderboard';
import { DraftedPlayersLeaderboard } from '@/components/DraftedPlayersLeaderboard';
import { FullFieldLeaderboard } from '@/components/FullFieldLeaderboard';
import { ParticipantStandings } from '@/components/ParticipantStandings';
import { DayMoneyWinners } from '@/components/DayMoneyWinners';
import { WagerSettlementLedger } from '@/components/WagerSettlementLedger';
import { LiveActivityFeed } from '@/components/LiveActivityFeed';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';


// ... (keep rest of top code intact until component body)

import {
  useActiveConfig,
  useTrackedPlayers,
  useAllPlayers,
  useParticipants,
  useContestConfig,
  setActiveEvent,
  addTrackedPlayer,
  removeTrackedPlayer,
  syncPlayersToFirestore,
  TrackedPlayer,
} from '@/lib/firebase/firestore';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import {
  createSyntheticCompetitor,
  resolveActiveEvent,
  resolveEventCompetitorsWithFallback,
  DEFAULT_PLAYER_DIRECTORY_MAP,
  readScoreboardCache,
  writeScoreboardCache,
} from '@/lib/espn';
import { evaluateContest } from '@/lib/contestEngine';
import { evaluateFieldLeaderboard } from '@/lib/fieldLeaderboard';
import { useLeaderboardPolling } from '@/hooks/useLeaderboardPolling';
import { usePlayerSummary } from '@/hooks/usePlayerSummary';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { config, loading: configLoading } = useActiveConfig();
  const { players: trackedPlayers, loading: playersLoading } = useTrackedPlayers();
  const { playerMap: firestorePlayerMap } = useAllPlayers();

  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [activeEventObj, setActiveEventObj] = useState<ESPNEvent | null>(null);
  const [competitors, setCompetitors] = useState<ESPNCompetitor[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('top_view');

  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState<boolean>(false);

  // Synchronously hydrate events from client localStorage cache if available
  useEffect(() => {
    const cachedEvents = readScoreboardCache();
    if (cachedEvents && cachedEvents.length > 0) {
      setEvents(cachedEvents);
    }
  }, []);

  // Load watchlist collapse preference client-side to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mp_watchlist_collapsed');
      if (stored !== null) {
        setIsWatchlistCollapsed(stored === 'true');
      }
    }
  }, []);

  const toggleWatchlistCollapse = () => {
    setIsWatchlistCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mp_watchlist_collapsed', String(next));
      }
      return next;
    });
  };

  // 1. Fetch ESPN Scoreboard (Events List) & Revalidate Local Cache
  useEffect(() => {
    async function fetchScoreboard() {
      try {
        const res = await fetch('/api/espn/scoreboard');
        if (res.ok) {
          const data = await res.json();
          const fetchedEvents = data.events || [];
          setEvents(fetchedEvents);
          writeScoreboardCache(fetchedEvents);
        }
      } catch (err) {
        console.error('Failed to fetch ESPN Scoreboard:', err);
      }
    }
    fetchScoreboard();
  }, []);

  // 2. Set Active Event ID & Viewer Override
  const [viewerEventIdOverride, setViewerEventIdOverride] = useState<string>('');
  const effectiveActiveEventId = config?.activeEventId || events[0]?.id;
  const selectedViewerEventId = viewerEventIdOverride || effectiveActiveEventId;
  const isHistoricalView = Boolean(viewerEventIdOverride && viewerEventIdOverride !== config?.activeEventId);

  const activeEvent = useMemo(() => {
    return resolveActiveEvent(events, activeEventObj, selectedViewerEventId);
  }, [events, activeEventObj, selectedViewerEventId]);

  const { config: contestConfig, loading: contestConfigLoading } = useContestConfig(selectedViewerEventId);
  const { participants, loading: participantsLoading } = useParticipants(selectedViewerEventId);

  // Auto-select 1st participant when loaded
  useEffect(() => {
    if (participants.length > 0 && !selectedParticipantId) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  // 3. Fetch Selected Event Leaderboard — stable callback so polling can call it without re-creating on every render
  const fetchLeaderboard = useCallback(async () => {
    if (!selectedViewerEventId) return;
    
    // Only show loading skeleton on initial fetch when competitors are empty
    setCompetitors((currentComps) => {
      if (currentComps.length === 0) {
        setLoadingLeaderboard(true);
      }
      return currentComps;
    });

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

          // Auto-select first tracked player or first field competitor if none selected yet
          if (resolvedComps.length > 0) {
            setSelectedPlayerId((prev) => {
              if (prev) return prev;
              const firstTracked = resolvedComps.find((c: ESPNCompetitor) =>
                trackedPlayers.some((p) => p.playerId === (c.athlete?.id || c.id))
              );
              return firstTracked ? firstTracked.athlete?.id || firstTracked.id : resolvedComps[0].athlete?.id || resolvedComps[0].id;
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch ESPN Leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [selectedViewerEventId, trackedPlayers]);

  // Initial leaderboard fetch on active event change
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // 3a. Poll leaderboard every 5 minutes while tab is visible; re-fetch immediately on tab return
  useLeaderboardPolling({ activeEventId: selectedViewerEventId, onPoll: fetchLeaderboard });


  // Vercel Performance Rule: rerender-derived-state & js-set-map-lookups
  const trackedPlayerIdsSet = useMemo(
    () => new Set(trackedPlayers.map((p) => p.playerId)),
    [trackedPlayers]
  );

  const trackedPlayerIds = useMemo(
    () => Array.from(trackedPlayerIdsSet),
    [trackedPlayerIdsSet]
  );

  // Evaluate entire contest via deep ContestEngine seam
  const contestEvaluation = useMemo(() => {
    return evaluateContest(participants, competitors, contestConfig, activeEvent?.status, firestorePlayerMap);
  }, [participants, competitors, contestConfig, activeEvent, firestorePlayerMap]);

  const participantStandings = contestEvaluation.standings;
  const dayMoneyResults = contestEvaluation.dayMoneyResults;
  const wagerLedger = contestEvaluation.wagerLedger;
  const playerDraftedByMap = contestEvaluation.playerDraftedByMap;


  const isTopView = selectedParticipantId === 'top_view' || !selectedParticipantId;

  // Find active selected participant
  const activeParticipant = useMemo(() => {
    if (isTopView) return null;
    return participants.find((p) => p.id === selectedParticipantId) || null;
  }, [participants, selectedParticipantId, isTopView]);

  const fieldEvaluation = useMemo(() => {
    return evaluateFieldLeaderboard({
      competitors,
      participants,
      eventStatus: activeEvent?.status,
    });
  }, [competitors, participants, activeEvent]);

  // Vercel Performance Rule: rerender-memo & js-index-maps
  const displayCompetitors = useMemo(() => {
    const compMap = new Map(competitors.map((c) => [c.athlete?.id || c.id, c]));

    // 1. Top View: 1st through 4th golfer in sorted tournament leaderboard
    if (isTopView) {
      if (fieldEvaluation.top10Competitors.length > 0) {
        return fieldEvaluation.top10Competitors.slice(0, 4);
      }
      if (competitors.length > 0) {
        return competitors.slice(0, 4);
      }
      if (trackedPlayers.length > 0) {
        return trackedPlayers.slice(0, 4).map((p) => {
          const directoryPlayer = firestorePlayerMap[p.playerId] || DEFAULT_PLAYER_DIRECTORY_MAP[p.playerId];
          return (
            compMap.get(p.playerId) ||
            createSyntheticCompetitor(
              p.playerId,
              p.name || directoryPlayer?.name || `Golfer (${p.playerId})`,
              p.headshotUrl || directoryPlayer?.headshotUrl,
              p.country
            )
          );
        });
      }
      return [];
    }

    // 2. Selected Participant View: display their drafted golfers
    if (activeParticipant && activeParticipant.draftedPlayerIds && activeParticipant.draftedPlayerIds.length > 0) {
      return activeParticipant.draftedPlayerIds.map((playerId) => {
        const directoryPlayer = firestorePlayerMap[playerId] || DEFAULT_PLAYER_DIRECTORY_MAP[playerId];
        return (
          compMap.get(playerId) ||
          createSyntheticCompetitor(
            playerId,
            directoryPlayer?.name || `Golfer (${playerId})`,
            directoryPlayer?.headshotUrl,
            ''
          )
        );
      });
    }

    return competitors.slice(0, 4);
  }, [competitors, activeParticipant, trackedPlayers, isTopView]);

  // Auto-select 1st golfer of newly displayed participant watchlist
  useEffect(() => {
    if (displayCompetitors.length > 0) {
      const isSelectedInDisplay = displayCompetitors.some(
        (c) => (c.athlete?.id || c.id) === selectedPlayerId
      );
      if (!isSelectedInDisplay) {
        const firstId = displayCompetitors[0]?.athlete?.id || displayCompetitors[0]?.id;
        if (firstId) setSelectedPlayerId(firstId);
      }
    }
  }, [displayCompetitors, selectedPlayerId]);

  const selectedCompetitor = useMemo(() => {
    const compMap = new Map(competitors.map((c) => [c.athlete?.id || c.id, c]));
    return compMap.get(selectedPlayerId) || displayCompetitors[0];
  }, [competitors, selectedPlayerId, displayCompetitors]);

  const selectedCompetitorId = selectedCompetitor?.athlete?.id || selectedCompetitor?.id;

  // 4. Fetch Hole-by-Hole Player Summary via usePlayerSummary custom hook
  const {
    summary: playerSummary,
    isLoading: loadingSummary,
    isFetching: isFetchingSummary,
  } = usePlayerSummary({
    eventId: selectedViewerEventId,
    competitor: selectedCompetitor,
  });


  // Admin Actions
  const handleSelectEvent = useCallback(async (eventId: string) => {
    await setActiveEvent(eventId, new Date().getFullYear(), user?.email || 'aicodevibes@gmail.com');
  }, [user]);

  const handleToggleTrackPlayer = useCallback(async (comp: ESPNCompetitor) => {
    const playerId = comp.athlete?.id || comp.id;
    if (!playerId) return;

    const isTracked = trackedPlayerIdsSet.has(playerId);
    if (isTracked) {
      await removeTrackedPlayer(playerId);
    } else {
      const newPlayer: TrackedPlayer = {
        playerId: playerId,
        name: comp.athlete?.displayName || 'Unknown Golfer',
        headshotUrl: comp.athlete?.headshot?.href || '',
        country: comp.athlete?.country?.abbreviation || '',
        displayOrder: trackedPlayers.length + 1,
      };
      await addTrackedPlayer(newPlayer);
    }
  }, [trackedPlayerIdsSet, trackedPlayers]);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Top Navigation Header */}
      <Header
        eventName={activeEvent?.name}
        eventObj={activeEvent || undefined}
        events={events}
        selectedEventId={selectedViewerEventId}
        onSelectEvent={setViewerEventIdOverride}
      />

      {/* Historical Archive Banner */}
      {isHistoricalView && (
        <div className="max-w-7xl w-full mx-auto px-4 lg:px-8 mt-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Viewing Historical Archive: {activeEvent?.name || 'Tournament'} ({selectedViewerEventId})</span>
            </div>
            <button
              onClick={() => setViewerEventIdOverride('')}
              className="text-[11px] font-extrabold px-2.5 py-1 rounded bg-amber-500 text-amber-950 hover:bg-amber-400 transition cursor-pointer"
            >
              Return to Live Event
            </button>
          </div>
        </div>
      )}

      {/* Main Content Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-8">

        {/* Section 1: Participant View Selector & Watchlist Hero Grid */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-on-surface">
                {isTopView ? 'Top View Watchlist (1st - 4th Golfers)' : activeParticipant ? `${activeParticipant.name}'s Watchlist` : 'Participant Watchlist'}
              </h2>
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full border border-outline-variant/60">
                {displayCompetitors.length} Golfer{displayCompetitors.length === 1 ? '' : 's'} {isWatchlistCollapsed ? '• Hidden' : ''}
              </span>
            </div>

            {/* Participant Dropdown View Selector & Ribbon Collapse Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="participantSelect" className="text-xs font-bold text-on-surface-variant">
                  Participant View:
                </label>
                <select
                  id="participantSelect"
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-xs font-bold text-on-surface outline-none focus:border-tertiary shadow-xs cursor-pointer"
                >
                  <option value="top_view">Top View (1st - 4th Golfers)</option>
                  {participantsLoading ? (
                    <option value="" disabled>Loading Participants...</option>
                  ) : (
                    participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.draftedPlayerIds.length > 0 ? `(${p.draftedPlayerIds.length} Golfers)` : '(No Roster)'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                onClick={toggleWatchlistCollapse}
                title={isWatchlistCollapsed ? "Expand Watchlist Section" : "Collapse Watchlist Section"}
                className="p-1.5 text-on-surface-variant hover:text-on-surface bg-surface-container-lowest hover:bg-surface-container-high rounded-lg border border-outline-variant transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              >
                {isWatchlistCollapsed ? (
                  <>
                    <span>Expand</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {!isWatchlistCollapsed && (
            <TrackedPlayerHeroGrid
              trackedCompetitors={displayCompetitors}
              allCompetitors={competitors}
              eventStatus={activeEvent?.status}
              rankDisplayMap={fieldEvaluation.rankDisplayMap}
              selectedPlayerId={selectedPlayerId || selectedCompetitor?.athlete?.id || selectedCompetitor?.id}
              onSelectPlayer={(id) => setSelectedPlayerId(id)}
            />
          )}
        </section>

        {/* Section 2: Selected Golfer 18-Hole Matrix & Round Scores (R1 to R4) */}
        <section>
          <ScorecardMatrix
            playerSummary={playerSummary}
            competitor={selectedCompetitor}
            eventStatus={activeEvent?.status}
            loading={loadingSummary}
            isFetching={isFetchingSummary}
            playerName={selectedCompetitor?.athlete?.displayName}
          />
        </section>

        {/* Section 3: Official Participant Standings */}
        <section>
          <ParticipantStandings
            standings={participantStandings}
            contestConfig={contestConfig}
            loading={loadingLeaderboard || participantsLoading || contestConfigLoading}
            onSelectParticipant={(pId) => setSelectedParticipantId(pId)}
            onSelectPlayer={(pId) => setSelectedPlayerId(pId)}
          />
        </section>

        {/* Section 4: Side-by-Side - Top 10 Leaderboard & Drafted Golfers */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Top10Leaderboard
            competitors={competitors}
            participants={participants}
            eventObj={activeEvent || undefined}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />

          <DraftedPlayersLeaderboard
            competitors={competitors}
            participants={participants}
            eventObj={activeEvent || undefined}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        </section>

        {/* Section 5: Full PGA Tournament Field Leaderboard */}
        <section>
          <FullFieldLeaderboard
            competitors={competitors}
            participants={participants}
            eventObj={activeEvent || undefined}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        </section>

        {/* Section 6: Day Money Winners */}
        <section>
          <DayMoneyWinners
            dayMoneyResults={dayMoneyResults}
            contestConfig={contestConfig}
            eventStatus={activeEvent?.status}
            loading={loadingLeaderboard || participantsLoading || contestConfigLoading}
          />
        </section>

        {/* Section 7: Live Tournament Social Activity Feed */}
        <section>
          <LiveActivityFeed
            participants={participants}
            competitors={competitors}
            contestConfig={contestConfig}
            eventStatus={activeEvent?.status}
          />
        </section>

        {/* Section 8: Official Wager Settlement Ledger */}
        <section>
          <WagerSettlementLedger
            participants={participants}
            competitors={competitors}
            contestConfig={contestConfig}
            eventStatus={activeEvent?.status}
            wagerLedger={wagerLedger}
          />
        </section>
      </main>
    </div>
  );
}
