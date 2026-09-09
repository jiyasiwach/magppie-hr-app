/**
 * Deterministic pseudo-random helpers.
 *
 * Attendance, punches and leave ledgers are too voluminous to hand-write for 40
 * people over several months, so they are generated — but generated
 * *deterministically*, so every reviewer sees exactly the same screens, and the
 * generated records conform to the same shapes as the hand-written mocks.
 */

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed: string): () => number {
  let t = hashSeed(seed);
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
