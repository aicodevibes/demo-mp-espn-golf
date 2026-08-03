'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { TrackedPlayerHeroGrid } from '@/components/TrackedPlayerHeroGrid';
import { ScorecardMatrix } from '@/components/ScorecardMatrix';
import { LiveLeaderboard } from '@/components/LiveLeaderboard';
import { AdminManagementDrawer } from '@/components/AdminManagementDrawer';
import { useAuth } from '@/context/AuthContext';
import {
  useActiveConfig,
  useTrackedPlayers,
  setActiveEvent,
  addTrackedPlayer,
  removeTrackedPlayer,
  TrackedPlayer,
} from '@/lib/firebase/firestore';
import { ESPNEvent, ESPNCompetitor, ESPNPlayerSummary } from '@/types/espn';

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

  // 2. Determine Active Event (Firestore config vs default first active event)
  const activeEventId = config?.activeEventId || (events[0]?.id || '');

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

            // Auto-select first tracked player or first field competitor
            if (comps.length > 0 && !selectedPlayerId) {
              const firstTracked = comps.find((c: ESPNCompetitor) =>
                trackedPlayers.some((p) => p.playerId === c.athlete.id)
              );
              setSelectedPlayerId(firstTracked ? firstTracked.athlete.id : comps[0].athlete.id);
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

  // 4. Fetch Hole-by-Hole Player Summary when selected player changes
  useEffect(() => {
    const targetPlayerId = selectedPlayerId || competitors[0]?.athlete.id;
    if (!activeEventId || !targetPlayerId) return;

    async function fetchPlayerSummary() {
      setLoadingSummary(true);
      try {
        const res = await fetch(
          `/api/espn/playersummary?eventId=${activeEventId}&playerId=${targetPlayerId}`
        );
        if (res.ok) {
          const data = await res.json();
          setPlayerSummary(data);
        } else {
          setPlayerSummary(null);
        }
      } catch (err) {
        console.error('Failed to fetch Player Summary:', err);
        setPlayerSummary(null);
      } finally {
        setLoadingSummary(false);
      }
    }

    fetchPlayerSummary();
  }, [activeEventId, selectedPlayerId, competitors]);


  // Tracked competitor objects matching Firestore trackedPlayers roster (or top 4 leaders if roster is empty)
  const trackedCompetitors = competitors.filter((c) =>
    trackedPlayers.some((p) => p.playerId === c.athlete.id)
  );

  const displayCompetitors = trackedCompetitors.length > 0 ? trackedCompetitors : competitors.slice(0, 4);

  const trackedPlayerIds = trackedPlayers.map((p) => p.playerId);
  const selectedCompetitor = competitors.find((c) => c.athlete.id === selectedPlayerId) || displayCompetitors[0];


  // Admin Actions
  const handleSelectEvent = async (eventId: string) => {
    await setActiveEvent(eventId, new Date().getFullYear(), user?.email || 'aicodevibes@gmail.com');
  };

  const handleToggleTrackPlayer = async (comp: ESPNCompetitor) => {
    const isTracked = trackedPlayerIds.includes(comp.athlete.id);
    if (isTracked) {
      await removeTrackedPlayer(comp.athlete.id);
    } else {
      const newPlayer: TrackedPlayer = {
        playerId: comp.athlete.id,
        name: comp.athlete.displayName,
        headshotUrl: comp.athlete.headshot?.href,
        country: comp.athlete.country?.abbreviation,
        displayOrder: trackedPlayers.length + 1,
      };
      await addTrackedPlayer(newPlayer);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Header */}
      <Header eventName={activeEvent?.name} />

      {/* Main Content Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Section 1: Tracked Players Hero Summary Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Custom Golfer Watchlist
            </h2>
            <span className="text-xs text-slate-400">
              {trackedCompetitors.length} Golfer(s) Tracked
            </span>
          </div>

          <TrackedPlayerHeroGrid
            trackedCompetitors={displayCompetitors}
            loading={loadingLeaderboard || playersLoading}
            selectedPlayerId={selectedPlayerId || selectedCompetitor?.athlete.id}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />

        </section>

        {/* Section 2: Split View (60% Scorecard Matrix + 40% Live Leaderboard) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7/12): 18-Hole Matrix Scorecard */}
          <div className="lg:col-span-7 space-y-4">
            <ScorecardMatrix
              playerSummary={playerSummary}
              loading={loadingSummary}
              playerName={selectedCompetitor?.athlete.displayName}
            />
          </div>

          {/* Right Column (5/12): Live Tournament Leaderboard */}
          <div className="lg:col-span-5 space-y-4">
            <LiveLeaderboard
              competitors={competitors}
              loading={loadingLeaderboard}
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


      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        PGA Performance Pulse • Live Data via ESPN API & Firebase App Hosting
      </footer>
    </div>
  );
}
