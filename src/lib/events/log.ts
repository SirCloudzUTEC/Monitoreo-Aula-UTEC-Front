// Event log (SYS-10.1): exact 10-column CSV, footprint per actor, 90-day retention.

import type { AulaCodigo, Evento } from "@/lib/types";

/** Rows beyond catalog events: configuration changes and acknowledgements also leave traces. */
export type TipoLog = Evento["tipo"] | "cambio_configuracion" | "acuse";

export interface LogRow extends Omit<Evento, "tipo"> {
  tipo: TipoLog;
}

export const RETENCION_DIAS = 90;

export const COLUMNAS_CSV = [
  "ts",
  "aula",
  "id_evento",
  "tipo",
  "severidad",
  "fuente",
  "valor",
  "umbral",
  "actor",
  "estado_resultante",
] as const;

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** SYS-10.1 CSV: header + one row per event, exact column order. */
export function exportarCsv(rows: LogRow[]): string {
  const header = COLUMNAS_CSV.join(",");
  const body = rows.map((r) =>
    COLUMNAS_CSV.map((c) => csvEscape(String(r[c] ?? ""))).join(","),
  );
  return [header, ...body].join("\r\n") + "\r\n";
}

export function nombreArchivoCsv(aula: AulaCodigo | "todas"): string {
  return aula === "todas" ? "log_aulas.csv" : `log_aula_${aula}.csv`;
}

/** Drop rows older than the retention window. */
export function aplicarRetencion(rows: LogRow[], ahoraMs: number): LogRow[] {
  const limite = ahoraMs - RETENCION_DIAS * 24 * 3600_000;
  return rows.filter((r) => new Date(r.ts).getTime() >= limite);
}

export interface FiltroLog {
  aula?: AulaCodigo | "todas";
  severidad?: Evento["severidad"] | "todas";
  tipo?: TipoLog | "todos";
  actor?: string;
  desdeMs?: number;
  hastaMs?: number;
  texto?: string;
}

export function filtrarLog(rows: LogRow[], f: FiltroLog): LogRow[] {
  return rows.filter((r) => {
    if (f.aula && f.aula !== "todas" && r.aula !== f.aula) return false;
    if (f.severidad && f.severidad !== "todas" && r.severidad !== f.severidad) return false;
    if (f.tipo && f.tipo !== "todos" && r.tipo !== f.tipo) return false;
    if (f.actor && r.actor !== f.actor) return false;
    const t = new Date(r.ts).getTime();
    if (f.desdeMs !== undefined && t < f.desdeMs) return false;
    if (f.hastaMs !== undefined && t > f.hastaMs) return false;
    if (f.texto) {
      const txt = f.texto.toLowerCase();
      const hay = `${r.tipo} ${r.fuente} ${r.valor} ${r.umbral} ${r.actor}`.toLowerCase();
      if (!hay.includes(txt)) return false;
    }
    return true;
  });
}

/**
 * Footprint (SysML): the ordered sequence of events a given actor originated
 * within a date range.
 */
export function footprint(
  rows: LogRow[],
  actor: string,
  desdeMs: number,
  hastaMs: number,
): LogRow[] {
  return rows
    .filter((r) => {
      const t = new Date(r.ts).getTime();
      return r.actor === actor && t >= desdeMs && t <= hastaMs;
    })
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

/** Distinct actors present in the log (for the footprint selector). */
export function actoresEnLog(rows: LogRow[]): string[] {
  return [...new Set(rows.map((r) => r.actor))].sort();
}
