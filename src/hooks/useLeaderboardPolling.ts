import { useCallback, useEffect } from 'react';

const LEADERBOARD_POLL_INTERVAL_MS = 5 * 60 * 1000;

interface UseLeaderboardPollingOptions {
  /** The active ESPN event ID. Polling is a no-op when falsy. */
  activeEventId: string | undefined;
  /** Stable callback that fetches and applies the leaderboard. */
  onPoll: () => void;
}

/**
 * Attaches a 5-minute polling interval to `onPoll` while the browser tab is
 * visible, and triggers an immediate poll when the user returns to the tab.
 *
 * Cleans up the interval and visibilitychange listener on unmount.
 */
export function useLeaderboardPolling({ activeEventId, onPoll }: UseLeaderboardPollingOptions) {
  // Stable poll handler — only fires when tab is visible
  const pollIfVisible = useCallback(() => {
    if (!document.hidden) {
      onPoll();
    }
  }, [onPoll]);

  useEffect(() => {
    if (!activeEventId) return;

    const interval = setInterval(pollIfVisible, LEADERBOARD_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        onPoll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeEventId, pollIfVisible, onPoll]);
}
