/**
 * Tests for the auto-refresh polling behavior.
 *
 * Seam: useLeaderboardPolling hook — tests observable behavior at the
 * hook boundary (onPoll call count, cleanup) without mounting the full
 * DashboardPage and its many concurrent async effects.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeaderboardPolling } from '@/hooks/useLeaderboardPolling';

const POLL_INTERVAL_MS = 45 * 1000;

describe('useLeaderboardPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does NOT call onPoll on initial mount (the initial load is the caller\'s responsibility)', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', onPoll }));

    expect(onPoll).not.toHaveBeenCalled();
  });

  it('calls onPoll once after the poll interval elapses', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', onPoll }));

    vi.advanceTimersByTime(POLL_INTERVAL_MS);

    expect(onPoll).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPoll during a tick when the tab is hidden', () => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', onPoll }));

    vi.advanceTimersByTime(POLL_INTERVAL_MS);

    expect(onPoll).not.toHaveBeenCalled();
  });

  it('calls onPoll immediately when the user returns to the tab (visibilitychange)', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', onPoll }));

    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onPoll).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPoll on visibilitychange when tab is still hidden', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', onPoll }));

    // Tab stays hidden — visibilitychange should not fire onPoll
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onPoll).not.toHaveBeenCalled();
  });

  it('clears the interval on unmount (no orphaned timers)', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const onPoll = vi.fn();
    const { unmount } = renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', onPoll }));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('removes the visibilitychange listener on unmount', () => {
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');
    const onPoll = vi.fn();
    const { unmount } = renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', onPoll }));

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('does nothing (no interval, no listener) when activeEventId is undefined', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const addListenerSpy = vi.spyOn(document, 'addEventListener');
    const onPoll = vi.fn();

    renderHook(() => useLeaderboardPolling({ activeEventId: undefined, onPoll }));

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(addListenerSpy).not.toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(onPoll).not.toHaveBeenCalled();
  });
});
