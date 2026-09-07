import { describe, expect, it } from "vitest";
import { historial, isoLima, medicionesEnTick } from "@/lib/simulator/generator";
import { co2At, ocupacionAt } from "@/lib/simulator/profiles";
import { HORARIO_DEFAULT, claseEnCurso, proximoBloque } from "@/lib/schedule";

// Monday 2026-09-07 in Lima: L-419 has Cálculo II 08:00-10:00
const LUNES_CLASE = new Date("2026-09-07T08:30:00-05:00");
const DOMINGO_MADRUGADA = new Date("2026-09-06T03:00:00-05:00");

describe("simulator generator", () => {
  it("emits SYS-09.2 shaped measurements with Lima offset timestamps", () => {
    const ms = medicionesEnTick("L-419", "clase_normal", HORARIO_DEFAULT, LUNES_CLASE);
    expect(ms.length).toBeGreaterThan(5);
    for (const m of ms) {
      expect(m.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
      expect(m.aula).toBe("L-419");
      expect(m).toHaveProperty("nodo");
      expect(m).toHaveProperty("magnitud");
      expect(m).toHaveProperty("valor");
      expect(m).toHaveProperty("unidad");
    }
  });

  it("is deterministic: same instant produces identical measurements", () => {
    const a = medicionesEnTick("L-419", "clase_normal", HORARIO_DEFAULT, LUNES_CLASE);
    const b = medicionesEnTick("L-419", "clase_normal", HORARIO_DEFAULT, new Date(LUNES_CLASE));
    expect(a).toEqual(b);
  });

  it("keeps the classroom empty outside schedule", () => {
    const ctx = { aula: "L-419" as const, escenario: "clase_normal" as const, horario: HORARIO_DEFAULT };
    expect(ocupacionAt(ctx, DOMINGO_MADRUGADA)).toBe(0);
  });

  it("aforo_excedido pushes occupancy above the 40-person capacity", () => {
    const ctx = { aula: "L-419" as const, escenario: "aforo_excedido" as const, horario: HORARIO_DEFAULT };
    // well inside the class, past the ramp-in
    const t = new Date("2026-09-07T09:00:00-05:00");
    expect(ocupacionAt(ctx, t)).toBeGreaterThan(40);
  });

  it("co2_alto scenario passes 1500 ppm after ~20 minutes of build-up", () => {
    const ctx = { aula: "A-1001" as const, escenario: "co2_alto" as const, horario: HORARIO_DEFAULT };
    const inicio = new Date("2026-09-07T14:02:00-05:00");
    const luego = new Date("2026-09-07T14:30:00-05:00");
    expect(co2At(ctx, inicio)).toBeLessThan(1500);
    expect(co2At(ctx, luego)).toBeGreaterThan(1500);
  });

  it("A-1001 has no window nodes, L-419 reports proximity for two", () => {
    const conVentanas = medicionesEnTick("L-419", "clase_normal", HORARIO_DEFAULT, LUNES_CLASE);
    const sinVentanas = medicionesEnTick("A-1001", "clase_normal", HORARIO_DEFAULT, LUNES_CLASE);
    const proxL = conVentanas.filter((m) => m.magnitud === "proximidad_ventana");
    const proxA = sinVentanas.filter((m) => m.magnitud === "proximidad_ventana");
    expect(proxL.length).toBe(2);
    expect(proxA.length).toBe(0);
  });

  it("nodo_caido silences the ambient node", () => {
    const caido = medicionesEnTick("L-419", "nodo_caido", HORARIO_DEFAULT, LUNES_CLASE);
    expect(caido.some((m) => m.nodo === "nodoAmbiental")).toBe(false);
    expect(caido.some((m) => m.nodo === "nodoPuerta")).toBe(true);
  });

  it("historial samples the requested range at the requested step", () => {
    const desde = new Date("2026-09-07T08:00:00-05:00");
    const hasta = new Date("2026-09-07T09:00:00-05:00");
    const serie = historial("L-419", "clase_normal", HORARIO_DEFAULT, "temperatura", desde, hasta, 60_000);
    expect(serie.length).toBe(60);
    expect(serie[0].ts).toMatch(/-05:00$/);
  });
});

describe("schedule (Lima wall time)", () => {
  it("detects a class in progress regardless of host timezone", () => {
    expect(claseEnCurso(HORARIO_DEFAULT, "L-419", LUNES_CLASE)).toBe(true);
    expect(claseEnCurso(HORARIO_DEFAULT, "L-419", DOMINGO_MADRUGADA)).toBe(false);
  });

  it("finds the next scheduled block in the future", () => {
    const p = proximoBloque(HORARIO_DEFAULT, "L-419", DOMINGO_MADRUGADA);
    expect(p).not.toBeNull();
    expect(p!.inicia.getTime()).toBeGreaterThan(DOMINGO_MADRUGADA.getTime());
    expect(p!.bloque.curso).toBe("Cálculo II"); // Monday 08:00
  });

  it("isoLima formats with the fixed -05:00 offset", () => {
    expect(isoLima(new Date("2026-09-03T19:05:00Z"))).toBe("2026-09-03T14:05:00-05:00");
  });
});
