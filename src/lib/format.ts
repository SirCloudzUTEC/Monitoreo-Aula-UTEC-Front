// Formatting helpers for the UI (Spanish locale, Lima wall time).

import type { EstadoAula, EstadoPuerta, Magnitud, Severidad } from "@/lib/types";
import { LIMA_OFFSET_MS, DIAS_SEMANA } from "@/lib/schedule";
import { MAGNITUDES } from "@/lib/units";

/** "24.3 °C", "812 ppm", "abierta"… */
export function formatearValor(magnitud: Magnitud, valor: number | EstadoPuerta | undefined): string {
  if (valor === undefined) return "—";
  if (typeof valor === "string") return valor;
  const { decimales = 0, unidad } = MAGNITUDES[magnitud];
  return `${valor.toFixed(decimales)}${unidad ? ` ${unidad}` : ""}`;
}

function limaParts(ms: number): Date {
  return new Date(ms - LIMA_OFFSET_MS);
}

/** "14:05" in Lima wall time. */
export function horaCorta(ms: number): string {
  const d = limaParts(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "14:05:30" in Lima wall time. */
export function horaLarga(ms: number): string {
  const d = limaParts(ms);
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${horaCorta(ms)}:${ss}`;
}

/** "Lun 07/09 14:05" in Lima wall time. */
export function fechaHoraCorta(ms: number): string {
  const d = limaParts(ms);
  const dia = DIAS_SEMANA[d.getUTCDay()].slice(0, 3);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dia} ${dd}/${mo} ${horaCorta(ms)}`;
}

/** Parses an ISO ts (with offset) and formats it as fechaHoraCorta. */
export function fechaHoraDeIso(ts: string): string {
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? fechaHoraCorta(ms) : ts;
}

export const ETIQUETA_ESTADO: Record<EstadoAula, string> = {
  Cerrada: "Cerrada",
  Libre: "Libre",
  EnClase: "En clase",
  Alerta: "Alerta",
};

/** Tailwind classes for the classroom state chip. */
export const CLASE_ESTADO: Record<EstadoAula, string> = {
  Cerrada: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  Libre: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  EnClase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Alerta: "bg-red-600 text-white",
};

/** Same states for the dark classroom TV screen. */
export const CLASE_ESTADO_TV: Record<EstadoAula, string> = {
  Cerrada: "bg-zinc-700 text-zinc-100",
  Libre: "bg-sky-600 text-white",
  EnClase: "bg-emerald-600 text-white",
  Alerta: "bg-red-600 text-white",
};

export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  info: "Info",
  alerta: "Alerta",
  critico: "Crítico",
};

export const CLASE_SEVERIDAD: Record<Severidad, string> = {
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  alerta: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  critico: "bg-red-600 text-white",
};

/** "1 alerta", "3 alertas"; `pl` for irregular plurals. */
export function plural(n: number, sing: string, pl = `${sing}s`): string {
  return `${n} ${n === 1 ? sing : pl}`;
}

/** "hace 7 min", "hace 3 h", "hace 2 d" */
export function haceCuanto(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}
