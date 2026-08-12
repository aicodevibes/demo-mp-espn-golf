'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AppConfig, resolveParticipantsFromSnapshot } from '@/lib/firebase/firestore';
import { Participant, ContestConfig } from '@/types/contest';

export interface EventContextState {
  activeEventId: string;
  activeSeason: number;
  activeConfig: AppConfig | null;
  contestConfig: ContestConfig | null;
  participants: Participant[];
  loading: boolean;
  error: Error | null;
}

const EventContext = createContext<EventContextState>({
  activeEventId: '',
  activeSeason: new Date().getFullYear(),
  activeConfig: null,
  contestConfig: null,
  participants: [],
  loading: true,
  error: null,
});

interface EventContextProviderProps {
  children: ReactNode;
  initialEventId?: string;
}

export function EventContextProvider({ children, initialEventId = '' }: EventContextProviderProps) {
  const [activeEventId, setActiveEventId] = useState<string>(initialEventId);
  const [activeSeason, setActiveSeason] = useState<number>(new Date().getFullYear());
  const [activeConfig, setActiveConfig] = useState<AppConfig | null>(null);
  const [contestConfig, setContestConfig] = useState<ContestConfig | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 1. Subscribe to /config/app
  useEffect(() => {
    const configRef = doc(db, 'config', 'app');
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppConfig;
          setActiveConfig(data);
          if (data.activeEventId) setActiveEventId(data.activeEventId);
          if (data.activeSeason) setActiveSeason(data.activeSeason);
        }
      },
      (err) => {
        console.warn('EventContext config subscribe error:', err);
      }
    );
    return () => unsub();
  }, []);

  // 2. Subscribe to /events/{eventId}/contestConfig/default
  useEffect(() => {
    if (!activeEventId) {
      setContestConfig(null);
      return;
    }
    const contestConfigRef = doc(db, 'events', activeEventId, 'contestConfig', 'default');
    const unsub = onSnapshot(
      contestConfigRef,
      (snap) => {
        if (snap.exists()) {
          setContestConfig(snap.data() as ContestConfig);
        } else {
          setContestConfig(null);
        }
      },
      (err) => console.warn('EventContext contestConfig subscribe error:', err)
    );
    return () => unsub();
  }, [activeEventId]);

  // 3. Subscribe to /events/{eventId}/participants
  useEffect(() => {
    if (!activeEventId) {
      setParticipants(resolveParticipantsFromSnapshot([], activeEventId));
      setLoading(false);
      return;
    }
    const participantsRef = collection(db, 'events', activeEventId, 'participants');
    const unsub = onSnapshot(
      participantsRef,
      (snapshot) => {
        const list: Participant[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Participant);
          });
        }
        setParticipants(resolveParticipantsFromSnapshot(list, activeEventId));
        setLoading(false);
      },
      (err) => {
        console.warn('EventContext participants subscribe error:', err);
        setParticipants(resolveParticipantsFromSnapshot([], activeEventId));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [activeEventId]);

  return (
    <EventContext.Provider
      value={{
        activeEventId,
        activeSeason,
        activeConfig,
        contestConfig,
        participants,
        loading,
        error,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext(): EventContextState {
  return useContext(EventContext);
}
