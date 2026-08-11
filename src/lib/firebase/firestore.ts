import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from './config';
import { useEffect, useState } from 'react';
import { Participant, ContestConfig } from '@/types/contest';
import { DEFAULT_CONTEST_PARTICIPANTS } from './seedData';
import { DEFAULT_PLAYER_DIRECTORY_MAP } from '@/lib/espn';

export interface AppConfig {
  activeEventId: string;
  activeSeason: number;
  updatedAt?: any;
  updatedBy?: string;
}

export interface TrackedPlayer {
  playerId: string;
  name: string;
  headshotUrl?: string;
  country?: string;
  displayOrder?: number;
  addedAt?: any;
}

// Config CRUD
export async function setActiveEvent(
  eventId: string,
  season: number = new Date().getFullYear(),
  userEmail: string = 'aicodevibes@gmail.com'
) {
  const configRef = doc(db, 'config', 'app');
  await setDoc(
    configRef,
    {
      activeEventId: eventId,
      activeSeason: season,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail,
    },
    { merge: true }
  );

  // Ensure default ContestConfig exists for the active event
  if (eventId) {
    const contestConfigRef = doc(db, 'events', eventId, 'contestConfig', 'default');
    const snap = await getDoc(contestConfigRef);
    if (!snap.exists()) {
      await setDoc(contestConfigRef, {
        espnEventId: eventId,
        eventName: 'PGA Golf Pool',
        season,
        mainPayouts: [600, 320, 180, 100],
        dayMoneyPool: 75,
        coursePar: null,
        isFinalized: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: userEmail,
      });
    }
  }
}

export async function getActiveConfig(): Promise<AppConfig | null> {
  const configRef = doc(db, 'config', 'app');
  const snap = await getDoc(configRef);
  if (snap.exists()) {
    return snap.data() as AppConfig;
  }
  return null;
}

// Per-Event ContestConfig CRUD
export async function getContestConfig(eventId: string): Promise<ContestConfig | null> {
  if (!eventId) return null;
  const contestConfigRef = doc(db, 'events', eventId, 'contestConfig', 'default');
  const snap = await getDoc(contestConfigRef);
  if (snap.exists()) {
    return snap.data() as ContestConfig;
  }
  return null;
}

export async function setContestConfig(
  eventId: string,
  config: Partial<ContestConfig>,
  userEmail: string = 'aicodevibes@gmail.com'
): Promise<void> {
  if (!eventId) return;
  const contestConfigRef = doc(db, 'events', eventId, 'contestConfig', 'default');
  await setDoc(
    contestConfigRef,
    {
      ...config,
      espnEventId: eventId,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail,
    },
    { merge: true }
  );
}

// Per-Event Participants CRUD
export async function getParticipantsForEvent(eventId: string): Promise<Participant[]> {
  if (!eventId) return [];
  const participantsRef = collection(db, 'events', eventId, 'participants');
  const snap = await getDocs(participantsRef);
  const list: Participant[] = [];
  snap.forEach((docSnap) => {
    list.push({ id: docSnap.id, ...docSnap.data() } as Participant);
  });
  return list;
}

export async function setParticipantsForEvent(eventId: string, participants: Participant[]): Promise<void> {
  if (!eventId) return;
  const batch = writeBatch(db);
  const participantsRef = collection(db, 'events', eventId, 'participants');
  
  // Clear existing documents in subcollection
  const existing = await getDocs(participantsRef);
  existing.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  participants.forEach((p) => {
    const pRef = doc(db, 'events', eventId, 'participants', p.id);
    batch.set(pRef, p);
  });

  await batch.commit();
}

export async function addParticipantToEvent(eventId: string, participant: Participant): Promise<void> {
  if (!eventId || !participant.id) return;
  const pRef = doc(db, 'events', eventId, 'participants', participant.id);
  await setDoc(pRef, participant, { merge: true });
}

export async function removeParticipantFromEvent(eventId: string, participantId: string): Promise<void> {
  if (!eventId || !participantId) return;
  const pRef = doc(db, 'events', eventId, 'participants', participantId);
  await deleteDoc(pRef);
}


// Tracked Players CRUD
export async function addTrackedPlayer(player: TrackedPlayer) {
  if (!player || !player.playerId) {
    throw new Error('Player ID is required to add tracked player');
  }
  const playerRef = doc(db, 'trackedPlayers', player.playerId);
  await setDoc(playerRef, {
    ...player,
    addedAt: serverTimestamp(),
  });
}

export async function removeTrackedPlayer(playerId: string) {
  if (!playerId) {
    throw new Error('Player ID is required to remove tracked player');
  }
  const playerRef = doc(db, 'trackedPlayers', playerId);
  await deleteDoc(playerRef);
}

// Auto-Sync Golfer Directory to Firestore
export async function syncPlayersToFirestore(competitors: any[]) {
  if (!competitors || competitors.length === 0) return;
  try {
    const batch = writeBatch(db);
    // Write in chunks of 450 to stay under Firestore's 500 batch limit
    const chunk = competitors.slice(0, 450);
    let hasWrites = false;

    chunk.forEach((comp) => {
      const playerId = comp.athlete?.id || comp.id;
      if (!playerId) return;

      // Skip synthetic competitors from mutating Firestore player database
      if (comp.athlete?.isSynthetic) return;

      const playerRef = doc(db, 'players', playerId);
      const dataToSet: Record<string, any> = {
        id: playerId,
        name: comp.athlete?.displayName || 'Golfer',
        country: comp.athlete?.country?.abbreviation || '',
        countryFlag: comp.athlete?.flag?.href || '',
        lastUpdated: serverTimestamp(),
      };

      // Only set headshotUrl if genuine ESPN headshot href is provided
      if (comp.athlete?.headshot?.href && typeof comp.athlete.headshot.href === 'string') {
        dataToSet.headshotUrl = comp.athlete.headshot.href;
      }

      batch.set(playerRef, dataToSet, { merge: true });
      hasWrites = true;
    });

    if (hasWrites) {
      await batch.commit();
    }
  } catch (error) {
    console.warn('Firestore player directory auto-sync skipped (rules or offline):', error);
  }
}



// Real-time hooks
export function useActiveConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const configRef = doc(db, 'config', 'app');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as AppConfig);
      } else {
        setConfig(null);
      }
      setLoading(false);
    }, (error) => {
      console.warn('Firestore config read error (using fallback defaults):', error);
      setConfig(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { config, loading };
}

export function useTrackedPlayers() {
  const [players, setPlayers] = useState<TrackedPlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const playersRef = collection(db, 'trackedPlayers');
    const q = query(playersRef, orderBy('displayOrder', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: TrackedPlayer[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as TrackedPlayer);
      });
      setPlayers(list);
      setLoading(false);
    }, (error) => {
      console.warn('Firestore trackedPlayers read error:', error);
      setPlayers([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { players, loading };
}

export function useAllPlayers() {
  const [playerMap, setPlayerMap] = useState<Record<string, { id: string; name: string; headshotUrl?: string }>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const playersRef = collection(db, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const map: Record<string, { id: string; name: string; headshotUrl?: string }> = {
        ...DEFAULT_PLAYER_DIRECTORY_MAP,
      };
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const canonical = DEFAULT_PLAYER_DIRECTORY_MAP[docId];

        if (data.id && data.name) {
          // If Firestore contains a legacy corrupted record where name doesn't match canonical entry, ignore legacy record
          if (canonical && data.name !== canonical.name) {
            return;
          }
          map[data.id] = {
            id: data.id,
            name: data.name,
            headshotUrl: data.headshotUrl || canonical?.headshotUrl,
          };
        }
      });
      setPlayerMap(map);
      setLoading(false);
    }, (error) => {
      console.warn('Firestore players directory read error (using defaults):', error);
      setPlayerMap(DEFAULT_PLAYER_DIRECTORY_MAP);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { playerMap, loading };
}

export async function repairAndSeedPlayerDirectory(): Promise<{ cleanedCount: number; seededCount: number }> {
  try {
    const playersRef = collection(db, 'players');
    const snapshot = await getDocs(playersRef);
    let cleanedCount = 0;

    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const canonicalEntry = DEFAULT_PLAYER_DIRECTORY_MAP[docId];

      if (canonicalEntry) {
        if (data.name && data.name !== canonicalEntry.name) {
          deletePromises.push(deleteDoc(doc(db, 'players', docId)));
          cleanedCount++;
        }
      }
    });

    await Promise.all(deletePromises);

    const batch = writeBatch(db);
    let seededCount = 0;
    Object.values(DEFAULT_PLAYER_DIRECTORY_MAP).forEach((p) => {
      const playerRef = doc(db, 'players', p.id);
      batch.set(playerRef, {
        id: p.id,
        name: p.name,
        headshotUrl: p.headshotUrl,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
      seededCount++;
    });

    await batch.commit();
    return { cleanedCount, seededCount };
  } catch (err) {
    console.error('Error repairing player directory:', err);
    throw err;
  }
}

export function useContestConfig(eventId: string | null | undefined) {
  const [config, setConfig] = useState<ContestConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!eventId) {
      setConfig(null);
      setLoading(false);
      return;
    }

    const contestConfigRef = doc(db, 'events', eventId, 'contestConfig', 'default');
    const unsubscribe = onSnapshot(
      contestConfigRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setConfig(docSnap.data() as ContestConfig);
        } else {
          setConfig(null);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore contestConfig read error:', error);
        setConfig(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  return { config, loading };
}

export function resolveParticipantsFromSnapshot(
  docs: Participant[],
  eventId?: string | null
): Participant[] {
  if (docs.length > 0) {
    return docs;
  }
  // When eventId is explicitly provided (not null/undefined), return [] for unconfigured events.
  // Only fallback to DEFAULT_CONTEST_PARTICIPANTS when eventId is null or undefined.
  if (eventId != null) {
    return [];
  }
  return DEFAULT_CONTEST_PARTICIPANTS;
}

export function useParticipants(eventId?: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const participantsRef = eventId
      ? collection(db, 'events', eventId, 'participants')
      : collection(db, 'participants');

    const unsubscribe = onSnapshot(
      participantsRef,
      (snapshot) => {
        const list: Participant[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Participant);
          });
        }
        setParticipants(resolveParticipantsFromSnapshot(list, eventId));
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore participants read error:', error);
        setParticipants(resolveParticipantsFromSnapshot([], eventId));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  return { participants, loading };
}

export function resetParticipantRoster(participants: Participant[]): Participant[] {
  return participants.map((p) => ({
    id: p.id,
    name: p.name,
    draftedPlayerIds: [],
    isGreedyParticipant: false,
    greedyPlayerId: null,
    hasPaidEntry: false,
    hasPaidGreedy: false,
  }));
}


export async function copyRosterFromEvent(
  sourceEventId: string,
  targetEventId: string
): Promise<Participant[]> {
  if (!sourceEventId || !targetEventId) return [];
  const sourceParticipants = await getParticipantsForEvent(sourceEventId);
  const resetList = resetParticipantRoster(sourceParticipants);
  await setParticipantsForEvent(targetEventId, resetList);
  return resetList;
}





