interface StoredSnapshot<T = unknown> {
  data: T;
  timestamp: number;
}

const memorySnapshots = new Map<string, StoredSnapshot>();

export function setMemorySnapshot<T>(key: string, data: T): void {
  memorySnapshots.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function getMemorySnapshot<T>(key: string): StoredSnapshot<T> | undefined {
  return memorySnapshots.get(key) as StoredSnapshot<T> | undefined;
}

export function clearMemorySnapshots(): void {
  memorySnapshots.clear();
}
