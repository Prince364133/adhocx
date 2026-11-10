/**
 * Ranking policy helpers (docs/25_DISPATCH_CORRECTNESS_SIMULATION.md).
 *
 * Rookie exploration: new drivers (< 25 trips) get a reserved share of offers so they can build a
 * track record. The old rule reserved max(1, 15 %) of each wave's offers, so a single-offer wave
 * (most bookings) went to ANY rookie in range 100 % of the time, regardless of trust, rating or
 * distance. Now the share is honoured on average: multi-offer waves reserve floor(share × offers);
 * single-offer waves give the slot to a rookie for `share` of waves, chosen deterministically from
 * the requirement id + wave (stable across retries and instances, auditable in tests).
 */
export function rookieExplorationHit(requirementId: string, waveNumber: number, share: number): boolean {
  if (share <= 0) return false;
  if (share >= 1) return true;
  return fnv1a(`${requirementId}:${waveNumber}`) % 10_000 < Math.round(share * 10_000);
}

export function rookieQuotaFor(
  waveLimit: number,
  rookies: number,
  share: number,
  requirementId: string,
  waveNumber: number,
): number {
  let quota = Math.min(rookies, Math.floor(waveLimit * share));
  if (quota === 0 && rookies > 0 && waveLimit > 0 && rookieExplorationHit(requirementId, waveNumber, share)) quota = 1;
  return quota;
}

/** 32-bit FNV-1a (deterministic, dependency-free). */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
