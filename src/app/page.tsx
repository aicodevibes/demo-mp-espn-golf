'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import {
  useActiveConfig,
  useTrackedPlayers,
  useParticipants,
  useContestConfig,
  setActiveEvent,
  addTrackedPlayer,
  removeTrackedPlayer,
  syncPlayersToFirestore,
  TrackedPlayer,
} from '@/lib/firebase/firestore';
import { ESPNEvent, ESPNCompetitor, ESPNPlayerSummary } from '@/types/espn';
import { formatPlayerSummaryFromCompetitor, formatPlayerSummaryFromESPNData, createSyntheticCompetitor } from '@/lib/espn';
import { evaluateContest } from '@/lib/contestEngine';

// Vercel Performance Rule: bundle-dynamic-imports
// Dynamically import heavy Admin Control Drawer only when needed
const AdminManagementDrawer = dynamic(
  () => import('@/components/AdminManagementDrawer').then((mod) => mod.AdminManagementDrawer),
  { ssr: false }
);

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { config, loading: configLoading } = useActiveConfig();
  const { players: trackedPlayers, loading: playersLoading } = useTrackedPlayers();

  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [activeEvent, setActiveEventObj] = useState<ESPNEvent | null>(null);
  const [competitors, setCompetitors] = useState<ESPNCompetitor[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('top_view');
  const [playerSummary, setPlayerSummary] = useState<ESPNPlayerSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // 1. Fetch ESPN Scoreboard (Events List)
  useEffect(() => {
    async function fetchScoreboard() {
      try {
        const res = await fetch('/api/espn/scoreboard');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error('Failed to fetch ESPN Scoreboard:', err);
      }
    }
    fetchScoreboard();
  }, []);

  // 2. Set Active Event ID (from Firestore config or default to 1st event)
  const activeEventId = config?.activeEventId || events[0]?.id;

  const { config: contestConfig, loading: contestConfigLoading } = useContestConfig(activeEventId);
  const { participants, loading: participantsLoading } = useParticipants(activeEventId);

  // Auto-select 1st participant when loaded
  useEffect(() => {
    if (participants.length > 0 && !selectedParticipantId) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  // 3. Fetch Active Event Leaderboard
  useEffect(() => {
    if (!activeEventId) return;

    async function fetchLeaderboard() {
      setLoadingLeaderboard(true);
      try {
        const res = await fetch(`/api/espn/leaderboard?event=${activeEventId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events[0]) {
            setActiveEventObj(data.events[0]);
            const comps = data.events[0]?.competitions?.[0]?.competitors || [];
            setCompetitors(comps);
            syncPlayersToFirestore(comps);

            // Auto-select first tracked player or first field competitor
            if (comps.length > 0 && !selectedPlayerId) {
              const firstTracked = comps.find((c: ESPNCompetitor) =>
                trackedPlayers.some((p) => p.playerId === (c.athlete?.id || c.id))
              );
              setSelectedPlayerId(firstTracked ? firstTracked.athlete?.id || firstTracked.id : comps[0].athlete?.id || comps[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch ESPN Leaderboard:', err);
      } finally {
        setLoadingLeaderboard(false);
      }
    }

    fetchLeaderboard();
  }, [activeEventId]);

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
    return evaluateContest(participants, competitors, contestConfig, activeEvent?.status);
  }, [participants, competitors, contestConfig, activeEvent]);

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

  // Vercel Performance Rule: rerender-memo & js-index-maps
  const displayCompetitors = useMemo(() => {
    const compMap = new Map(competitors.map((c) => [c.athlete?.id || c.id, c]));

    // 1. Top View: 1st through 4th golfer in tournament leaderboard
    if (isTopView) {
      if (competitors.length > 0) {
        return competitors.slice(0, 4);
      }
      if (trackedPlayers.length > 0) {
        return trackedPlayers.slice(0, 4).map((p) => {
          return compMap.get(p.playerId) || createSyntheticCompetitor(p.playerId, p.name, p.headshotUrl, p.country);
        });
      }
      return [];
    }

    // 2. Selected Participant View: display their drafted golfers
    if (activeParticipant && activeParticipant.draftedPlayerIds && activeParticipant.draftedPlayerIds.length > 0) {
      return activeParticipant.draftedPlayerIds.map((playerId) => {
        return compMap.get(playerId) || createSyntheticCompetitor(playerId);
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

  // 4. Fetch Hole-by-Hole Player Summary from ESPN API for selected golfer
  useEffect(() => {
    if (!selectedCompetitor || !activeEventId) return;

    const playerId = selectedCompetitor.athlete?.id || selectedCompetitor.id;
    if (!playerId) return;

    let isMounted = true;
    setLoadingSummary(true);

    async function fetchPlayerSummary() {
      try {
        const season = new Date().getFullYear();
        const res = await fetch(
          `/api/espn/playersummary?eventId=${activeEventId}&playerId=${playerId}&season=${season}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const summary = formatPlayerSummaryFromESPNData(data, selectedCompetitor);
            setPlayerSummary(summary);
          }
        } else {
          if (isMounted) {
            setPlayerSummary(formatPlayerSummaryFromCompetitor(selectedCompetitor));
          }
        }
      } catch (err) {
        console.error('Failed to fetch player summary from ESPN API:', err);
        if (isMounted) {
          setPlayerSummary(formatPlayerSummaryFromCompetitor(selectedCompetitor));
        }
      } finally {
        if (isMounted) {
          setLoadingSummary(false);
        }
      }
    }

    fetchPlayerSummary();

    return () => {
      isMounted = false;
    };
  }, [selectedCompetitor, activeEventId]);

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
      <Header eventName={activeEvent?.name} eventObj={activeEvent || undefined} />

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
                {displayCompetitors.length} Golfer{displayCompetitors.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Participant Dropdown View Selector */}
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
          </div>

          <TrackedPlayerHeroGrid
            trackedCompetitors={displayCompetitors}
            allCompetitors={competitors}
            eventStatus={activeEvent?.status}
            selectedPlayerId={selectedPlayerId || selectedCompetitor?.athlete?.id || selectedCompetitor?.id}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        </section>

        {/* Section 2: Official Participant Standings */}
        <section>
          <ParticipantStandings
            standings={participantStandings}
            contestConfig={contestConfig}
            loading={loadingLeaderboard || participantsLoading || contestConfigLoading}
            onSelectParticipant={(pId) => setSelectedParticipantId(pId)}
            onSelectPlayer={(pId) => setSelectedPlayerId(pId)}
          />
        </section>

        {/* Section 3: Side-by-Side - Top 10 Leaderboard & Drafted Golfers */}
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

        {/* Section 4: Selected Golfer 18-Hole Matrix & Round Scores (R1 to R4) */}
        <section>
          <ScorecardMatrix
            playerSummary={playerSummary}
            competitor={selectedCompetitor}
            eventStatus={activeEvent?.status}
            loading={loadingSummary}
            playerName={selectedCompetitor?.athlete?.displayName}
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

      {/* Admin Floating Drawer (Only rendered for aicodevibes@gmail.com) */}
      {isAdmin && (
        <AdminManagementDrawer
          events={events}
          activeEventId={activeEventId}
          onSelectEvent={handleSelectEvent}
          trackedPlayers={trackedPlayers}
          fieldCompetitors={competitors}
          onAddTrackedPlayer={handleToggleTrackPlayer}
          onRemoveTrackedPlayer={async (id) => removeTrackedPlayer(id)}
        />
      )}
    </div>
  );
}
