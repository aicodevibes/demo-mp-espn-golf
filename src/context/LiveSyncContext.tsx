'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  useLeaderboardPolling,
  LIVE_POLL_INTERVAL_MS,
  RELAXED_POLL_INTERVAL_MS,
} from '@/hooks/useLeaderboardPolling';

export { LIVE_POLL_INTERVAL_MS, RELAXED_POLL_INTERVAL_MS };

export interface LiveSyncContextState {
  /** True when a background leaderboard refresh is currently underway. */
  isRefreshing: boolean;
  /** True when the latest data snapshot was served from a stale-while-error cache. */
  isStaleData: boolean;
  /** Timestamp of the last successful leaderboard refresh. */
  lastRefreshedAt: Date | null;
  /** Error object if any subscription or fetch failed. */
  error: Error | null;
  /** Manual trigger to force re-fetch latest ESPN leaderboard. */
  refreshLeaderboard: (options?: { force?: boolean }) => Promise<void>;
}

const LiveSyncContext = createContext<LiveSyncContextState>({
  isRefreshing: false,
  isStaleData: false,
  lastRefreshedAt: null,
  error: null,
  refreshLeaderboard: async () => {},
});

export interface LiveSyncProviderProps {
  children: ReactNode;
  activeEventId?: string;
  isLive?: boolean;
  isStaleData?: boolean;
  lastRefreshedAt?: Date | null;
  error?: Error | null;
  onFetchLeaderboard: (isForce?: boolean) => Promise<boolean | void>;
}

export function LiveSyncProvider({
  children,
  activeEventId,
  isLive = false,
  isStaleData = false,
  lastRefreshedAt = null,
  error = null,
  onFetchLeaderboard,
}: LiveSyncProviderProps) {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const lastForcedRefreshRef = useRef<number>(0);

  // Background poller handler
  const handlePoll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onFetchLeaderboard(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [onFetchLeaderboard]);

  useLeaderboardPolling({
    activeEventId,
    isLive,
    onPoll: handlePoll,
  });

  const handleManualRefresh = useCallback(
    async (options?: { force?: boolean }) => {
      const isForce = options?.force ?? true;
      if (isForce) {
        const now = Date.now();
        if (now - lastForcedRefreshRef.current < 10000) {
          // In 10-second debounce cooldown window — skip duplicate forced network hit
          return;
        }
        lastForcedRefreshRef.current = now;
      }
      setIsRefreshing(true);
      try {
        await onFetchLeaderboard(isForce);
      } finally {
        setIsRefreshing(false);
      }
    },
    [onFetchLeaderboard]
  );

  const value: LiveSyncContextState = useMemo(
    () => ({
      isRefreshing,
      isStaleData,
      lastRefreshedAt,
      error,
      refreshLeaderboard: handleManualRefresh,
    }),
    [isRefreshing, isStaleData, lastRefreshedAt, error, handleManualRefresh]
  );

  return <LiveSyncContext.Provider value={value}>{children}</LiveSyncContext.Provider>;
}

export function useLiveSync(): LiveSyncContextState {
  return useContext(LiveSyncContext);
}
