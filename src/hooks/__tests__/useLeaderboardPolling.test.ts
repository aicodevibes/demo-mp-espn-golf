// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useLeaderboardPolling,
  LIVE_POLL_INTERVAL_MS,
  RELAXED_POLL_INTERVAL_MS,
} from '@/hooks/useLeaderboardPolling';

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

  it('exports expected interval constants (35s live, 5m relaxed)', () => {
    expect(LIVE_POLL_INTERVAL_MS).toBe(35000);
    expect(RELAXED_POLL_INTERVAL_MS).toBe(300000);
  });

  it('does NOT call onPoll on initial mount (the initial load is the caller\'s responsibility)', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', isLive: true, onPoll }));

    expect(onPoll).not.toHaveBeenCalled();
  });

  it('polls every 35 seconds when isLive is true', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', isLive: true, onPoll }));

    // Advance 34,999ms - not called yet
    vi.advanceTimersByTime(34999);
    expect(onPoll).not.toHaveBeenCalled();

    // Advance 1ms to reach 35,000ms
    vi.advanceTimersByTime(1);
    expect(onPoll).toHaveBeenCalledTimes(1);

    // Another 35s
    vi.advanceTimersByTime(35000);
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it('polls every 5 minutes (300,000ms) when isLive is false (default)', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', isLive: false, onPoll }));

    // Advance 35s - should not poll
    vi.advanceTimersByTime(35000);
    expect(onPoll).not.toHaveBeenCalled();

    // Advance to 5 minutes
    vi.advanceTimersByTime(265000);
    expect(onPoll).toHaveBeenCalledTimes(1);
  });

  it('dynamically adapts polling interval when isLive state updates', () => {
    const onPoll = vi.fn();
    let isLiveState = false;
    const { rerender } = renderHook(() =>
      useLeaderboardPolling({ activeEventId: 'evt-1', isLive: isLiveState, onPoll })
    );

    // Initial non-live: after 35s, nothing happens
    vi.advanceTimersByTime(35000);
    expect(onPoll).not.toHaveBeenCalled();

    // Tournament goes live!
    isLiveState = true;
    rerender();

    // After 35s in live state, onPoll triggers
    vi.advanceTimersByTime(35000);
    expect(onPoll).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPoll during a tick when the tab is hidden', () => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', isLive: true, onPoll }));

    vi.advanceTimersByTime(LIVE_POLL_INTERVAL_MS);

    expect(onPoll).not.toHaveBeenCalled();
  });

  it('calls onPoll immediately when the user returns to the tab (visibilitychange)', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', isLive: true, onPoll }));

    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onPoll).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPoll on visibilitychange when tab is still hidden', () => {
    const onPoll = vi.fn();
    renderHook(() => useLeaderboardPolling({ activeEventId: 'evt-1', isLive: true, onPoll }));

    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onPoll).not.toHaveBeenCalled();
  });

  it('clears the interval on unmount (no orphaned timers)', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const onPoll = vi.fn();
    const { unmount } = renderHook(() =>
      useLeaderboardPolling({ activeEventId: 'evt-1', isLive: true, onPoll })
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('removes the visibilitychange listener on unmount', () => {
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');
    const onPoll = vi.fn();
    const { unmount } = renderHook(() =>
      useLeaderboardPolling({ activeEventId: 'evt-1', isLive: true, onPoll })
    );

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('does nothing (no interval, no listener) when activeEventId is undefined', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const addListenerSpy = vi.spyOn(document, 'addEventListener');
    const onPoll = vi.fn();

    renderHook(() => useLeaderboardPolling({ activeEventId: undefined, isLive: true, onPoll }));

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(addListenerSpy).not.toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(onPoll).not.toHaveBeenCalled();
  });
});
