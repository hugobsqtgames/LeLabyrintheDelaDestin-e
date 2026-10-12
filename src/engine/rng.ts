/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 *
 * La graine est stockée dans l'état de partie : recharger une sauvegarde ne
 * permet pas de relancer un jet, et les tests sont reproductibles.
 */
export interface RngResult<T> {
  value: T;
  seed: number;
}

export function nextFloat(seed: number): RngResult<number> {
  let t = (seed + 0x6d2b79f5) >>> 0;
  const nextSeed = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: nextSeed };
}

export function nextInt(seed: number, min: number, max: number): RngResult<number> {
  const r = nextFloat(seed);
  return { value: min + Math.floor(r.value * (max - min + 1)), seed: r.seed };
}

/** Lance `n` dés. */
export function rollDice(seed: number, n: number, sides: number): RngResult<number[]> {
  const values: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i += 1) {
    const r = nextInt(s, 1, sides);
    values.push(r.value);
    s = r.seed;
  }
  return { value: values, seed: s };
}

export function chance(seed: number, probability: number): RngResult<boolean> {
  const r = nextFloat(seed);
  return { value: r.value < probability, seed: r.seed };
}

export function pickWeighted<T extends { weight: number }>(seed: number, items: T[]): RngResult<T> {
  const total = items.reduce((sum, it) => sum + Math.max(0, it.weight), 0);
  const r = nextFloat(seed);
  let roll = r.value * total;
  for (const it of items) {
    roll -= Math.max(0, it.weight);
    if (roll < 0) return { value: it, seed: r.seed };
  }
  return { value: items[items.length - 1], seed: r.seed };
}

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
