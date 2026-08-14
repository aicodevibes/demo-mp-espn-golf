'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  useActiveConfig,
  useContestConfig,
  useParticipants,
  setActiveEvent,
  setContestConfig,
  addParticipantToEvent,
  removeParticipantFromEvent,
  setParticipantsForEvent,
  copyRosterFromEvent,
  syncPlayersToFirestore,
  repairAndSeedPlayerDirectory,
  clearAllPlayersInFirestore,
  importAuthenticPgaCatalogToFirestore,
  saveSinglePlayerToFirestore,
  deleteEventSubtree,
} from '@/lib/firebase/firestore';
import {
  ArrowLeft,
  Settings,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Participant } from '@/types/contest';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import { parseCommaDelimitedGolfers, matchGolferInputToId } from '@/lib/espn/golferMatcher';
import { resolveEventCompetitorsWithFallback } from '@/lib/espn';
import {
  AdminEventConfigSection,
  AdminRosterSyncOperations,
  AdminParticipantRosterTable,
  AdminFourthGolferManager,
  AdminGreedyManager,
  AdminPlayerDirectoryTools,
  AdminLeaderboardInspector,
  AdminCalendarSidebar,
  AdminBatchRosterModal,
  AdminCopyRosterModal,
} from '@/components/admin';

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { config: appConfig, loading: appConfigLoading } = useActiveConfig();

  // Scoreboard Events List from ESPN
  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Selected Event ID for admin editing
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Roster Sync states
  const [syncing, setSyncing] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Copy Roster modal states
  const [sourceCopyEventId, setSourceCopyEventId] = useState<string>('');
  const [showCopyModal, setShowCopyModal] = useState<boolean>(false);

  // Batch Roster Import State
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchRosterText, setBatchRosterText] = useState<string>('');

  // Custom Golfer Inputs
  const [customGolferId, setCustomGolferId] = useState<string>('');
  const [customGolferName, setCustomGolferName] = useState<string>('');
  const [customGolferHeadshot, setCustomGolferHeadshot] = useState<string>('');

  // Form States for Event Config & Wager Pot Settings
  const [formDataName, setFormDataName] = useState('');
  const [formDataCoursePar, setFormDataCoursePar] = useState<number | ''>('');
  const [formDataEntryFee, setFormDataEntryFee] = useState<number | ''>(50);
  const [formDataMainPayoutsStr, setFormDataMainPayoutsStr] = useState('600, 320, 180, 100');
  const [formDataDayMoneyPool, setFormDataDayMoneyPool] = useState<number | ''>(75);
  const [formDataIsFinalized, setFormDataIsFinalized] = useState(false);

  // Participant Form States
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [partName, setPartName] = useState('');
  const [partGolfersInput, setPartGolfersInput] = useState('');
  const [partGolfer1, setPartGolfer1] = useState('');
  const [partGolfer2, setPartGolfer2] = useState('');
  const [partGolfer3, setPartGolfer3] = useState('');
  const [partIsGreedy, setPartIsGreedy] = useState(false);
  const [partGreedyPlayer, setPartGreedyPlayer] = useState('');

  // Live Competitors Field
  const [competitors, setCompetitors] = useState<ESPNCompetitor[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState<boolean>(false);
  const [liveSearchQuery, setLiveSearchQuery] = useState('');

  // Load PGA Calendar/Events
  useEffect(() => {
    async function fetchScoreboard() {
      setLoadingEvents(true);
      try {
        const res = await fetch('/api/espn/scoreboard');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error('Failed to fetch ESPN Scoreboard:', err);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchScoreboard();
  }, []);

  // Update selected event ID once active config or events are loaded
  const activeEventId = appConfig?.activeEventId;
  useEffect(() => {
    if (activeEventId) {
      setSelectedEventId(activeEventId);
    } else if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [activeEventId, events, selectedEventId]);

  // Load selected event details from Firestore
  const { config: selectedContestConfig } = useContestConfig(selectedEventId);
  const { participants: selectedParticipants, loading: participantsLoading } = useParticipants(selectedEventId);
  const isEventFinalized = Boolean(selectedContestConfig?.isFinalized);

  // ESPN field details for the selected event
  useEffect(() => {
    if (!selectedEventId) return;

    async function fetchEventCompetitors() {
      setLoadingCompetitors(true);
      try {
        const res = await fetch(`/api/espn/leaderboard?event=${selectedEventId}`);
        if (res.ok) {
          const data = await res.json();
          const comps = data.events?.[0]?.competitions?.[0]?.competitors || [];
          const resolved = resolveEventCompetitorsWithFallback(comps, []);
          setCompetitors(resolved);
        }
      } catch (err) {
        console.error('Failed to fetch competitors:', err);
      } finally {
        setLoadingCompetitors(false);
      }
    }
    fetchEventCompetitors();
  }, [selectedEventId]);

  // Sync form states with selected config
  useEffect(() => {
    if (selectedContestConfig) {
      setFormDataName(selectedContestConfig.eventName || '');
      setFormDataCoursePar(selectedContestConfig.coursePar ?? '');
      setFormDataIsFinalized(selectedContestConfig.isFinalized || false);
      setFormDataEntryFee(selectedContestConfig.entryFee ?? 50);
      setFormDataMainPayoutsStr(
        selectedContestConfig.mainPayouts ? selectedContestConfig.mainPayouts.join(', ') : '600, 320, 180, 100'
      );
      setFormDataDayMoneyPool(selectedContestConfig.dayMoneyPool ?? 75);
    } else {
      const matchedEvent = events.find((e) => e.id === selectedEventId);
      setFormDataName(matchedEvent?.name || '');
      setFormDataCoursePar('');
      setFormDataEntryFee(50);
      setFormDataMainPayoutsStr('600, 320, 180, 100');
      setFormDataDayMoneyPool(75);
      setFormDataIsFinalized(false);
    }
  }, [selectedContestConfig, selectedEventId, events]);

  const fieldGolfers = useMemo(() => {
    return competitors.map((c) => ({
      id: c.athlete?.id || c.id,
      name: c.athlete?.displayName || `Golfer ${c.id}`,
    }));
  }, [competitors]);

  const filteredLiveCompetitors = useMemo(() => {
    const q = liveSearchQuery.toLowerCase().trim();
    if (!q) return competitors;
    return competitors.filter((c) =>
      c.athlete?.displayName?.toLowerCase().includes(q)
    );
  }, [competitors, liveSearchQuery]);

  const getGolferNameById = (id: string) => {
    const comp = competitors.find((c) => (c.athlete?.id || c.id) === id);
    return comp?.athlete?.displayName || `Golfer (${id})`;
  };

  // Event Configuration Handlers
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setSavingConfig(true);
    try {
      const parsedPayouts = formDataMainPayoutsStr
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      await setContestConfig(
        selectedEventId,
        {
          eventName: formDataName,
          entryFee: formDataEntryFee === '' ? 50 : Number(formDataEntryFee),
          mainPayouts: parsedPayouts.length > 0 ? parsedPayouts : [600, 320, 180, 100],
          dayMoneyPool: formDataDayMoneyPool === '' ? 75 : Number(formDataDayMoneyPool),
          coursePar: formDataCoursePar === '' ? null : Number(formDataCoursePar),
          isFinalized: formDataIsFinalized,
          season: new Date().getFullYear(),
        },
        user?.email || 'admin@demo-mp.com'
      );
      alert('Event configuration and pot settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save event configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSetActive = async () => {
    if (!selectedEventId) return;
    setSavingConfig(true);
    try {
      await setActiveEvent(
        selectedEventId,
        new Date().getFullYear(),
        user?.email || 'admin@demo-mp.com'
      );
      alert(`Event ${selectedEventId} set as active!`);
    } catch (err) {
      console.error(err);
      alert('Failed to set active event.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventId) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }
    if (!confirm('Are you sure you want to delete this event and all associated participants? This action cannot be undone.')) {
      return;
    }
    setSavingConfig(true);
    try {
      await deleteEventSubtree(selectedEventId);
      alert('Event deleted successfully.');
      if (events.length > 0) {
        setSelectedEventId(events[0].id);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete event.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Roster & Sync Handlers
  const handleCopyRosterFromEvent = async () => {
    if (!sourceCopyEventId || !selectedEventId) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }
    if (sourceCopyEventId === selectedEventId) {
      alert('Please select a different source event to copy from.');
      return;
    }
    setSyncing(true);
    try {
      await copyRosterFromEvent(sourceCopyEventId, selectedEventId);
      setShowCopyModal(false);
      alert('Participant names copied cleanly with reset picks and payments!');
    } catch (err) {
      console.error('Failed to copy roster from event:', err);
      alert('Failed to copy roster from selected event.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSeedDefaultNames = async () => {
    if (!selectedEventId) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }
    if (!confirm('This will seed the 12 default participants. Continue?')) return;
    setSyncing(true);
    try {
      const defaultNames = [
        'Pat', 'Greg', 'Dereck', 'Robbie', 'Clay', 'Billy Fred',
        'Roby', 'Garis', 'Bruce', 'Jim', 'Cole', 'Scott',
      ];
      const initialParticipants: Participant[] = defaultNames.map((name) => ({
        id: `p-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        draftedPlayerIds: [],
        isGreedyParticipant: false,
        greedyPlayerId: '',
      }));

      await setParticipantsForEvent(selectedEventId, initialParticipants);
      alert('12 default participants seeded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to seed participants.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoAssignRosters = async () => {
    if (!selectedEventId || selectedParticipants.length === 0) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }
    if (!confirm('This will auto-assign 3 unique golfers from the field to every participant. Continue?')) {
      return;
    }

    setSyncing(true);
    try {
      const availableIds = [...fieldGolfers.map((g) => g.id)];
      const shuffled = availableIds.sort(() => 0.5 - Math.random());

      let idx = 0;
      const updatedParticipants: Participant[] = selectedParticipants.map((p) => {
        const picks: string[] = [];
        for (let i = 0; i < 3; i++) {
          if (idx < shuffled.length) {
            picks.push(shuffled[idx]);
            idx++;
          }
        }
        return {
          ...p,
          draftedPlayerIds: picks,
        };
      });

      await setParticipantsForEvent(selectedEventId, updatedParticipants);
      alert('Auto-assigned field golfers to all participants!');
    } catch (err) {
      console.error(err);
      alert('Failed to auto-assign rosters.');
    } finally {
      setSyncing(false);
    }
  };

  const handleResetRosters = async () => {
    if (!selectedEventId) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }
    if (!confirm('Are you sure you want to CLEAR all drafted golfer picks for all participants?')) return;
    setSyncing(true);
    try {
      const resetParticipants = selectedParticipants.map((p) => ({
        ...p,
        draftedPlayerIds: [],
      }));
      await setParticipantsForEvent(selectedEventId, resetParticipants);
      alert('All rosters cleared!');
    } catch (err) {
      console.error(err);
      alert('Failed to reset rosters.');
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchLatestScores = async () => {
    if (!selectedEventId) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/espn/leaderboard?event=${selectedEventId}`);
      if (res.ok) {
        const data = await res.json();
        const rawComps = data.events?.[0]?.competitions?.[0]?.competitors || [];
        const resolvedComps = resolveEventCompetitorsWithFallback(rawComps, []);
        await syncPlayersToFirestore(resolvedComps);
        setCompetitors(resolvedComps);
        alert('Scores synced to Firestore successfully!');
      } else {
        alert('Error fetching latest leaderboard.');
      }
    } catch (err) {
      console.error(err);
      alert('Scores sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  // Directory Database Tools Handlers
  const handleRepairPlayerDirectory = async () => {
    try {
      setSyncing(true);
      const { cleanedCount, seededCount } = await repairAndSeedPlayerDirectory();
      alert(`Player Directory & Headshots repaired successfully! Cleaned ${cleanedCount} legacy records and updated ${seededCount} authentic PGA player entries.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to repair player directory:', err);
      alert(`Failed to repair player directory: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearPlayersDatabase = async () => {
    if (!window.confirm('Are you sure you want to CLEAR all stored players from the database?')) {
      return;
    }
    try {
      setSyncing(true);
      const count = await clearAllPlayersInFirestore();
      alert(`Successfully cleared ${count} player document(s) from the Firestore database.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to clear players database:', err);
      alert(`Error clearing players database: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleImportPgaCatalog = async () => {
    try {
      setSyncing(true);
      const count = await importAuthenticPgaCatalogToFirestore();
      alert(`Successfully loaded fresh authentic catalog with ${count} PGA Tour player entries into the database.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to import PGA player catalog:', err);
      alert(`Error loading PGA player catalog: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveCustomGolfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGolferId || !customGolferName) {
      alert('Please enter both Player ID and Player Name.');
      return;
    }
    try {
      setSyncing(true);
      await saveSinglePlayerToFirestore({
        id: customGolferId,
        name: customGolferName,
        headshotUrl: customGolferHeadshot,
      });
      alert(`Saved golfer "${customGolferName}" (ID: ${customGolferId}) to database successfully!`);
      setCustomGolferId('');
      setCustomGolferName('');
      setCustomGolferHeadshot('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to save custom golfer:', err);
      alert(`Error saving golfer: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  // Participant Form Handlers
  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }
    if (!partName.trim()) {
      alert('Name is required.');
      return;
    }

    let draftIds: string[] = [];
    if (partGolfersInput.trim()) {
      const parsedGolfers = parseCommaDelimitedGolfers(partGolfersInput, competitors);
      draftIds = parsedGolfers.map((g) => g.matchedId).filter((id): id is string => Boolean(id));
    } else {
      draftIds = [partGolfer1, partGolfer2, partGolfer3].filter(Boolean);
    }

    const participantData: Participant = {
      id: editingParticipant?.id || `p-${partName.toLowerCase().trim().replace(/\s+/g, '-')}`,
      name: partName.trim(),
      draftedPlayerIds: draftIds,
      isGreedyParticipant: partIsGreedy,
      greedyPlayerId: partIsGreedy
        ? (partGreedyPlayer ? (matchGolferInputToId(competitors, partGreedyPlayer) || partGreedyPlayer) : '')
        : '',
    };

    try {
      await addParticipantToEvent(selectedEventId, participantData);
      setEditingParticipant(null);
      setPartName('');
      setPartGolfersInput('');
      setPartGolfer1('');
      setPartGolfer2('');
      setPartGolfer3('');
      setPartIsGreedy(false);
      setPartGreedyPlayer('');
    } catch (err) {
      console.error(err);
      alert('Failed to save participant.');
    }
  };

  const handleProcessBatchRosters = async () => {
    if (!selectedEventId || !batchRosterText.trim()) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }
    setSyncing(true);
    try {
      const lines = batchRosterText.split('\n').filter((l) => l.trim());
      const updatedParticipants: Participant[] = lines.map((line) => {
        const colonIdx = line.indexOf(':');
        let name = '';
        let golfersStr = line;
        if (colonIdx !== -1) {
          name = line.substring(0, colonIdx).trim();
          golfersStr = line.substring(colonIdx + 1).trim();
        } else {
          name = `Participant ${Math.floor(Math.random() * 1000)}`;
        }

        const parsed = parseCommaDelimitedGolfers(golfersStr, competitors);
        const draftIds = parsed.map((p) => p.matchedId).filter((id): id is string => Boolean(id));

        return {
          id: `p-${name.toLowerCase().replace(/\s+/g, '-')}`,
          name,
          draftedPlayerIds: draftIds,
          isGreedyParticipant: false,
          greedyPlayerId: '',
        };
      });

      await setParticipantsForEvent(selectedEventId, updatedParticipants);
      setShowBatchModal(false);
      setBatchRosterText('');
      alert(`Batch imported ${updatedParticipants.length} participant rosters successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to batch import rosters.');
    } finally {
      setSyncing(false);
    }
  };

  const startEditParticipant = (p: Participant) => {
    setEditingParticipant(p);
    setPartName(p.name);
    const golferNames = p.draftedPlayerIds.map((id) => getGolferNameById(id));
    setPartGolfersInput(golferNames.join(', '));
    setPartGolfer1(p.draftedPlayerIds[0] || '');
    setPartGolfer2(p.draftedPlayerIds[1] || '');
    setPartGolfer3(p.draftedPlayerIds[2] || '');
    setPartIsGreedy(p.isGreedyParticipant || false);
    setPartGreedyPlayer(p.greedyPlayerId || '');
  };

  const handleCancelEditParticipant = () => {
    setEditingParticipant(null);
    setPartName('');
    setPartGolfersInput('');
    setPartGolfer1('');
    setPartGolfer2('');
    setPartGolfer3('');
    setPartIsGreedy(false);
    setPartGreedyPlayer('');
  };

  const handleDeleteParticipant = async (pId: string) => {
    if (!selectedEventId) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }

    if (!confirm('Are you sure you want to remove this participant?')) return;
    try {
      await removeParticipantFromEvent(selectedEventId, pId);
    } catch (err) {
      console.error(err);
      alert('Failed to remove participant.');
    }
  };

  const handleTogglePayment = async (p: Participant) => {
    if (!selectedEventId) return;
    if (isEventFinalized) {
      alert('This tournament event is finalized and locked in read-only mode.');
      return;
    }
    try {
      const updated = {
        ...p,
        hasPaidEntry: !p.hasPaidEntry,
      };
      await addParticipantToEvent(selectedEventId, updated);
    } catch (err) {
      console.error(err);
      alert('Failed to update payment status.');
    }
  };

  const handleFourthGolferSelect = async (p: Participant, playerId: string) => {
    if (!selectedEventId) return;
    try {
      const newDrafted = [...p.draftedPlayerIds.slice(0, 3)];
      if (playerId) {
        newDrafted[3] = playerId;
      }
      const updated: Participant = {
        ...p,
        draftedPlayerIds: newDrafted,
      };
      await addParticipantToEvent(selectedEventId, updated);
    } catch (err) {
      console.error(err);
      alert('Failed to update 4th golfer assignment.');
    }
  };

  const handleGreedySelect = async (p: Participant, playerId: string) => {
    if (!selectedEventId) return;
    try {
      const updated = {
        ...p,
        greedyPlayerId: playerId,
        isGreedyParticipant: true,
      };
      await addParticipantToEvent(selectedEventId, updated);
    } catch (err) {
      console.error(err);
      alert('Failed to update greedy assignment.');
    }
  };

  // Loading Check
  if (authLoading || appConfigLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-outline-variant border-t-tertiary rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Unauthenticated Visitor -> Render Admin Sign-In Portal
  if (!user) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center border border-tertiary/30">
            <ShieldCheck className="w-8 h-8 text-tertiary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Admin Access Portal</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Sign in with your authorized admin Google account to manage tournament configurations, participant rosters, and payout settings.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => signInWithGoogle()}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-bold text-sm shadow-md transition cursor-pointer"
            >
              <LogIn className="w-5 h-5 text-white" /> Sign In with Google
            </button>

            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => signInWithGoogle()}
                className="w-full text-xs font-semibold py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant border border-outline-variant transition cursor-pointer"
              >
                ⚡ Dev Quick Login (aicodevibes@gmail.com)
              </button>
            )}
          </div>

          <div className="border-t border-outline-variant/60 pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Tournament Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Logged In Non-Admin User -> Render Access Denied Card
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center border border-error/30">
            <ShieldAlert className="w-8 h-8 text-error" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Access Denied</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Signed in as <span className="font-semibold text-on-surface">{user.email}</span>. This Google account does not have admin privileges.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-sm border border-outline-variant transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-on-surface" /> Sign Out & Switch Account
            </button>
          </div>

          <div className="border-t border-outline-variant/60 pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Tournament Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-surface-container-low border-b border-outline-variant py-4 px-6 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <span className="text-outline-variant">|</span>
          <h1 className="text-base font-extrabold uppercase tracking-widest text-on-surface flex items-center gap-2">
            <Settings className="w-5 h-5 text-tertiary" /> Pool Admin Panel
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Logged in as: {user.email}</span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column: Config, Seeding, Participants List (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* FINALIZED LOCK BANNER */}
          {isEventFinalized && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>This tournament event is finalized and locked in read-only mode. Uncheck &apos;Finalize Standings&apos; below to enable editing.</span>
              </div>
            </div>
          )}

          {/* SECTION 1: EVENT CONFIGURATION */}
          <AdminEventConfigSection
            events={events}
            loadingEvents={loadingEvents}
            selectedEventId={selectedEventId}
            activeEventId={activeEventId || ''}
            isEventFinalized={isEventFinalized}
            savingConfig={savingConfig}
            formDataName={formDataName}
            formDataCoursePar={formDataCoursePar}
            formDataEntryFee={formDataEntryFee}
            formDataDayMoneyPool={formDataDayMoneyPool}
            formDataMainPayoutsStr={formDataMainPayoutsStr}
            formDataIsFinalized={formDataIsFinalized}
            onSelectEvent={(id) => setSelectedEventId(id)}
            onChangeName={(name) => setFormDataName(name)}
            onChangeCoursePar={(par) => setFormDataCoursePar(par)}
            onChangeEntryFee={(fee) => setFormDataEntryFee(fee)}
            onChangeDayMoneyPool={(pool) => setFormDataDayMoneyPool(pool)}
            onChangeMainPayoutsStr={(payouts) => setFormDataMainPayoutsStr(payouts)}
            onChangeIsFinalized={(fin) => setFormDataIsFinalized(fin)}
            onSaveConfig={handleSaveConfig}
            onSetActive={handleSetActive}
            onDeleteEvent={handleDeleteEvent}
            onOpenCopyModal={() => setShowCopyModal(true)}
          />

          {/* SECTION 2: ROSTER SEEDING & SCORE SYNC */}
          <AdminRosterSyncOperations
            selectedEventId={selectedEventId}
            isEventFinalized={isEventFinalized}
            syncing={syncing}
            eventsCount={events.length}
            participantsCount={selectedParticipants.length}
            onOpenBatchModal={() => setShowBatchModal(true)}
            onOpenCopyModal={() => setShowCopyModal(true)}
            onSeedDefaultNames={handleSeedDefaultNames}
            onAutoAssignRosters={handleAutoAssignRosters}
            onResetRosters={handleResetRosters}
            onFetchLatestScores={handleFetchLatestScores}
            onRepairPlayerDirectory={handleRepairPlayerDirectory}
          />

          {/* SECTION 3: PLAYER DIRECTORY & HEADSHOT DATABASE CONTROL */}
          <AdminPlayerDirectoryTools
            syncing={syncing}
            customGolferId={customGolferId}
            customGolferName={customGolferName}
            customGolferHeadshot={customGolferHeadshot}
            onChangeCustomGolferId={(id) => setCustomGolferId(id)}
            onChangeCustomGolferName={(name) => setCustomGolferName(name)}
            onChangeCustomGolferHeadshot={(url) => setCustomGolferHeadshot(url)}
            onClearPlayersDatabase={handleClearPlayersDatabase}
            onImportPgaCatalog={handleImportPgaCatalog}
            onRepairPlayerDirectory={handleRepairPlayerDirectory}
            onSaveCustomGolfer={handleSaveCustomGolfer}
          />

          {/* SECTION 4: MAIN PARTICIPANTS LIST */}
          <AdminParticipantRosterTable
            selectedParticipants={selectedParticipants}
            participantsLoading={participantsLoading}
            isEventFinalized={isEventFinalized}
            fieldGolfers={fieldGolfers}
            competitors={competitors}
            editingParticipant={editingParticipant}
            partName={partName}
            partGolfersInput={partGolfersInput}
            partGolfer1={partGolfer1}
            partGolfer2={partGolfer2}
            partGolfer3={partGolfer3}
            partIsGreedy={partIsGreedy}
            partGreedyPlayer={partGreedyPlayer}
            getGolferNameById={getGolferNameById}
            onChangeName={(name) => setPartName(name)}
            onChangeGolfersInput={(input) => setPartGolfersInput(input)}
            onChangeGolfer1={(id) => setPartGolfer1(id)}
            onChangeGolfer2={(id) => setPartGolfer2(id)}
            onChangeGolfer3={(id) => setPartGolfer3(id)}
            onChangeIsGreedy={(isGreedy) => setPartIsGreedy(isGreedy)}
            onChangeGreedyPlayer={(id) => setPartGreedyPlayer(id)}
            onSaveParticipant={handleSaveParticipant}
            onCancelEdit={handleCancelEditParticipant}
            onStartEdit={startEditParticipant}
            onDeleteParticipant={handleDeleteParticipant}
            onTogglePayment={handleTogglePayment}
          />

          {/* SECTION 5: 4TH GOLFER POST-CUT ASSIGNMENT INTERFACE */}
          <AdminFourthGolferManager
            selectedParticipants={selectedParticipants}
            competitors={competitors}
            fieldGolfers={fieldGolfers}
            getGolferNameById={getGolferNameById}
            onFourthGolferSelect={handleFourthGolferSelect}
          />

          {/* SECTION 6: GREEDY GAME PARTICIPANTS */}
          <AdminGreedyManager
            selectedParticipants={selectedParticipants}
            fieldGolfers={fieldGolfers}
            onGreedySelect={handleGreedySelect}
          />

          {/* SECTION 7: LIVE PLAYER SCORES */}
          <AdminLeaderboardInspector
            loadingCompetitors={loadingCompetitors}
            filteredLiveCompetitors={filteredLiveCompetitors}
            selectedContestConfig={selectedContestConfig}
            liveSearchQuery={liveSearchQuery}
            onChangeLiveSearchQuery={(q) => setLiveSearchQuery(q)}
          />
        </div>

        {/* Right Sidebar: PGA Tour Scoreboard Calendar Quick Select (4 cols) */}
        <AdminCalendarSidebar
          events={events}
          loadingEvents={loadingEvents}
          activeEventId={activeEventId || ''}
          selectedEventId={selectedEventId}
          onSelectEvent={(id) => setSelectedEventId(id)}
        />
      </main>

      {/* Batch Paste Rosters Modal */}
      <AdminBatchRosterModal
        isOpen={showBatchModal}
        syncing={syncing}
        batchRosterText={batchRosterText}
        onChangeBatchRosterText={(text) => setBatchRosterText(text)}
        onClose={() => setShowBatchModal(false)}
        onProcessBatchRosters={handleProcessBatchRosters}
      />

      {/* Copy Roster from Past Event Modal */}
      <AdminCopyRosterModal
        isOpen={showCopyModal}
        syncing={syncing}
        events={events}
        selectedEventId={selectedEventId}
        sourceCopyEventId={sourceCopyEventId}
        onChangeSourceCopyEventId={(id) => setSourceCopyEventId(id)}
        onClose={() => setShowCopyModal(false)}
        onCopyRoster={handleCopyRosterFromEvent}
      />
    </div>
  );
}
