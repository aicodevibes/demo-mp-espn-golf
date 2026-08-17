'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import { useEventContext } from '@/context/EventContext';
import { DEFAULT_PLAYER_DIRECTORY_MAP, EspnTournamentAdapter } from '@/lib/espn';
import { ESPNCompetitor } from '@/types/espn';
import { usePlayerSummary } from '@/hooks/usePlayerSummary';

export default function DashboardPage() {
  const {
    events,
    activeEvent,
    selectedEventId,
    isHistoricalView,
    setEventOverride,
    competitors,
    tournament,
    fieldEvaluation,
    contestEvaluation,
    participants,
    contestConfig,
    firestorePlayerMap,
    loading: eventContextLoading,
    isRefreshing,
    lastRefreshedAt,
    refreshLeaderboard,
  } = useEventContext();

  // Local UI-only state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('top_view');
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState<boolean>(false);

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

  // Auto-select 1st participant when loaded if needed
  useEffect(() => {
    if (participants.length > 0 && !selectedParticipantId) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  const isTopView = selectedParticipantId === 'top_view' || !selectedParticipantId;

  // Find active selected participant
  const activeParticipant = useMemo(() => {
    if (isTopView) return null;
    return participants.find((p) => p.id === selectedParticipantId) || null;
  }, [participants, selectedParticipantId, isTopView]);

  // Vercel Performance Rule: rerender-memo & js-index-maps
  const displayCompetitors = useMemo(() => {
    const compMap = tournament.competitorMap;

    // 1. Top View: 1st through 4th golfer in sorted tournament leaderboard
    if (isTopView) {
      if (fieldEvaluation.top10Leaders.length > 0) {
        return fieldEvaluation.top10Leaders.slice(0, 4);
      }
      if (tournament.competitors.length > 0) {
        return tournament.competitors.slice(0, 4);
      }
      return [];
    }

    // 2. Selected Participant View: display their drafted golfers
    if (activeParticipant && activeParticipant.draftedPlayerIds && activeParticipant.draftedPlayerIds.length > 0) {
      return activeParticipant.draftedPlayerIds.map((playerId) => {
        const existing = compMap.get(playerId);
        if (existing) return existing;
        const dirPlayer = firestorePlayerMap[playerId] || DEFAULT_PLAYER_DIRECTORY_MAP[playerId];
        return EspnTournamentAdapter.normalizeCompetitor(
          {
            id: playerId,
            score: '-',
            status: {
              thru: 0,
              position: { displayName: '-' },
              type: { state: 'pre', completed: false, description: 'Scheduled' },
            },
            athlete: {
              id: playerId,
              displayName: dirPlayer?.name || `Golfer (${playerId})`,
              headshot: { href: dirPlayer?.headshotUrl || '' },
            },
          } as ESPNCompetitor,
          activeEvent?.status,
          [],
          firestorePlayerMap
        );
      });
    }

    return tournament.competitors.slice(0, 4);
  }, [tournament, activeParticipant, isTopView, fieldEvaluation, firestorePlayerMap, activeEvent]);

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
    return tournament.competitorMap.get(selectedPlayerId) || displayCompetitors[0] || null;
  }, [tournament, selectedPlayerId, displayCompetitors]);

  // Fetch Hole-by-Hole Player Summary via usePlayerSummary custom hook
  const {
    summary: playerSummary,
    isLoading: loadingSummary,
    isFetching: isFetchingSummary,
  } = usePlayerSummary({
    eventId: selectedEventId,
    competitor: selectedCompetitor,
  });

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Top Navigation Header */}
      <Header
        eventName={activeEvent?.name}
        eventObj={activeEvent || undefined}
        isRefreshing={isRefreshing}
        lastRefreshedAt={lastRefreshedAt}
        onRefresh={refreshLeaderboard}
      />

      {/* Historical Archive Banner */}
      {isHistoricalView && (
        <div className="max-w-7xl w-full mx-auto px-4 lg:px-8 mt-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Viewing Historical Archive: {activeEvent?.name || 'Tournament'} ({selectedEventId})</span>
            </div>
            <button
              onClick={() => setEventOverride('')}
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
                {isTopView
                  ? 'Top View Watchlist (1st - 4th Golfers)'
                  : activeParticipant
                  ? `${activeParticipant.name}'s Watchlist`
                  : 'Participant Watchlist'}
              </h2>
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full border border-outline-variant/60">
                {displayCompetitors.length} Golfer{displayCompetitors.length === 1 ? '' : 's'}{' '}
                {isWatchlistCollapsed ? '• Hidden' : ''}
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
                  name="selectedParticipant"
                  aria-label="Select pool participant"
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-xs font-bold text-on-surface outline-none focus:border-tertiary shadow-xs cursor-pointer"
                >
                  <option value="top_view">Top View (1st - 4th Golfers)</option>
                  {eventContextLoading ? (
                    <option value="" disabled>
                      Loading Participants...
                    </option>
                  ) : (
                    participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{' '}
                        {p.draftedPlayerIds.length > 0
                          ? `(${p.draftedPlayerIds.length} Golfers)`
                          : '(No Roster)'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                onClick={toggleWatchlistCollapse}
                title={isWatchlistCollapsed ? 'Expand Watchlist Section' : 'Collapse Watchlist Section'}
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
              allCompetitors={tournament.competitors}
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
            standings={contestEvaluation.standings}
            contestConfig={contestConfig}
            loading={eventContextLoading}
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
            top10Leaders={fieldEvaluation.top10Leaders}
            playerDraftedByMap={fieldEvaluation.playerDraftedByMap}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />

          <DraftedPlayersLeaderboard
            competitors={competitors}
            participants={participants}
            eventObj={activeEvent || undefined}
            otherDrafted={fieldEvaluation.draftedGolfers}
            playerDraftedByMap={fieldEvaluation.playerDraftedByMap}
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
            activeField={fieldEvaluation.activeField}
            cutField={fieldEvaluation.cutField}
            playerDraftedByMap={fieldEvaluation.playerDraftedByMap}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        </section>

        {/* Section 6: Day Money Winners */}
        <section>
          <DayMoneyWinners
            dayMoneyResults={contestEvaluation.dayMoneyResults}
            contestConfig={contestConfig}
            eventStatus={activeEvent?.status}
            loading={eventContextLoading}
          />
        </section>

        {/* Section 7: Live Tournament Social Activity Feed */}
        <section>
          <LiveActivityFeed
            participants={participants}
            competitors={competitors}
            contestConfig={contestConfig}
            eventStatus={activeEvent?.status}
            selectedEventId={selectedEventId}
            playerSummary={playerSummary}
          />
        </section>

        {/* Section 8: Official Wager Settlement Ledger */}
        <section>
          <WagerSettlementLedger
            participants={participants}
            competitors={competitors}
            contestConfig={contestConfig}
            eventStatus={activeEvent?.status}
            wagerLedger={contestEvaluation.wagerLedger}
          />
        </section>
      </main>
    </div>
  );
}
