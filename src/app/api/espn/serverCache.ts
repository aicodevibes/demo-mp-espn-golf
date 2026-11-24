export const DEFAULT_MAX_SNAPSHOT_ENTRIES = 250;

export interface StoredSnapshot<T = unknown> {
  data: T;
  timestamp: number;
  isLive?: boolean;
}

export interface SnapshotResult<T = unknown> {
  data: T;
  timestamp: number;
  ageSeconds: number;
  isLive?: boolean;
}

let maxSnapshotEntries = DEFAULT_MAX_SNAPSHOT_ENTRIES;
const memorySnapshots = new Map<string, StoredSnapshot>();
const inFlightForceRequests = new Map<string, Promise<unknown>>();

/**
 * Configure the maximum number of entries retained in the bounded LRU snapshot cache.
 * Primarily intended for deterministic testing of eviction behavior.
 */
export function setMemorySnapshotMaxEntries(maxEntries: number): void {
  maxSnapshotEntries = Math.max(1, Math.floor(maxEntries));
  while (memorySnapshots.size > maxSnapshotEntries) {
    const oldestKey = memorySnapshots.keys().next().value;
    if (oldestKey === undefined) break;
    memorySnapshots.delete(oldestKey);
  }
}

/**
 * Store a snapshot in the bounded LRU cache, refreshing its recency and evicting
 * the least-recently-used entry if the capacity limit is exceeded.
 */
export function setMemorySnapshot<T>(
  key: string,
  data: T,
  options?: { isLive?: boolean }
): void {
  if (memorySnapshots.has(key)) {
    memorySnapshots.delete(key);
  }

  const entry: StoredSnapshot<T> = {
    data,
    timestamp: Date.now(),
  };
  if (options?.isLive !== undefined) {
    entry.isLive = options.isLive;
  }

  memorySnapshots.set(key, entry);

  while (memorySnapshots.size > maxSnapshotEntries) {
    const oldestKey = memorySnapshots.keys().next().value;
    if (oldestKey === undefined) break;
    memorySnapshots.delete(oldestKey);
  }
}

/**
 * Retrieve a snapshot from the LRU cache. Returns undefined when missing or older
 * than maxAgeMs (evicting expired entries). Refreshes LRU recency on hit.
 */
export function getMemorySnapshot<T>(
  key: string,
  maxAgeMs?: number | ((data: T, isLive?: boolean) => number)
): SnapshotResult<T> | undefined {
  const entry = memorySnapshots.get(key) as StoredSnapshot<T> | undefined;
  if (!entry) return undefined;

  const ageMs = Math.max(0, Date.now() - entry.timestamp);
  const resolvedMaxAgeMs =
    typeof maxAgeMs === 'function' ? maxAgeMs(entry.data, entry.isLive) : maxAgeMs;

  if (resolvedMaxAgeMs !== undefined && ageMs > resolvedMaxAgeMs) {
    memorySnapshots.delete(key);
    return undefined;
  }

  // Refresh LRU recency
  memorySnapshots.delete(key);
  memorySnapshots.set(key, entry);

  const result: SnapshotResult<T> = {
    data: entry.data,
    timestamp: entry.timestamp,
    ageSeconds: Math.floor(ageMs / 1000),
  };
  if (entry.isLive !== undefined) {
    result.isLive = entry.isLive;
  }
  return result;
}

/**
 * Retrieve a snapshot only if strictly younger than maxAgeMs, without evicting older entries.
 * Used for force=true cooldown checks while preserving snapshots for stale-while-error fallback.
 */
export function getRecentMemorySnapshot<T>(
  key: string,
  maxAgeMs: number
): SnapshotResult<T> | undefined {
  const entry = memorySnapshots.get(key) as StoredSnapshot<T> | undefined;
  if (!entry) return undefined;

  const ageMs = Math.max(0, Date.now() - entry.timestamp);
  if (ageMs >= maxAgeMs) {
    return undefined;
  }

  memorySnapshots.delete(key);
  memorySnapshots.set(key, entry);

  const result: SnapshotResult<T> = {
    data: entry.data,
    timestamp: entry.timestamp,
    ageSeconds: Math.floor(ageMs / 1000),
  };
  if (entry.isLive !== undefined) {
    result.isLive = entry.isLive;
  }
  return result;
}

export function getInFlightForceRequest<T>(key: string): Promise<T> | undefined {
  return inFlightForceRequests.get(key) as Promise<T> | undefined;
}

export function setInFlightForceRequest<T>(key: string, promise: Promise<T>): void {
  inFlightForceRequests.set(key, promise);
}

export function deleteInFlightForceRequest(key: string): void {
  inFlightForceRequests.delete(key);
}

/**
 * Peek at a cached snapshot's known live state without mutating LRU recency.
 */
export function peekMemorySnapshotLiveState(key: string): boolean | undefined {
  return memorySnapshots.get(key)?.isLive;
}

/**
 * Clear all cached snapshots, in-flight force requests, and reset the capacity limit to its default (250).
 */
export function clearMemorySnapshots(): void {
  memorySnapshots.clear();
  inFlightForceRequests.clear();
  maxSnapshotEntries = DEFAULT_MAX_SNAPSHOT_ENTRIES;
}
