import { describe, expect, it } from "vitest";
import {
  IsolationForest,
  VENTANA,
  detectarAnomalias,
  saltoAnomalias,
  zscoreAnomalias,
} from "@/lib/anomaly/detector";
import { mulberry32 } from "@/lib/simulator/rng";

function serieEstable(n: number, base = 600, ruido = 5): number[] {
  const rng = mulberry32(7);
  return Array.from({ length: n }, () => base + (rng() - 0.5) * 2 * ruido);
}

describe("anomaly detection", () => {
  it("z-score flags a spike far from the rolling mean", () => {
    const xs = serieEstable(VENTANA + 10);
    xs[VENTANA + 5] = 1200; // CO2-style spike
    const res = zscoreAnomalias(xs);
    expect(res.some((p) => p.index === VENTANA + 5)).toBe(true);
    expect(res.find((p) => p.index === VENTANA + 5)!.explicacion).toContain("desviaciones");
  });

  it("does not flag a stable series", () => {
    expect(zscoreAnomalias(serieEstable(VENTANA + 30))).toHaveLength(0);
  });

  it("jump rule flags physically implausible steps for the magnitude", () => {
    const xs = [600, 605, 610, 1100, 1105];
    const res = saltoAnomalias(xs, "co2");
    expect(res.map((p) => p.index)).toContain(3);
  });

  it("isolation forest scores an outlier above a normal point", () => {
    const rng = mulberry32(3);
    const data = Array.from({ length: 200 }, () => [600 + (rng() - 0.5) * 20, (rng() - 0.5) * 4]);
    const forest = new IsolationForest();
    forest.fit(data);
    const normal = forest.score([600, 0]);
    const raro = forest.score([1500, 400]);
    expect(raro).toBeGreaterThan(normal);
    expect(raro).toBeGreaterThan(0.6);
  });

  it("detectarAnomalias merges methods and deduplicates by index", () => {
    const xs = serieEstable(VENTANA + 20);
    xs[VENTANA + 8] = 1400;
    const res = detectarAnomalias(xs, "co2");
    const enIndex = res.filter((p) => p.index === VENTANA + 8);
    expect(enIndex).toHaveLength(1);
    expect(enIndex[0].score).toBeGreaterThan(0);
  });
});
