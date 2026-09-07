// Formatting helpers for the UI (Spanish locale, Lima wall time).

import type { EstadoAula, EstadoPuerta, Magnitud } from "@/lib/types";
import { LIMA_OFFSET_MS, DIAS_SEMANA } from "@/lib/schedule";
import { UNIDADES } from "@/lib/simulator/profiles";

const DECIMALES: Partial<Record<Magnitud, number>> = {
  temperatura: 1,
  humedad: 0,
  co2: 0,
  pm25: 1,
  voc: 0,
  lux: 0,
  ruido: 1,
  ocupacion: 0,
  proximidad_ventana: 2,
  bateria: 0,
};

/** "24.3 °C", "812 ppm", "abierta"… */
export function formatearValor(magnitud: Magnitud, valor: number | EstadoPuerta | undefined): string {
  if (valor === undefined) return "—";
  if (typeof valor === "string") return valor;
  const dec = DECIMALES[magnitud] ?? 0;
  const unidad = UNIDADES[magnitud];
  return `${valor.toFixed(dec)}${unidad ? ` ${unidad}` : ""}`;
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

export const ETIQUETA_MAGNITUD: Record<Magnitud, string> = {
  temperatura: "Temperatura",
  humedad: "Humedad relativa",
  co2: "CO₂",
  pm25: "PM2.5",
  voc: "VOC",
  lux: "Iluminancia",
  ruido: "Ruido",
  presencia: "Presencia",
  ocupacion: "Ocupación",
  puerta: "Puerta",
  proximidad_ventana: "Proximidad a ventana",
  bateria: "Batería",
  latido: "Latido",
};
