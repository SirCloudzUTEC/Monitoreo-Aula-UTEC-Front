import { describe, expect, it } from "vitest";
import {
  COLUMNAS_CSV,
  aplicarRetencion,
  actoresEnLog,
  exportarCsv,
  filtrarLog,
  footprint,
  nombreArchivoCsv,
  type LogRow,
} from "@/lib/events/log";

function row(overrides: Partial<LogRow>): LogRow {
  return {
    ts: "2026-09-07T08:30:00-05:00",
    aula: "L-419",
    id_evento: "EV-00001",
    tipo: "aforo_excedido",
    severidad: "critico",
    fuente: "nodoPuerta",
    valor: "45 personas",
    umbral: "> 40 personas",
    actor: "motorReglas",
    estado_resultante: "Alerta",
    ...overrides,
  };
}

describe("event log CSV (SYS-10.1)", () => {
  it("exports exactly the 10 required columns in order", () => {
    expect(COLUMNAS_CSV).toEqual([
      "ts", "aula", "id_evento", "tipo", "severidad",
      "fuente", "valor", "umbral", "actor", "estado_resultante",
    ]);
    const csv = exportarCsv([row({})]);
    const [header, first] = csv.trim().split("\r\n");
    expect(header).toBe("ts,aula,id_evento,tipo,severidad,fuente,valor,umbral,actor,estado_resultante");
    expect(first.split(",").length).toBe(10);
  });

  it("escapes commas and quotes safely", () => {
    const csv = exportarCsv([row({ valor: 'raro, con "comillas"' })]);
    expect(csv).toContain('"raro, con ""comillas"""');
  });

  it("names the file log_aula_{codigo}.csv", () => {
    expect(nombreArchivoCsv("L-419")).toBe("log_aula_L-419.csv");
  });

  it("applies the 90-day retention window", () => {
    const viejo = row({ id_evento: "EV-1", ts: "2026-05-01T08:00:00-05:00" });
    const nuevo = row({ id_evento: "EV-2", ts: "2026-09-01T08:00:00-05:00" });
    const ahora = new Date("2026-09-07T00:00:00-05:00").getTime();
    const out = aplicarRetencion([viejo, nuevo], ahora);
    expect(out.map((r) => r.id_evento)).toEqual(["EV-2"]);
  });

  it("filters by aula, severidad and free text", () => {
    const rows = [
      row({ id_evento: "EV-1" }),
      row({ id_evento: "EV-2", aula: "A-1001", severidad: "alerta", tipo: "co2_aviso" }),
    ];
    expect(filtrarLog(rows, { aula: "A-1001" }).map((r) => r.id_evento)).toEqual(["EV-2"]);
    expect(filtrarLog(rows, { severidad: "critico" }).map((r) => r.id_evento)).toEqual(["EV-1"]);
    expect(filtrarLog(rows, { texto: "co2" }).map((r) => r.id_evento)).toEqual(["EV-2"]);
  });

  it("footprint returns only the actor's events, ordered in time", () => {
    const rows = [
      row({ id_evento: "EV-3", actor: "moderador", ts: "2026-09-07T10:00:00-05:00" }),
      row({ id_evento: "EV-1", actor: "moderador", ts: "2026-09-07T08:00:00-05:00" }),
      row({ id_evento: "EV-2", actor: "simulador", ts: "2026-09-07T09:00:00-05:00" }),
    ];
    const desde = new Date("2026-09-07T00:00:00-05:00").getTime();
    const hasta = new Date("2026-09-08T00:00:00-05:00").getTime();
    const fp = footprint(rows, "moderador", desde, hasta);
    expect(fp.map((r) => r.id_evento)).toEqual(["EV-1", "EV-3"]);
    expect(actoresEnLog(rows)).toEqual(["moderador", "simulador"]);
  });
});
