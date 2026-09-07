import { beforeEach, describe, expect, it } from "vitest";
import { RuleEngine } from "@/lib/rules/engine";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import { isoLima } from "@/lib/simulator/generator";
import type { Aula, AulaCodigo, Magnitud, Medicion, NodoId, Umbrales } from "@/lib/types";
import aulasSeed from "@/data/aulas.json";
import umbralesSeed from "@/data/umbrales.json";

const AULAS = aulasSeed as Aula[];
const UMBRALES = umbralesSeed as Umbrales;

// Monday 2026-09-07 Lima: L-419 in class 08:00-10:00; free 10:00-11:00
const T0 = new Date("2026-09-07T08:30:00-05:00").getTime();
const FUERA_HORARIO = new Date("2026-09-07T05:00:00-05:00").getTime();
const MIN = 60_000;

function med(
  aula: AulaCodigo,
  magnitud: Magnitud,
  valor: Medicion["valor"],
  tMs: number,
  nodo: NodoId = "nodoAmbiental",
): Medicion {
  return { ts: isoLima(new Date(tMs)), aula, nodo, magnitud, valor, unidad: "" };
}

let engine: RuleEngine;

beforeEach(() => {
  engine = new RuleEngine({ umbrales: { ...UMBRALES }, horario: HORARIO_DEFAULT, aulas: AULAS });
});

describe("rule engine: persistence and hysteresis", () => {
  it("temperatura_fuera_confort opens only after 5 sustained minutes", () => {
    const abiertos: string[] = [];
    for (let m = 0; m <= 6; m++) {
      const emits = engine.process(med("L-419", "temperatura", 27.5, T0 + m * MIN));
      abiertos.push(...emits.filter((e) => e.accion === "abrir").map((e) => e.evento.tipo));
      if (m < 5) expect(abiertos).toHaveLength(0);
    }
    expect(abiertos).toEqual(["temperatura_fuera_confort"]);
  });

  it("a dip below threshold resets the persistence timer", () => {
    engine.process(med("L-419", "temperatura", 27.5, T0));
    engine.process(med("L-419", "temperatura", 25.0, T0 + 3 * MIN)); // resets
    const emits = engine.process(med("L-419", "temperatura", 27.5, T0 + 6 * MIN));
    expect(emits.filter((e) => e.accion === "abrir")).toHaveLength(0);
  });

  it("temperature alert closes only below the hysteresis band (25 °C)", () => {
    for (let m = 0; m <= 5; m++) engine.process(med("L-419", "temperatura", 28, T0 + m * MIN));
    expect(engine.eventosAbiertos("L-419")).toHaveLength(1);
    // 25.5 is under the 26 threshold but inside the hysteresis band: stays open
    engine.process(med("L-419", "temperatura", 25.5, T0 + 6 * MIN));
    expect(engine.eventosAbiertos("L-419")).toHaveLength(1);
    const emits = engine.process(med("L-419", "temperatura", 24.8, T0 + 7 * MIN));
    expect(emits.some((e) => e.accion === "cerrar")).toBe(true);
    expect(engine.eventosAbiertos("L-419")).toHaveLength(0);
  });

  it("co2_aviso and co2_alerta require 10 simulated minutes each (criterio 3)", () => {
    const tipos: string[] = [];
    for (let m = 0; m <= 11; m++) {
      const emits = engine.process(med("A-1001", "co2", 1600, T0 + m * MIN));
      tipos.push(...emits.filter((e) => e.accion === "abrir").map((e) => e.evento.tipo));
      if (m < 10) expect(tipos).toHaveLength(0);
    }
    expect(tipos).toContain("co2_aviso");
    expect(tipos).toContain("co2_alerta");
  });

  it("aforo_excedido opens immediately as critical and drives estado to Alerta", () => {
    const emits = engine.process(med("L-419", "ocupacion", 45, T0, "nodoPuerta"));
    const abre = emits.find((e) => e.accion === "abrir");
    expect(abre?.evento.tipo).toBe("aforo_excedido");
    expect(abre?.evento.severidad).toBe("critico");
    expect(engine.getEstado("L-419", new Date(T0))).toBe("Alerta");
  });

  it("acknowledging the alert returns the classroom to EnClase (criterio 2)", () => {
    const emits = engine.process(med("L-419", "ocupacion", 45, T0, "nodoPuerta"));
    const id = emits.find((e) => e.accion === "abrir")!.evento.id_evento;
    const ev = engine.acusar("L-419", id, "moderador", T0 + MIN);
    expect(ev?.acuse?.actor).toBe("moderador");
    expect(engine.getEstado("L-419", new Date(T0 + MIN))).toBe("EnClase");
  });

  it("puerta_abierta opens after 10 min in class and closes when the door shuts", () => {
    for (let m = 0; m <= 10; m++) {
      engine.process(med("L-419", "puerta", "abierta", T0 + m * MIN, "nodoPuerta"));
    }
    expect(engine.eventosAbiertos("L-419").map((e) => e.tipo)).toContain("puerta_abierta");
    const emits = engine.process(med("L-419", "puerta", "cerrada", T0 + 11 * MIN, "nodoPuerta"));
    expect(emits.some((e) => e.accion === "cerrar")).toBe(true);
  });

  it("proximidad_ventana fires only under surveillance (outside operating hours)", () => {
    // during class: person near window is normal, no event
    for (let s = 0; s <= 5; s++) {
      const e = engine.process(med("L-419", "proximidad_ventana", 0.5, T0 + s * 5000, "nodoVentana1"));
      expect(e.filter((x) => x.accion === "abrir")).toHaveLength(0);
    }
    // at 05:00 (building closed): opens after 3 sustained seconds
    let abiertos = 0;
    for (let s = 0; s <= 2; s++) {
      const e = engine.process(
        med("L-419", "proximidad_ventana", 0.5, FUERA_HORARIO + s * 5000, "nodoVentana1"),
      );
      abiertos += e.filter((x) => x.accion === "abrir").length;
    }
    expect(abiertos).toBe(1);
  });

  it("bateria_baja opens under 20 % on the reporting node", () => {
    const emits = engine.process(med("L-419", "bateria", 15, T0, "nodoPuerta"));
    expect(emits.find((e) => e.accion === "abrir")?.evento.tipo).toBe("bateria_baja");
  });
});

describe("rule engine: watchdogs and schedule (tick)", () => {
  it("nodo_sin_datos after 15 min without heartbeat; recovers on next heartbeat", () => {
    engine.process(med("L-419", "latido", 1, T0, "nodoAmbiental"));
    expect(engine.tick(T0 + 10 * MIN)).toHaveLength(0);
    const emits = engine.tick(T0 + 16 * MIN);
    expect(emits.find((e) => e.accion === "abrir")?.evento.tipo).toBe("nodo_sin_datos");
    const rec = engine.process(med("L-419", "latido", 1, T0 + 17 * MIN, "nodoAmbiental"));
    expect(rec.some((e) => e.accion === "cerrar")).toBe(true);
  });

  it("procesador_offline after 60 s without processor heartbeat (critical)", () => {
    engine.process(med("L-419", "latido", 1, T0, "procesadorAula"));
    const emits = engine.tick(T0 + 90 * 1000);
    const abre = emits.find((e) => e.accion === "abrir");
    expect(abre?.evento.tipo).toBe("procesador_offline");
    expect(abre?.evento.severidad).toBe("critico");
  });

  it("emits inicio_clase and fin_clase on schedule transitions", () => {
    const antes = new Date("2026-09-07T07:59:00-05:00").getTime();
    const dentro = new Date("2026-09-07T08:00:30-05:00").getTime();
    const despues = new Date("2026-09-07T10:00:30-05:00").getTime();
    engine.tick(antes);
    const inicio = engine.tick(dentro);
    expect(inicio.map((e) => e.evento.tipo)).toContain("inicio_clase");
    const fin = engine.tick(despues);
    expect(fin.map((e) => e.evento.tipo)).toContain("fin_clase");
  });

  it("estado follows the schedule: Cerrada / EnClase / Libre", () => {
    expect(engine.getEstado("L-419", new Date("2026-09-07T05:00:00-05:00"))).toBe("Cerrada");
    expect(engine.getEstado("L-419", new Date("2026-09-07T08:30:00-05:00"))).toBe("EnClase");
    expect(engine.getEstado("L-419", new Date("2026-09-07T10:30:00-05:00"))).toBe("Libre");
  });

  it("ingreso/egreso info events follow occupancy changes", () => {
    engine.process(med("L-419", "ocupacion", 10, T0, "nodoPuerta"));
    const sube = engine.process(med("L-419", "ocupacion", 12, T0 + MIN, "nodoPuerta"));
    expect(sube.map((e) => e.evento.tipo)).toContain("ingreso");
    const baja = engine.process(med("L-419", "ocupacion", 11, T0 + 2 * MIN, "nodoPuerta"));
    expect(baja.map((e) => e.evento.tipo)).toContain("egreso");
  });
});
