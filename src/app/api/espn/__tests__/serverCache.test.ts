import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearMemorySnapshots,
  getMemorySnapshot,
  setMemorySnapshot,
  setMemorySnapshotMaxEntries,
  DEFAULT_MAX_SNAPSHOT_ENTRIES,
} from '../serverCache';

describe('serverCache bounded LRU & staleness cap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));
    clearMemorySnapshots();
  });

  afterEach(() => {
    clearMemorySnapshots();
    vi.useRealTimers();
  });

  it('defaults max entries to 250 and returns { data, timestamp, ageSeconds }', () => {
    expect(DEFAULT_MAX_SNAPSHOT_ENTRIES).toBe(250);

    setMemorySnapshot('k1', { hello: 'world' });
    vi.advanceTimersByTime(65_000);

    const snap = getMemorySnapshot<{ hello: string }>('k1');
    expect(snap).toEqual({
      data: { hello: 'world' },
      timestamp: new Date('2026-04-10T12:00:00Z').getTime(),
      ageSeconds: 65,
    });
  });

  it('evicts the least-recently-used entry when capacity is exceeded and refreshes recency on get/set', () => {
    setMemorySnapshotMaxEntries(3);

    setMemorySnapshot('a', 1);
    setMemorySnapshot('b', 2);
    setMemorySnapshot('c', 3);

    // Touch 'a' via get so 'b' becomes the least recently used
    expect(getMemorySnapshot<number>('a')?.data).toBe(1);

    // Insert 'd' -> should evict 'b'
    setMemorySnapshot('d', 4);
    expect(getMemorySnapshot<number>('b')).toBeUndefined();
    expect(getMemorySnapshot<number>('a')?.data).toBe(1);
    expect(getMemorySnapshot<number>('c')?.data).toBe(3);
    expect(getMemorySnapshot<number>('d')?.data).toBe(4);

    // Update 'c' via set so 'a' becomes least recently used, then insert 'e' -> evicts 'a'
    setMemorySnapshot('c', 30);
    setMemorySnapshot('e', 5);
    expect(getMemorySnapshot<number>('a')).toBeUndefined();
    expect(getMemorySnapshot<number>('c')?.data).toBe(30);
  });

  it('evicts entries beyond default 250-entry limit', () => {
    for (let i = 0; i < 251; i++) {
      setMemorySnapshot(`key-${i}`, i);
    }
    expect(getMemorySnapshot<number>('key-0')).toBeUndefined();
    expect(getMemorySnapshot<number>('key-1')?.data).toBe(1);
    expect(getMemorySnapshot<number>('key-250')?.data).toBe(250);
  });

  it('returns undefined when snapshot is older than maxAgeMs', () => {
    setMemorySnapshot('stale-key', { score: -5 });
    vi.advanceTimersByTime(30 * 60 * 1000 + 1000); // 30m + 1s

    expect(getMemorySnapshot('stale-key', 30 * 60 * 1000)).toBeUndefined();
    // Subsequent lookup without maxAgeMs should also find it evicted
    expect(getMemorySnapshot('stale-key')).toBeUndefined();
  });
});
