import { useCallback, useEffect, useMemo } from 'react';

export const LIVE_POLL_INTERVAL_MS = 35 * 1000; // 35 seconds for in-progress tournaments
export const RELAXED_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes for scheduled or completed tournaments

export interface UseLeaderboardPollingOptions {
  /** The active ESPN event ID. Polling is a no-op when falsy. */
  activeEventId: string | undefined;
  /** Whether the tournament is currently in progress. Defaults to false. */
  isLive?: boolean;
  /** Custom interval override in milliseconds (takes precedence over isLive). */
  customIntervalMs?: number;
  /** Stable callback that fetches and applies the leaderboard. */
  onPoll: () => void;
}

/**
 * Attaches an adaptive polling interval (35s for live in-progress tournaments, 5m otherwise)
 * to `onPoll` while the browser tab is visible, and triggers an immediate poll when the
 * user returns to the tab.
 *
 * Cleans up the interval and visibilitychange listener on unmount.
 */
export function useLeaderboardPolling({
  activeEventId,
  isLive = false,
  customIntervalMs,
  onPoll,
}: UseLeaderboardPollingOptions) {
  const pollIntervalMs = useMemo(() => {
    if (customIntervalMs !== undefined) return customIntervalMs;
    return isLive ? LIVE_POLL_INTERVAL_MS : RELAXED_POLL_INTERVAL_MS;
  }, [isLive, customIntervalMs]);

  // Stable poll handler — only fires when tab is visible
  const pollIfVisible = useCallback(() => {
    if (typeof document !== 'undefined' && !document.hidden) {
      onPoll();
    }
  }, [onPoll]);

  useEffect(() => {
    if (!activeEventId) return;

    const interval = setInterval(pollIfVisible, pollIntervalMs);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        onPoll();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [activeEventId, pollIntervalMs, pollIfVisible, onPoll]);
}
