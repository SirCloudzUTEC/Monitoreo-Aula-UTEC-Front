// Turns the deterministic profiles into SYS-09.2 measurements, tick by tick.
// Equivalent MQTT topic (phase 2, documented only): utec/aula/{codigo}/{nodo}/{magnitud} QoS 1.

import type { Aula, AulaCodigo, Escenario, Horario, Medicion, NodoId } from "@/lib/types";
import { getAula, nodoVivo, valorMagnitud, UNIDADES, type PerfilContexto } from "./profiles";
import { bateriaAt } from "./profiles";
import type { Magnitud } from "@/lib/types";

export const TICK_MS = 5_000; // SYS latency budget: telemetry every 5 s

/** ISO-8601 with the fixed Lima offset, e.g. 2026-09-03T14:05:00-05:00 */
export function isoLima(fecha: Date): string {
  const t = new Date(fecha.getTime() - 5 * 3600_000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}` +
    `T${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}-05:00`
  );
}

export function topicMqtt(aula: AulaCodigo, nodo: NodoId, magnitud: Magnitud): string {
  return `utec/aula/${aula}/${nodo}/${magnitud}`;
}

const MAGNITUDES_AMBIENTALES: Magnitud[] = [
  "temperatura",
  "humedad",
  "co2",
  "pm25",
  "voc",
  "lux",
  "ruido",
  "presencia",
];

const LATIDO_MS = 5 * 60_000; // each node heartbeats every 5 min

function alignTick(ms: number): number {
  return Math.floor(ms / TICK_MS) * TICK_MS;
}

/** All measurements every node of `aula` publishes at the 5-second tick containing `fecha`. */
export function medicionesEnTick(
  aula: AulaCodigo,
  escenario: Escenario,
  horario: Horario,
  fecha: Date,
): Medicion[] {
  const ctx: PerfilContexto = { aula, escenario, horario };
  const cfg: Aula = getAula(aula);
  const tickMs = alignTick(fecha.getTime());
  const tick = new Date(tickMs);
  const ts = isoLima(tick);
  const out: Medicion[] = [];

  const push = (nodo: NodoId, magnitud: Magnitud, valor: Medicion["valor"]) =>
    out.push({ ts, aula, nodo, magnitud, valor, unidad: UNIDADES[magnitud] });

  // nodoAmbiental: environmental bundle every tick
  if (nodoVivo(ctx, "nodoAmbiental", tick)) {
    for (const m of MAGNITUDES_AMBIENTALES) push("nodoAmbiental", m, valorMagnitud(ctx, m, tick));
    if (tickMs % LATIDO_MS === 0) push("nodoAmbiental", "latido", 1);
  }

  // nodoPuerta: occupancy + door state + battery/heartbeat
  if (nodoVivo(ctx, "nodoPuerta", tick)) {
    push("nodoPuerta", "ocupacion", valorMagnitud(ctx, "ocupacion", tick));
    push("nodoPuerta", "puerta", valorMagnitud(ctx, "puerta", tick));
    if (tickMs % LATIDO_MS === 0) {
      push("nodoPuerta", "bateria", bateriaAt(ctx, "nodoPuerta", tick));
      push("nodoPuerta", "latido", 1);
    }
  }

  // nodoVentana (only rooms with windows)
  const ventanas: NodoId[] = cfg.nodos.filter((n) => n.startsWith("nodoVentana")) as NodoId[];
  for (const nodo of ventanas) {
    if (!nodoVivo(ctx, nodo, tick)) continue;
    push(nodo, "proximidad_ventana", valorMagnitud(ctx, "proximidad_ventana", tick));
    if (tickMs % LATIDO_MS === 0) {
      push(nodo, "bateria", bateriaAt(ctx, nodo, tick));
      push(nodo, "latido", 1);
    }
  }

  // procesadorAula: heartbeat every tick (procesador_offline rule watches this)
  if (nodoVivo(ctx, "procesadorAula", tick)) push("procesadorAula", "latido", 1);

  return out;
}

/**
 * Sampled history for charts: one snapshot of the ambient magnitudes every
 * `pasoMs` between `desde` and `hasta` (inclusive-exclusive).
 */
export function historial(
  aula: AulaCodigo,
  escenario: Escenario,
  horario: Horario,
  magnitud: Magnitud,
  desde: Date,
  hasta: Date,
  pasoMs: number,
): { ts: string; t: number; valor: number }[] {
  const ctx: PerfilContexto = { aula, escenario, horario };
  const out: { ts: string; t: number; valor: number }[] = [];
  for (let t = alignTick(desde.getTime()); t < hasta.getTime(); t += pasoMs) {
    const d = new Date(t);
    const v = valorMagnitud(ctx, magnitud, d);
    out.push({ ts: isoLima(d), t, valor: typeof v === "number" ? v : v === "abierta" ? 1 : 0 });
  }
  return out;
}
