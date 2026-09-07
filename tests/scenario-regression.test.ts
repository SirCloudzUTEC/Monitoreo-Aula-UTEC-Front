import { describe, expect, it } from "vitest";
import { ocupacionAt, co2At } from "@/lib/simulator/profiles";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import {
  SimulatedDataSource,
  type ScenarioTransition,
} from "@/lib/data/data-source";

it("changing the scenario does not rewrite past chart measurements", () => {
  const start = Date.parse("2026-09-07T09:30:00-05:00");
  const changes: ScenarioTransition[] = [{ at: 0, scenario: "clase_normal" }];
  let scenario = "clase_normal" as "clase_normal" | "aforo_excedido";
  const ds = new SimulatedDataSource({
    horario: HORARIO_DEFAULT,
    escenario: () => scenario,
    timeline: () => changes,
  });
  const range = {
    desde: new Date(start - 600_000),
    hasta: new Date(start),
    pasoMs: 60_000,
  };
  const before = ds.serie("L-419", "ocupacion", range);
  scenario = "aforo_excedido";
  changes.push({ at: start, scenario });
  expect(ds.serie("L-419", "ocupacion", range)).toEqual(before);
  expect(
    ds
      .medicionesActuales("L-419", new Date(start))
      .find((m) => m.magnitud === "ocupacion")?.valor,
  ).toBeGreaterThan(40);
});

it("aforo test scenario produces excess even on a weekend without a scheduled class", () => {
  expect(
    ocupacionAt(
      { aula: "L-419", escenario: "aforo_excedido", horario: HORARIO_DEFAULT },
      new Date("2026-09-06T15:30:00-05:00"),
    ),
  ).toBeGreaterThan(40);
});

describe("CO2 scenario uses elapsed time instead of resetting every hour", () => {
  it("continues above the critical threshold across an hour boundary", () => {
    const context = {
      aula: "A-1001" as const,
      escenario: "co2_alto" as const,
      horario: HORARIO_DEFAULT,
      scenarioStartMs: Date.parse("2026-09-06T14:30:00-05:00"),
    };
    expect(
      co2At(context, new Date("2026-09-06T15:00:00-05:00")),
    ).toBeGreaterThan(1500);
  });
});
