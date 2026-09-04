/** Ruido gaussiano vía transformada Box-Muller, media 0. */
export function gaussian(stdDev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * stdDev;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Random walk que tiende (mean-reverts) hacia `target`, para simular un
 * sensor real: oscila con ruido gaussiano pero no se aleja indefinidamente
 * de su punto de operación.
 */
export function meanRevertingStep(
  prev: number,
  target: number,
  stdDev: number,
  pull: number,
  min: number,
  max: number,
): number {
  const next = prev + gaussian(stdDev) + (target - prev) * pull;
  return clamp(next, min, max);
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function chance(probability: number): boolean {
  return Math.random() < probability;
}

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`;
}
