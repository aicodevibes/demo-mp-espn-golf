'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  syncPlayersToFirestore,
} from '@/lib/firebase/firestore';
import {
  ArrowLeft,
  Save,
  Trash2,
  Settings,
  UserPlus,
  RefreshCw,
  Search,
  Award,
  Trophy,
  Check,
  Plus,
  X,
  Star,
  Users,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';
import { getGolferRoundScoreToPar } from '@/lib/scoring';
import { doc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { parseCommaDelimitedGolfers, matchGolferInputToId } from '@/lib/espn/golferMatcher';

const ADMIN_EMAILS = ['aicodevibes@gmail.com'];

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();

  const { config: appConfig, loading: appConfigLoading } = useActiveConfig();

  // Scoreboard Events List from ESPN
  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Selected Event ID for admin editing (defaults to activeEventId or first event in scoreboard)
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Roster Sync states
  const [syncing, setSyncing] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

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
  }, [activeEventId, events]);

  // Load selected event details from Firestore
  const { config: selectedContestConfig, loading: configLoading } = useContestConfig(selectedEventId);
  const { participants: selectedParticipants, loading: participantsLoading } = useParticipants(selectedEventId);

  // ESPN field details for the selected event
  const [competitors, setCompetitors] = useState<ESPNCompetitor[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedEventId) return;

    async function fetchEventCompetitors() {
      setLoadingCompetitors(true);
      try {
        const res = await fetch(`/api/espn/leaderboard?event=${selectedEventId}`);
        if (res.ok) {
          const data = await res.json();
          const comps = data.events?.[0]?.competitions?.[0]?.competitors || [];
          setCompetitors(comps);
        }
      } catch (err) {
        console.error('Failed to fetch competitors:', err);
      } finally {
        setLoadingCompetitors(false);
      }
    }
    fetchEventCompetitors();
  }, [selectedEventId]);

  // Form States for Event Config & Wager Pot Settings
  const [formDataName, setFormDataName] = useState('');
  const [formDataStartDate, setFormDataStartDate] = useState('');
  const [formDataEndDate, setFormDataEndDate] = useState('');
  const [formDataCoursePar, setFormDataCoursePar] = useState<number | ''>('');
  const [formDataEntryFee, setFormDataEntryFee] = useState<number | ''>(50);
  const [formDataMainPayoutsStr, setFormDataMainPayoutsStr] = useState('600, 320, 180, 100');
  const [formDataDayMoneyPool, setFormDataDayMoneyPool] = useState<number | ''>(75);
  const [formDataIsFinalized, setFormDataIsFinalized] = useState(false);

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
      // Try to find the event in scoreboard to prepopulate dates if empty
      const matchedEvent = events.find((e) => e.id === selectedEventId);
      if (matchedEvent) {
        setFormDataStartDate(matchedEvent.date?.split('T')[0] || '');
        setFormDataEndDate(matchedEvent.date?.split('T')[0] || '');
      }
    } else {
      const matchedEvent = events.find((e) => e.id === selectedEventId);
      setFormDataName(matchedEvent?.name || '');
      setFormDataStartDate(matchedEvent?.date?.split('T')[0] || '');
      setFormDataEndDate(matchedEvent?.date?.split('T')[0] || '');
      setFormDataCoursePar('');
      setFormDataEntryFee(50);
      setFormDataMainPayoutsStr('600, 320, 180, 100');
      setFormDataDayMoneyPool(75);
      setFormDataIsFinalized(false);
    }
  }, [selectedContestConfig, selectedEventId, events]);

  // Add / Edit Participant Form States
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [partName, setPartName] = useState('');
  const [partGolfersInput, setPartGolfersInput] = useState('');
  const [partGolfer1, setPartGolfer1] = useState('');
  const [partGolfer2, setPartGolfer2] = useState('');
  const [partGolfer3, setPartGolfer3] = useState('');
  const [partIsGreedy, setPartIsGreedy] = useState(false);
  const [partGreedyPlayer, setPartGreedyPlayer] = useState('');

  // Search filter for golfer picks
  const [golferSearch, setGolferSearch] = useState('');

  const fieldGolfers = useMemo(() => {
    return competitors.map((c) => ({
      id: c.athlete?.id || c.id,
      name: c.athlete?.displayName || `Golfer ${c.id}`,
    }));
  }, [competitors]);

  const filteredFieldGolfers = useMemo(() => {
    const q = golferSearch.toLowerCase().trim();
    if (!q) return fieldGolfers;
    return fieldGolfers.filter((g) => g.name.toLowerCase().includes(q));
  }, [fieldGolfers, golferSearch]);

  // Handle Event Config Save
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

  // Toggle Participant Payment Checkmark
  const handleTogglePayment = async (p: Participant) => {
    if (!selectedEventId) return;
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

  // Set Event as Active
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

  // Delete Event Subtree
  const handleDeleteEvent = async () => {
    if (!selectedEventId) return;
    if (!confirm('Are you sure you want to delete this event and all associated participants? This action cannot be undone.')) {
      return;
    }
    setSavingConfig(true);
    try {
      const batch = writeBatch(db);
      // delete contestConfig
      const configRef = doc(db, 'events', selectedEventId, 'contestConfig', 'default');
      batch.delete(configRef);
      // delete participants
      const participantsRef = collection(db, 'events', selectedEventId, 'participants');
      const snap = await getDocs(participantsRef);
      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      alert('Event deleted successfully.');
      // Reload page or select first available event
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

  // Seeding: Seed 12 standard names
  const handleSeedDefaultNames = async () => {
    if (!selectedEventId) return;
    if (!confirm('This will seed the 12 default participants. Continue?')) return;
    setSyncing(true);
    try {
      const defaultNames = [
        'Pat',
        'Greg',
        'Dereck',
        'Robbie',
        'Clay',
        'Billy Fred',
        'Roby',
        'Garis',
        'Bruce',
        'Jim',
        'Cole',
        'Scott',
      ];
      const participants: Participant[] = defaultNames.map((name) => ({
        id: `p-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        draftedPlayerIds: [],
        isGreedyParticipant: false,
        greedyPlayerId: '',
      }));
      await setParticipantsForEvent(selectedEventId, participants);
      alert('Seeded 12 participants successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to seed participants.');
    } finally {
      setSyncing(false);
    }
  };

  // Reset rosters
  const handleResetRosters = async () => {
    if (!selectedEventId) return;
    if (!confirm('Reset all rosters? This clears all participants for this event.')) return;
    setSyncing(true);
    try {
      await setParticipantsForEvent(selectedEventId, []);
      alert('Rosters reset completed.');
    } catch (err) {
      console.error(err);
      alert('Reset failed.');
    } finally {
      setSyncing(false);
    }
  };

  // Mock auto-assign rosters
  const handleAutoAssignRosters = async () => {
    if (!selectedEventId) return;
    if (competitors.length < 36) {
      alert('Not enough competitors in the tournament field to assign 3 unique players to 12 participants.');
      return;
    }
    if (!confirm('This will auto-assign 3 unique golfers from the current ESPN field to each of the 12 participants. Continue?')) {
      return;
    }
    setSyncing(true);
    try {
      const shuffledGolfers = [...fieldGolfers].sort(() => 0.5 - Math.random());
      const updatedParticipants = selectedParticipants.map((p, idx) => {
        const startIndex = idx * 3;
        const draftedPlayerIds = shuffledGolfers.slice(startIndex, startIndex + 3).map((g) => g.id);
        return {
          ...p,
          draftedPlayerIds,
        };
      });
      await setParticipantsForEvent(selectedEventId, updatedParticipants);
      alert('Auto-assigned 3 unique field golfers to all participants!');
    } catch (err) {
      console.error(err);
      alert('Auto-assignment failed.');
    } finally {
      setSyncing(false);
    }
  };

  // Fetch Scores manual sync
  const handleFetchLatestScores = async () => {
    if (!selectedEventId) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/espn/leaderboard?event=${selectedEventId}`);
      if (res.ok) {
        const data = await res.json();
        const comps = data.events?.[0]?.competitions?.[0]?.competitors || [];
        await syncPlayersToFirestore(comps);
        setCompetitors(comps);
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

  // Save Add/Edit Participant Form
  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
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

  // Batch Roster Import State & Function
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRosterText, setBatchRosterText] = useState('');

  const handleProcessBatchRosters = async () => {
    if (!selectedEventId || !batchRosterText.trim()) return;
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

  // Trigger Edit Mode
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

  // Delete Participant
  const handleDeleteParticipant = async (pId: string) => {
    if (!selectedEventId) return;
    if (!confirm('Are you sure you want to remove this participant?')) return;
    try {
      await removeParticipantFromEvent(selectedEventId, pId);
    } catch (err) {
      console.error(err);
      alert('Failed to remove participant.');
    }
  };

  // Auto-Save Greedy Pick on Dropdown Change
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

  // Lookup Golfer Name
  const getGolferNameById = (id: string) => {
    const comp = competitors.find((c) => (c.athlete?.id || c.id) === id);
    return comp?.athlete?.displayName || `Golfer (${id})`;
  };

  // Filter Live competitor rows
  const [liveSearchQuery, setLiveSearchQuery] = useState('');
  const filteredLiveCompetitors = useMemo(() => {
    const q = liveSearchQuery.toLowerCase().trim();
    if (!q) return competitors;
    return competitors.filter((c) =>
      c.athlete?.displayName?.toLowerCase().includes(q)
    );
  }, [competitors, liveSearchQuery]);

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
          {/* SECTION 1: EVENT CONFIGURATION */}
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                Event Selection & Config
              </h2>
              {selectedEventId === activeEventId && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-tertiary/10 border border-tertiary/30 px-2 py-0.5 rounded text-tertiary">
                  <Star className="w-3 h-3 fill-tertiary" /> Active Event
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Select Calendar Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-outline"
                >
                  {loadingEvents ? (
                    <option>Loading PGA Calendar...</option>
                  ) : (
                    events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.date ? new Date(e.date).toLocaleDateString() : 'N/A'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4 col-span-1 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant">Event Name Override</label>
                    <input
                      type="text"
                      value={formDataName}
                      onChange={(e) => setFormDataName(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-outline"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant">Course Par (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 70, 71, 72"
                      value={formDataCoursePar}
                      onChange={(e) =>
                        setFormDataCoursePar(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-outline"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant">Entry Fee per Participant ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50, 100"
                      value={formDataEntryFee}
                      onChange={(e) =>
                        setFormDataEntryFee(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-outline"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant">Day Money Pool per Round ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 75, 100"
                      value={formDataDayMoneyPool}
                      onChange={(e) =>
                        setFormDataDayMoneyPool(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-outline"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-on-surface-variant">Main Payout Breakdown (Comma-Delimited for 1st, 2nd, 3rd...)</label>
                    <input
                      type="text"
                      placeholder="e.g. 600, 320, 180, 100"
                      value={formDataMainPayoutsStr}
                      onChange={(e) => setFormDataMainPayoutsStr(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono text-on-surface outline-none focus:border-outline"
                    />
                  </div>

                  {/* Finalize Checkbox */}
                  <div className="flex items-center gap-2 md:col-span-2 pt-2">
                    <input
                      type="checkbox"
                      id="isFinalizedCheckbox"
                      checked={formDataIsFinalized}
                      onChange={(e) => setFormDataIsFinalized(e.target.checked)}
                      className="rounded border-outline-variant bg-surface text-primary focus:ring-primary w-4 h-4"
                    />
                    <label htmlFor="isFinalizedCheckbox" className="text-xs font-bold text-on-surface cursor-pointer select-none">
                      Finalize Standings & Payouts (Hides overall payouts on dashboard until checked)
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="inline-flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary/95 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> Save Configuration
                  </button>

                  <button
                    type="button"
                    onClick={handleSetActive}
                    disabled={savingConfig || selectedEventId === activeEventId}
                    className="inline-flex items-center gap-1.5 bg-tertiary text-on-tertiary hover:bg-tertiary/95 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    <Star className="w-4 h-4" /> Set as Active Event
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    disabled={savingConfig}
                    className="inline-flex items-center gap-1.5 bg-red-600/10 text-red-600 hover:bg-red-600/15 border border-red-500/20 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 ml-auto"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Event
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* SECTION 2 & 3: ROSTER SEEDING & SCORE SYNC */}
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-5 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface border-b border-outline-variant/60 pb-3">
              Roster & Sync Operations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seeding & Reset Column */}
              <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/60 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-on-surface">Participant Seeding</h3>
                  <p className="text-[11px] text-on-surface-variant">Initialize names or clear rosters</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowBatchModal(true)}
                    disabled={syncing}
                    className="inline-flex items-center gap-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
                  >
                    📋 Batch Paste Rosters
                  </button>

                  <button
                    onClick={handleSeedDefaultNames}
                    disabled={syncing}
                    className="inline-flex items-center gap-1 bg-secondary text-on-secondary hover:bg-secondary/95 text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
                  >
                    <Users className="w-3.5 h-3.5" /> Seed Default Names
                  </button>

                  <button
                    onClick={handleAutoAssignRosters}
                    disabled={syncing || selectedParticipants.length === 0}
                    className="inline-flex items-center gap-1 bg-tertiary text-on-tertiary hover:bg-tertiary/95 text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Auto-Assign Field Golfers
                  </button>

                  <button
                    onClick={handleResetRosters}
                    disabled={syncing}
                    className="inline-flex items-center gap-1 bg-red-600/10 text-red-600 border border-red-500/20 hover:bg-red-600/15 text-[11px] font-bold px-3 py-2 rounded transition disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Reset Rosters
                  </button>
                </div>
              </div>

              {/* Sync Column */}
              <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/60 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-on-surface">ESPN Scores Sync</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Syncs scores for ESPN tournament ID: <code className="font-mono bg-surface-container-high px-1 rounded">{selectedEventId}</code>
                  </p>
                </div>
                <div>
                  <button
                    onClick={handleFetchLatestScores}
                    disabled={syncing}
                    className="inline-flex items-center gap-1 bg-tertiary text-on-tertiary hover:bg-tertiary/95 text-[11px] font-bold px-4 py-2 rounded transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Fetch Latest Scores'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: MAIN PARTICIPANTS LIST */}
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface border-b border-outline-variant/60 pb-3 flex justify-between items-center">
              <span>Main Rosters</span>
              <span className="text-xs text-on-surface-variant font-bold normal-case">
                {selectedParticipants.length} Participant(s)
              </span>
            </h2>

            {/* Add / Edit Form Box */}
            <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/60 space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-tertiary flex items-center gap-1">
                  <UserPlus className="w-4 h-4" />
                  {editingParticipant ? `Edit Participant: ${editingParticipant.name}` : 'Add Participant'}
                </h3>
                {editingParticipant && (
                  <button
                    onClick={() => {
                      setEditingParticipant(null);
                      setPartName('');
                      setPartGolfer1('');
                      setPartGolfer2('');
                      setPartGolfer3('');
                      setPartIsGreedy(false);
                      setPartGreedyPlayer('');
                    }}
                    className="text-xs font-bold text-on-surface-variant hover:text-on-surface flex items-center gap-0.5"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveParticipant} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Participant Name */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant">Participant Name</label>
                    <input
                      type="text"
                      placeholder="Enter participant name"
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                      required
                    />
                  </div>

                  {/* Comma-delimited drafted golfers input */}
                  <div className="md:col-span-8 space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-on-surface-variant">
                        Drafted Golfers (Comma-Delimited Names or IDs)
                      </label>
                      <span className="text-[10px] text-tertiary font-bold">
                        Supports 3 or 4 golfers (Days 3 & 4 cut replacements)
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Scottie Scheffler, Rory McIlroy, Ludvig Aberg, Xander Schauffele"
                      value={partGolfersInput}
                      onChange={(e) => setPartGolfersInput(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline font-mono"
                    />
                  </div>

                  {/* Live Matched Golfers Chips */}
                  {partGolfersInput.trim() && (
                    <div className="md:col-span-12 bg-surface-container-high/40 border border-outline-variant/60 rounded-lg p-2.5 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                        Live Golfer Resolution Preview:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {parseCommaDelimitedGolfers(partGolfersInput, competitors).map((g, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                              g.matchedId
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <span className="text-[10px] font-bold opacity-70">#{idx + 1}</span>
                            <span>{g.competitor?.athlete?.displayName || g.rawInput}</span>
                            {g.matchedId ? (
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">✓ Matched</span>
                            ) : (
                              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">⚠️ Unrecognized</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback Dropdown Selectors (if text box is empty) */}
                  {!partGolfersInput.trim() && (
                    <>
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant">Golfer 1</label>
                        <select
                          value={partGolfer1}
                          onChange={(e) => setPartGolfer1(e.target.value)}
                          className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                        >
                          <option value="">-- Choose Golfer 1 --</option>
                          {fieldGolfers.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant">Golfer 2</label>
                        <select
                          value={partGolfer2}
                          onChange={(e) => setPartGolfer2(e.target.value)}
                          className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                        >
                          <option value="">-- Choose Golfer 2 --</option>
                          {fieldGolfers.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant">Golfer 3</label>
                        <select
                          value={partGolfer3}
                          onChange={(e) => setPartGolfer3(e.target.value)}
                          className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                        >
                          <option value="">-- Choose Golfer 3 --</option>
                          {fieldGolfers.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Greedy Toggle & Player Picker */}
                  <div className="md:col-span-6 flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="greedyCheckbox"
                      checked={partIsGreedy}
                      onChange={(e) => setPartIsGreedy(e.target.checked)}
                      className="rounded border-outline-variant bg-surface text-primary focus:ring-primary w-4 h-4"
                    />
                    <label htmlFor="greedyCheckbox" className="text-xs font-bold text-on-surface cursor-pointer select-none">
                      Greedy Side-Game Player?
                    </label>
                  </div>

                  {partIsGreedy && (
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant">Greedy Golfer</label>
                      <select
                        value={partGreedyPlayer}
                        onChange={(e) => setPartGreedyPlayer(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-outline"
                      >
                        <option value="">-- Choose Greedy Golfer --</option>
                        {fieldGolfers.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 bg-primary text-on-primary hover:bg-primary/95 text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> {editingParticipant ? 'Save Participant' : 'Add Participant'}
                  </button>
                </div>
              </form>
            </div>

            {/* Participants Table */}
            <div className="overflow-x-auto border border-outline-variant/60 rounded-lg">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant">
                    <th className="py-2.5 px-4 w-1/4">Name</th>
                    <th className="py-2.5 px-4 w-5/12">Drafted Golfer Roster</th>
                    <th className="py-2.5 px-4 text-center w-2/12">Entry Payment</th>
                    <th className="py-2.5 px-4 text-right w-2/12">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {participantsLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-on-surface-variant">
                        Loading participants...
                      </td>
                    </tr>
                  ) : selectedParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-on-surface-variant">
                        No participants registered. Click 'Seed Default Names' above to seed.
                      </td>
                    </tr>
                  ) : (
                    selectedParticipants.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container-high transition-colors">
                        <td className="py-3 px-4 font-bold text-on-surface">{p.name}</td>
                        <td className="py-3 px-4 text-on-surface-variant">
                          {p.draftedPlayerIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {p.draftedPlayerIds.map((id) => (
                                <span
                                  key={id}
                                  className="px-2 py-0.5 bg-surface-container-high border border-outline-variant/40 rounded-full text-[11px]"
                                >
                                  {getGolferNameById(id)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="italic text-[11px] text-outline">Empty roster</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePayment(p)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                              p.hasPaidEntry
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                            }`}
                          >
                            {p.hasPaidEntry ? 'Paid ✅' : 'Unpaid ⏳'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => startEditParticipant(p)}
                            className="text-secondary hover:text-primary font-bold transition text-[11px]"
                          >
                            Edit
                          </button>
                          <span className="text-outline-variant/40">|</span>
                          <button
                            onClick={() => handleDeleteParticipant(p.id)}
                            className="text-red-600 hover:text-red-700 font-bold transition text-[11px]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 5: GREEDY GAME PARTICIPANTS */}
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 shadow-xs">
            <div className="border-b border-outline-variant/60 pb-3 flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <Award className="w-5 h-5 text-tertiary" /> Greedy Side-Game Assignments
              </h2>
              <span className="text-xs text-on-surface-variant font-bold">
                {selectedParticipants.filter((p) => p.isGreedyParticipant).length} Assigned
              </span>
            </div>

            <div className="overflow-x-auto border border-outline-variant/60 rounded-lg">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant">
                    <th className="py-2.5 px-4 w-1/2">Participant Name</th>
                    <th className="py-2.5 px-4 w-1/2">Greedy Golfer Selection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {selectedParticipants.filter((p) => p.isGreedyParticipant).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-on-surface-variant italic">
                        No participants are flagged as Greedy Side-Game players. Add or edit a participant and check the 'Greedy Side-Game Player?' box to display them here.
                      </td>
                    </tr>
                  ) : (
                    selectedParticipants
                      .filter((p) => p.isGreedyParticipant)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-surface-container-high transition-colors">
                          <td className="py-3 px-4 font-bold text-on-surface">{p.name}</td>
                          <td className="py-3 px-4">
                            <select
                              value={p.greedyPlayerId || ''}
                              onChange={(e) => handleGreedySelect(p, e.target.value)}
                              className="w-full max-w-xs bg-surface-container border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface outline-none focus:border-outline"
                            >
                              <option value="">-- Choose Greedy Golfer --</option>
                              {fieldGolfers.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 6: LIVE PLAYER SCORES */}
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 shadow-xs">
            <div className="border-b border-outline-variant/60 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> ESPN Competitors Field
              </h2>

              <div className="relative max-w-xs w-full">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-on-surface-variant" />
                </span>
                <input
                  type="text"
                  placeholder="Search field..."
                  value={liveSearchQuery}
                  onChange={(e) => setLiveSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-xs w-full text-on-surface outline-none focus:border-outline"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-outline-variant/60 rounded-lg max-h-96 overflow-y-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant z-10">
                  <tr>
                    <th className="py-2.5 px-4 w-2/5">Player Name</th>
                    <th className="py-2.5 px-2 text-center w-12">R1</th>
                    <th className="py-2.5 px-2 text-center w-12">R2</th>
                    <th className="py-2.5 px-2 text-center w-12">R3</th>
                    <th className="py-2.5 px-2 text-center w-12">R4</th>
                    <th className="py-2.5 px-4 text-center w-20">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {loadingCompetitors ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                        Loading field scores...
                      </td>
                    </tr>
                  ) : filteredLiveCompetitors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant italic">
                        No golfers match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLiveCompetitors.map((c) => {
                      const par = selectedContestConfig?.coursePar;
                      const r1 = getGolferRoundScoreToPar(c, 1, par);
                      const r2 = getGolferRoundScoreToPar(c, 2, par);
                      const r3 = getGolferRoundScoreToPar(c, 3, par);
                      const r4 = getGolferRoundScoreToPar(c, 4, par);

                      const formatParVal = (val: number | null) => {
                        if (val === null) return '-';
                        if (val === 0) return 'E';
                        return val > 0 ? `+${val}` : `${val}`;
                      };

                      return (
                        <tr key={c.id} className="hover:bg-surface-container-high transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-on-surface">
                            {c.athlete?.displayName || 'Unknown Golfer'}
                          </td>
                          <td className="py-2.5 px-2 text-center text-on-surface-variant font-mono">
                            {formatParVal(r1)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-on-surface-variant font-mono">
                            {formatParVal(r2)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-on-surface-variant font-mono">
                            {formatParVal(r3)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-on-surface-variant font-mono">
                            {formatParVal(r4)}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-tertiary">
                            {c.score || 'E'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Sidebar: PGA Tour Scoreboard Calendar Quick Select (4 cols) */}
        <aside className="lg:col-span-4 bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 shadow-xs h-fit sticky top-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-on-surface border-b border-outline-variant/60 pb-3">
            PGA Calendar Events
          </h2>
          <p className="text-[11px] text-on-surface-variant">
            Quick selection of scheduled tournaments on the PGA Tour. Active event is starred.
          </p>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loadingEvents ? (
              <div className="py-4 text-center text-xs text-on-surface-variant italic">
                Loading events list...
              </div>
            ) : (
              events.map((e) => {
                const isActive = e.id === activeEventId;
                const isCurrentEdit = e.id === selectedEventId;
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEventId(e.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition flex justify-between items-center gap-3 ${
                      isCurrentEdit
                        ? 'bg-secondary-container text-on-secondary-container border-outline'
                        : 'bg-surface-container-lowest border-outline-variant/60 hover:bg-surface-container hover:border-outline-variant'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-bold truncate max-w-44">{e.name}</p>
                      <p className="text-[10px] text-on-surface-variant font-semibold">
                        {e.date ? new Date(e.date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    {isActive && (
                      <span className="bg-tertiary text-on-tertiary px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-0.5 shrink-0">
                        <Star className="w-2.5 h-2.5 fill-on-tertiary" /> Active
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </main>

      {/* Batch Paste Rosters Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
              <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                📋 Batch Paste Participant Rosters
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Paste your participant names and comma-delimited golfer rosters below (one participant per line). Format: <code className="font-mono text-tertiary">Name: Golfer 1, Golfer 2, Golfer 3</code>
            </p>

            <textarea
              rows={8}
              placeholder={`Pat: Scottie Scheffler, Rory McIlroy, Xander Schauffele\nGreg: Jon Rahm, Viktor Hovland, Brooks Koepka\nDereck: Collin Morikawa, Wyndham Clark, Patrick Cantlay`}
              value={batchRosterText}
              onChange={(e) => setBatchRosterText(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs text-on-surface font-mono outline-none focus:border-outline"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg border border-outline-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessBatchRosters}
                disabled={syncing || !batchRosterText.trim()}
                className="px-5 py-2 text-xs font-bold bg-tertiary hover:bg-tertiary/90 text-on-tertiary rounded-lg shadow-xs transition disabled:opacity-50"
              >
                {syncing ? 'Processing...' : 'Import Rosters'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
