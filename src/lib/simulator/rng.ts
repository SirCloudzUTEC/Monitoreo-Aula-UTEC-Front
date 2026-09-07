// Deterministic seeded RNG so the whole simulation is a pure function of time.

/** FNV-1a 32-bit hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform [0,1) deterministic on (key, bucket). */
export function noiseAt(key: string, bucket: number): number {
  return mulberry32(hashString(key) ^ (bucket * 2654435761))();
}

/** Standard gaussian (Box-Muller), deterministic on (key, bucket). */
export function gaussAt(key: string, bucket: number): number {
  const rng = mulberry32(hashString(key) ^ (bucket * 2654435761));
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Smooth 1D value noise in [-1,1]: interpolates gaussians at integer buckets,
 * so consecutive samples drift instead of jumping.
 */
export function smoothNoise(key: string, t: number): number {
  const b = Math.floor(t);
  const frac = t - b;
  const a = gaussAt(key, b);
  const c = gaussAt(key, b + 1);
  const s = frac * frac * (3 - 2 * frac); // smoothstep
  return (a * (1 - s) + c * s) / 2;
}
