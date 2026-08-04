'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { TrackedPlayerHeroGrid } from '@/components/TrackedPlayerHeroGrid';
import { ScorecardMatrix } from '@/components/ScorecardMatrix';
import { LiveLeaderboard } from '@/components/LiveLeaderboard';
import { ParticipantStandings } from '@/components/ParticipantStandings';
import { DayMoneyWinners } from '@/components/DayMoneyWinners';
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
import { formatPlayerSummaryFromCompetitor } from '@/lib/espn';
import { calculateParticipantStandings, calculateDayMoneyWinners } from '@/lib/scoring';

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

  // Calculate 12-Participant Standings & Day Money Results
  const participantStandings = useMemo(() => {
    return calculateParticipantStandings(participants, competitors, contestConfig, activeEvent?.status);
  }, [participants, competitors, contestConfig, activeEvent]);

  const dayMoneyResults = useMemo(() => {
    return calculateDayMoneyWinners(participants, competitors, contestConfig, activeEvent?.status);
  }, [participants, competitors, contestConfig, activeEvent]);

  // Vercel Performance Rule: rerender-memo & js-index-maps
  const displayCompetitors = useMemo(() => {
    if (trackedPlayers.length === 0) return competitors.slice(0, 4);

    const compMap = new Map(competitors.map((c) => [c.athlete?.id || c.id, c]));

    return trackedPlayers.map((p) => {
      const match = compMap.get(p.playerId);
      if (match) return match;
      return {
        id: p.playerId,
        score: 'E',
        athlete: {
          id: p.playerId,
          displayName: p.name,
          headshot: { href: p.headshotUrl || '' },
          country: { abbreviation: p.country || '' },
        },
      } as ESPNCompetitor;
    });
  }, [competitors, trackedPlayers]);

  const selectedCompetitor = useMemo(() => {
    const compMap = new Map(competitors.map((c) => [c.athlete?.id || c.id, c]));
    return compMap.get(selectedPlayerId) || displayCompetitors[0];
  }, [competitors, selectedPlayerId, displayCompetitors]);

  // 4. Compute Hole-by-Hole Player Summary from active competitor linescores
  useEffect(() => {
    if (selectedCompetitor) {
      const summary = formatPlayerSummaryFromCompetitor(selectedCompetitor);
      setPlayerSummary(summary);
    }
  }, [selectedCompetitor]);

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
        {/* Section 1: Tracked Players Hero Summary Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              Custom Golfer Watchlist
            </h2>
            <span className="text-xs text-on-surface-variant">
              {trackedPlayers.length} Golfer(s) Tracked
            </span>
          </div>

          <TrackedPlayerHeroGrid
            trackedCompetitors={displayCompetitors}
            allCompetitors={competitors}
            eventStatus={activeEvent?.status}
            selectedPlayerId={selectedPlayerId || selectedCompetitor?.athlete?.id || selectedCompetitor?.id}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        </section>

        {/* Section 2: US Open Draft Contest - Day Money Winners */}
        <section>
          <DayMoneyWinners
            dayMoneyResults={dayMoneyResults}
            contestConfig={contestConfig}
            loading={loadingLeaderboard || participantsLoading || contestConfigLoading}
          />
        </section>

        {/* Section 3: US Open Draft Contest - Official Participant Standings */}
        <section>
          <ParticipantStandings
            standings={participantStandings}
            contestConfig={contestConfig}
            loading={loadingLeaderboard || participantsLoading || contestConfigLoading}
          />
        </section>

        {/* Section 4: Split View (60% Scorecard Matrix + 40% Live Field Leaderboard) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7/12): 18-Hole Matrix Scorecard */}
          <div className="lg:col-span-7 space-y-4">
            <ScorecardMatrix
              playerSummary={playerSummary}
              competitor={selectedCompetitor}
              eventStatus={activeEvent?.status}
              loading={loadingSummary}
              playerName={selectedCompetitor?.athlete?.displayName}
            />
          </div>

          {/* Right Column (5/12): Live Tournament Leaderboard */}
          <div className="lg:col-span-5 space-y-4">
            <LiveLeaderboard
              competitors={competitors}
              eventObj={activeEvent || undefined}
              trackedPlayerIds={trackedPlayerIds}
              onToggleTrackPlayer={handleToggleTrackPlayer}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={(id) => setSelectedPlayerId(id)}
            />
          </div>
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
