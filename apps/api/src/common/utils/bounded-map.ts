/**
 * In-process caches must be bounded: a Map that is only cleaned when a key is read again grows with
 * every distinct key ever seen (driver positions, addresses, rate-limit keys) for the life of the
 * process.
 *
 * `setBounded` re-inserts the key (Map iteration order = insertion order, so the first key is the
 * least recently written) and evicts the oldest entries beyond `maxEntries`. With a fixed TTL per
 * cache, the oldest entries are also the first to expire, so this bounds memory without timers.
 */
export function setBounded<K, V>(map: Map<K, V>, key: K, value: V, maxEntries: number): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > maxEntries) {
    const oldest = map.keys().next();
    if (oldest.done) break;
    map.delete(oldest.value);
  }
}

/** Deletes entries whose `expiresAt` (epoch ms) has passed; returns how many were removed. */
export function sweepExpired<K, V extends { expiresAt?: number }>(map: Map<K, V>, nowMs: number = Date.now()): number {
  let removed = 0;
  for (const [k, v] of map) {
    if (v.expiresAt !== undefined && v.expiresAt <= nowMs) {
      map.delete(k);
      removed++;
    }
  }
  return removed;
}
