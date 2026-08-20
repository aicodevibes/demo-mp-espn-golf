'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  AppConfig,
  resolveParticipantsFromSnapshot,
} from '@/lib/firebase/firestore';
import { Participant, ContestConfig } from '@/types/contest';
import { DEFAULT_PLAYER_DIRECTORY_MAP } from '@/lib/espn';

export interface ContestContextState {
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
  /** Global configured active event ID in Firestore. */
  configuredActiveEventId: string;
}

const ContestContext = createContext<ContestContextState>({
  activeSeason: new Date().getFullYear(),
  activeConfig: null,
  contestConfig: null,
  participants: [],
  firestorePlayerMap: DEFAULT_PLAYER_DIRECTORY_MAP,
  configuredActiveEventId: '',
});

export interface ContestProviderProps {
  children: ReactNode;
  eventId: string;
  onActiveEventIdResolved?: (eventId: string) => void;
}

export function ContestProvider({
  children,
  eventId,
  onActiveEventIdResolved,
}: ContestProviderProps) {
  const [activeSeason, setActiveSeason] = useState<number>(new Date().getFullYear());
  const [activeConfig, setActiveConfig] = useState<AppConfig | null>(null);
  const [configuredActiveEventId, setConfiguredActiveEventId] = useState<string>('');
  const [contestConfig, setContestConfig] = useState<ContestConfig | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [firestorePlayerMap, setFirestorePlayerMap] = useState<
    Record<string, { id: string; name: string; headshotUrl?: string }>
  >(DEFAULT_PLAYER_DIRECTORY_MAP);

  // 1. Subscribe to /config/app
  useEffect(() => {
    const configRef = doc(db, 'config', 'app');
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppConfig;
          setActiveConfig(data);
          if (data.activeEventId) {
            setConfiguredActiveEventId(data.activeEventId);
            onActiveEventIdResolved?.(data.activeEventId);
          }
          if (data.activeSeason) setActiveSeason(data.activeSeason);
        }
      },
      (err) => {
        console.warn('ContestContext config subscribe error:', err);
      }
    );
    return () => unsub();
  }, [onActiveEventIdResolved]);

  // 2. Subscribe to /players directory
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
        console.warn('ContestContext players directory subscribe error (using defaults):', err);
      }
    );
    return () => unsub();
  }, []);

  // 3. Subscribe to /events/{eventId}/contestConfig/default
  useEffect(() => {
    if (!eventId) {
      setContestConfig(null);
      return;
    }
    const contestConfigRef = doc(db, 'events', eventId, 'contestConfig', 'default');
    const unsub = onSnapshot(
      contestConfigRef,
      (snap) => {
        if (snap.exists()) {
          setContestConfig(snap.data() as ContestConfig);
        } else {
          setContestConfig(null);
        }
      },
      (err) => console.warn('ContestContext contestConfig subscribe error:', err)
    );
    return () => unsub();
  }, [eventId]);

  // 4. Subscribe to /events/{eventId}/participants
  useEffect(() => {
    if (!eventId) {
      setParticipants(resolveParticipantsFromSnapshot([], eventId));
      return;
    }
    const participantsRef = collection(db, 'events', eventId, 'participants');
    const unsub = onSnapshot(
      participantsRef,
      (snapshot) => {
        const list: Participant[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Participant);
          });
        }
        setParticipants(resolveParticipantsFromSnapshot(list, eventId));
      },
      (err) => {
        console.warn('ContestContext participants subscribe error:', err);
        setParticipants(resolveParticipantsFromSnapshot([], eventId));
      }
    );
    return () => unsub();
  }, [eventId]);

  const value: ContestContextState = useMemo(
    () => ({
      activeSeason,
      activeConfig,
      contestConfig,
      participants,
      firestorePlayerMap,
      configuredActiveEventId,
    }),
    [
      activeSeason,
      activeConfig,
      contestConfig,
      participants,
      firestorePlayerMap,
      configuredActiveEventId,
    ]
  );

  return <ContestContext.Provider value={value}>{children}</ContestContext.Provider>;
}

export function useContest(): ContestContextState {
  return useContext(ContestContext);
}
