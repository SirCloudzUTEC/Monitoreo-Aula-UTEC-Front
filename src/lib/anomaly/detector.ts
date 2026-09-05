// Lightweight in-browser anomaly detection over the measurement stream:
//  1. rolling z-score (window 60 samples)
//  2. sudden-jump rule per magnitude
//  3. a small Isolation Forest trained on the recent window
// Implemented in plain TypeScript: at this data volume a full TF.js runtime
// adds ~1 MB of bundle for no accuracy gain (see docs/DECISIONES.md).

import { mulberry32 } from "@/lib/simulator/rng";
import type { Magnitud } from "@/lib/types";

export const VENTANA = 60;

export interface PuntoAnomalo {
  index: number;
  valor: number;
  score: number; // 0..1 (1 = most anomalous)
  metodo: "zscore" | "salto" | "iforest";
  explicacion: string;
}

/** Max plausible change between consecutive samples, per magnitude. */
const SALTO_MAX: Partial<Record<Magnitud, number>> = {
  temperatura: 1.5,
  humedad: 6,
  co2: 200,
  pm25: 15,
  voc: 60,
  lux: 250,
  ruido: 15,
  ocupacion: 8,
  proximidad_ventana: 3,
  bateria: 5,
};

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[], mu: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / (xs.length - 1));
}

/** Rolling z-score: |z| > 3 against the previous VENTANA samples. */
export function zscoreAnomalias(valores: number[], umbralZ = 3): PuntoAnomalo[] {
  const out: PuntoAnomalo[] = [];
  for (let i = VENTANA; i < valores.length; i++) {
    const win = valores.slice(i - VENTANA, i);
    const mu = mean(win);
    const sigma = std(win, mu);
    if (sigma < 1e-6) continue;
    const z = (valores[i] - mu) / sigma;
    if (Math.abs(z) > umbralZ) {
      out.push({
        index: i,
        valor: valores[i],
        score: Math.min(1, Math.abs(z) / 6),
        metodo: "zscore",
        explicacion: `Valor a ${Math.abs(z).toFixed(1)} desviaciones de su media reciente (${mu.toFixed(1)}).`,
      });
    }
  }
  return out;
}

/** Sudden jump between consecutive samples beyond the plausible physical rate. */
export function saltoAnomalias(valores: number[], magnitud: Magnitud): PuntoAnomalo[] {
  const max = SALTO_MAX[magnitud];
  if (!max) return [];
  const out: PuntoAnomalo[] = [];
  for (let i = 1; i < valores.length; i++) {
    const d = Math.abs(valores[i] - valores[i - 1]);
    if (d > max) {
      out.push({
        index: i,
        valor: valores[i],
        score: Math.min(1, d / (max * 3)),
        metodo: "salto",
        explicacion: `Cambio brusco de ${d.toFixed(1)} entre dos muestras (máximo plausible ${max}).`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Isolation Forest (1D/2D features: value + delta), trained on the window.

interface ITree {
  split?: { dim: number; valor: number };
  left?: ITree;
  right?: ITree;
  size: number;
}

function buildTree(data: number[][], depth: number, maxDepth: number, rng: () => number): ITree {
  if (depth >= maxDepth || data.length <= 1) return { size: data.length };
  const dim = Math.floor(rng() * data[0].length);
  const vals = data.map((d) => d[dim]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  if (hi - lo < 1e-9) return { size: data.length };
  const cut = lo + rng() * (hi - lo);
  const left = data.filter((d) => d[dim] < cut);
  const right = data.filter((d) => d[dim] >= cut);
  return {
    split: { dim, valor: cut },
    left: buildTree(left, depth + 1, maxDepth, rng),
    right: buildTree(right, depth + 1, maxDepth, rng),
    size: data.length,
  };
}

function pathLength(tree: ITree, x: number[], depth = 0): number {
  if (!tree.split || !tree.left || !tree.right) {
    return depth + (tree.size > 1 ? avgPathLen(tree.size) : 0);
  }
  const next = x[tree.split.dim] < tree.split.valor ? tree.left : tree.right;
  return pathLength(next, x, depth + 1);
}

function avgPathLen(n: number): number {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
}

export class IsolationForest {
  private trees: ITree[] = [];
  private n = 0;

  /** Train on rows of [valor, delta]. Deterministic via fixed seed. */
  fit(data: number[][], nTrees = 50, seed = 42): void {
    this.trees = [];
    this.n = Math.min(64, data.length);
    const rng = mulberry32(seed);
    const maxDepth = Math.ceil(Math.log2(Math.max(2, this.n)));
    for (let t = 0; t < nTrees; t++) {
      const sample: number[][] = [];
      for (let i = 0; i < this.n; i++) sample.push(data[Math.floor(rng() * data.length)]);
      this.trees.push(buildTree(sample, 0, maxDepth, rng));
    }
  }

  /** Anomaly score in [0,1]; > ~0.62 is anomalous. */
  score(x: number[]): number {
    if (this.trees.length === 0) return 0;
    const avg = mean(this.trees.map((t) => pathLength(t, x)));
    return Math.pow(2, -avg / avgPathLen(this.n));
  }
}

export function iforestAnomalias(valores: number[], umbral = 0.62): PuntoAnomalo[] {
  if (valores.length < VENTANA) return [];
  const feats = valores.map((v, i) => [v, i > 0 ? v - valores[i - 1] : 0]);
  const forest = new IsolationForest();
  forest.fit(feats.slice(0, Math.max(VENTANA, feats.length - 10)));
  const out: PuntoAnomalo[] = [];
  for (let i = VENTANA; i < feats.length; i++) {
    const s = forest.score(feats[i]);
    if (s > umbral) {
      out.push({
        index: i,
        valor: valores[i],
        score: s,
        metodo: "iforest",
        explicacion: `Patrón inusual según el bosque de aislamiento (score ${s.toFixed(2)}).`,
      });
    }
  }
  return out;
}

/** Combined detection; deduplicates by index keeping the highest score. */
export function detectarAnomalias(valores: number[], magnitud: Magnitud): PuntoAnomalo[] {
  const todos = [
    ...zscoreAnomalias(valores),
    ...saltoAnomalias(valores, magnitud),
    ...iforestAnomalias(valores),
  ];
  const porIndex = new Map<number, PuntoAnomalo>();
  for (const p of todos) {
    const prev = porIndex.get(p.index);
    if (!prev || p.score > prev.score) porIndex.set(p.index, p);
  }
  return [...porIndex.values()].sort((a, b) => a.index - b.index);
}
