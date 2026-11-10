import { setBounded, sweepExpired } from '../src/common/utils/bounded-map';

describe('bounded in-process caches', () => {
  it('never exceeds maxEntries and evicts the least recently written keys first', () => {
    const m = new Map<string, number>();
    for (let i = 0; i < 10_000; i++) setBounded(m, `k${i}`, i, 100);
    expect(m.size).toBe(100);
    expect(m.has('k0')).toBe(false);
    expect(m.has('k9999')).toBe(true);
    setBounded(m, 'k9900', -1, 100); // rewrite moves it to the newest position
    setBounded(m, 'new', 1, 100);
    expect(m.has('k9900')).toBe(true);
    expect(m.has('k9901')).toBe(false);
  });

  it('sweeps expired entries only', () => {
    const m = new Map<string, { value: string; expiresAt?: number }>([
      ['old', { value: 'a', expiresAt: 1000 }],
      ['live', { value: 'b', expiresAt: 5000 }],
      ['forever', { value: 'c' }],
    ]);
    expect(sweepExpired(m, 2000)).toBe(1);
    expect([...m.keys()]).toEqual(['live', 'forever']);
  });
});
