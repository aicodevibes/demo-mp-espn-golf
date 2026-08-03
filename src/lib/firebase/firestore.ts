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
export async function setActiveEvent(eventId: string, season: number = new Date().getFullYear(), userEmail: string = 'aicodevibes@gmail.com') {
  const configRef = doc(db, 'config', 'app');
  await setDoc(configRef, {
    activeEventId: eventId,
    activeSeason: season,
    updatedAt: serverTimestamp(),
    updatedBy: userEmail,
  }, { merge: true });
}

export async function getActiveConfig(): Promise<AppConfig | null> {
  const configRef = doc(db, 'config', 'app');
  const snap = await getDoc(configRef);
  if (snap.exists()) {
    return snap.data() as AppConfig;
  }
  return null;
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
    chunk.forEach((comp) => {
      const playerId = comp.athlete?.id || comp.id;
      if (!playerId) return;
      const playerRef = doc(db, 'players', playerId);
      batch.set(
        playerRef,
        {
          id: playerId,
          name: comp.athlete?.displayName || 'Golfer',
          headshotUrl: comp.athlete?.headshot?.href || '',
          country: comp.athlete?.country?.abbreviation || '',
          countryFlag: comp.athlete?.flag?.href || '',
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
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
