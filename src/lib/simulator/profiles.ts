// Deterministic value profiles: every magnitude is a pure function of
// (aula, escenario, horario, timestamp). This keeps the simulator stateless,
// reproducible and cheap to sample at any resolution (charts, APIs, engine).

import type {
  Aula,
  AulaCodigo,
  Escenario,
  EstadoPuerta,
  Horario,
  Magnitud,
} from "@/lib/types";
import {
  bloqueEnCurso,
  claseEnCurso,
  enHorarioOperacion,
  horaLima,
  minutosDeClase,
  minutosRestantes,
} from "@/lib/schedule";

/** Fractional hour of day in Lima wall time (offset is whole hours, so UTC minutes are Lima minutes). */
function horaFrac(fecha: Date): number {
  return horaLima(fecha) + fecha.getUTCMinutes() / 60;
}
import { gaussAt, noiseAt, smoothNoise } from "./rng";
import aulasSeed from "@/data/aulas.json";

const AULAS = aulasSeed as Aula[];

export function getAula(codigo: AulaCodigo): Aula {
  const a = AULAS.find((x) => x.codigo === codigo);
  if (!a) throw new Error(`Aula desconocida: ${codigo}`);
  return a;
}

export interface PerfilContexto {
  aula: AulaCodigo;
  escenario: Escenario;
  horario: Horario;
}

const MIN = 60_000;

function key(ctx: PerfilContexto, mag: string): string {
  return `${ctx.aula}:${mag}`;
}

/** People inside the classroom at time t (deterministic). */
export function ocupacionAt(ctx: PerfilContexto, fecha: Date): number {
  const { aula, escenario, horario } = ctx;
  if (escenario === "aula_libre") return 0;
  const bloque = bloqueEnCurso(horario, aula, fecha);
  if (!bloque) return 0;
  const dentro = minutosDeClase(horario, aula, fecha);
  const restan = minutosRestantes(horario, aula, fecha);
  const cfg = getAula(aula);
  // deterministic class size for this specific block instance
  const dayBucket = Math.floor(fecha.getTime() / (24 * 60 * MIN));
  let objetivo = Math.round(cfg.aforo * (0.55 + 0.3 * noiseAt(key(ctx, "clase"), dayBucket)));
  if (escenario === "aforo_excedido") objetivo = cfg.aforo + 5;
  // ramp in during first 10 minutes, ramp out during last 5
  let n = objetivo;
  if (dentro < 10) n = Math.round((objetivo * dentro) / 10);
  if (restan < 5) n = Math.round((objetivo * restan) / 5);
  // small churn during the class
  const churn = Math.round(smoothNoise(key(ctx, "churn"), fecha.getTime() / (5 * MIN)) * 2);
  return Math.max(0, n + (dentro >= 10 && restan >= 5 ? churn : 0));
}

/** CO2 in ppm. Depends on occupancy history in closed form. */
export function co2At(ctx: PerfilContexto, fecha: Date): number {
  const { aula, escenario, horario } = ctx;
  const base = 420;
  const cfg = getAula(aula);
  const dentro = minutosDeClase(horario, aula, fecha);
  const ocup = ocupacionAt(ctx, fecha);
  // saturating build-up with occupancy; rooms without windows accumulate more
  const ventilacion = cfg.ventanas > 0 ? 1 : 1.9;
  let v = base + ocup * 11 * ventilacion * (1 - Math.exp(-dentro / 25));
  if (escenario === "co2_alto") {
    // forced ramp: reaches ~1100 ppm at 5 min, ~1700 ppm from 20 min on
    const minutos = minutosEnEscenario(ctx, fecha);
    v = Math.max(v, 420 + 1300 * (1 - Math.exp(-minutos / 8)));
  }
  // decay back to baseline after class (approximate via minutes since last block)
  if (ocup === 0 && !claseEnCurso(horario, aula, fecha) && escenario !== "co2_alto") {
    v = base + 80 * Math.max(0, smoothNoise(key(ctx, "co2r"), fecha.getTime() / (30 * MIN)));
  }
  return Math.round(v + gaussAt(key(ctx, "co2"), Math.floor(fecha.getTime() / (5 * MIN))) * 15);
}

/**
 * Scenario clock: minutes since the scenario "started". Scenarios are anchored
 * to the start of the current hour so effects build up deterministically.
 */
export function minutosEnEscenario(_ctx: PerfilContexto, fecha: Date): number {
  return fecha.getUTCMinutes() + fecha.getUTCSeconds() / 60;
}

export function temperaturaAt(ctx: PerfilContexto, fecha: Date): number {
  const cfg = getAula(ctx.aula);
  const hf = horaFrac(fecha);
  // diurnal wave: min ~06:00, max ~15:00 (Lima summer-ish)
  const diurna = 22.5 + 4.5 * Math.sin(((hf - 9) / 24) * 2 * Math.PI);
  const sinAC = cfg.aireAcondicionado ? 0 : 2.2; // A-1001 runs hotter
  const porGente = ocupacionAt(ctx, fecha) * 0.05;
  const ruido = smoothNoise(key(ctx, "temp"), fecha.getTime() / (10 * MIN)) * 0.6;
  return Math.round((diurna + sinAC + porGente + ruido) * 10) / 10;
}

export function humedadAt(ctx: PerfilContexto, fecha: Date): number {
  const hf = horaFrac(fecha);
  const diurna = 55 - 8 * Math.sin(((hf - 9) / 24) * 2 * Math.PI);
  const porGente = ocupacionAt(ctx, fecha) * 0.12;
  const ruido = smoothNoise(key(ctx, "hum"), fecha.getTime() / (15 * MIN)) * 3;
  return Math.round(Math.min(95, Math.max(15, diurna + porGente + ruido)) * 10) / 10;
}

export function luxAt(ctx: PerfilContexto, fecha: Date): number {
  const { aula, horario } = ctx;
  const cfg = getAula(aula);
  const enClase = claseEnCurso(horario, aula, fecha);
  const hf = horaFrac(fecha);
  const luzDia =
    cfg.ventanas > 0 ? Math.max(0, Math.sin(((hf - 6) / 13) * Math.PI)) * 120 : 5;
  const luces = enClase ? 480 : 0;
  const ruido = smoothNoise(key(ctx, "lux"), fecha.getTime() / (5 * MIN)) * 25;
  return Math.max(0, Math.round(luzDia + luces + ruido));
}

export function ruidoAt(ctx: PerfilContexto, fecha: Date): number {
  const ocup = ocupacionAt(ctx, fecha);
  const base = ocup > 0 ? 52 + Math.min(14, ocup * 0.35) : 34;
  const rafaga =
    Math.max(0, smoothNoise(key(ctx, "ruidoB"), fecha.getTime() / (2 * MIN))) * (ocup > 0 ? 14 : 4);
  const ruido = gaussAt(key(ctx, "ruido"), Math.floor(fecha.getTime() / (1 * MIN))) * 2;
  return Math.round((base + rafaga + ruido) * 10) / 10;
}

export function pm25At(ctx: PerfilContexto, fecha: Date): number {
  const base = 10 + 6 * Math.max(0, smoothNoise(key(ctx, "pm"), fecha.getTime() / (60 * MIN)));
  const porGente = ocupacionAt(ctx, fecha) * 0.08;
  return Math.round((base + porGente) * 10) / 10;
}

export function vocAt(ctx: PerfilContexto, fecha: Date): number {
  const base = 80 + 50 * Math.max(0, smoothNoise(key(ctx, "voc"), fecha.getTime() / (30 * MIN)));
  const porGente = ocupacionAt(ctx, fecha) * 1.2;
  return Math.round(base + porGente);
}

export function puertaAt(ctx: PerfilContexto, fecha: Date): EstadoPuerta {
  const { aula, escenario, horario } = ctx;
  if (escenario === "puerta_trabada") return "abierta";
  if (!enHorarioOperacion(fecha)) return "asegurada";
  const dentro = minutosDeClase(horario, aula, fecha);
  const restan = minutosRestantes(horario, aula, fecha);
  const enClase = claseEnCurso(horario, aula, fecha);
  // door open while people flow in/out around class boundaries
  if (enClase && (dentro < 8 || restan < 3)) return "abierta";
  if (enClase) return "cerrada";
  return "cerrada";
}

export function proximidadVentanaAt(ctx: PerfilContexto, fecha: Date): number {
  if (ctx.escenario === "intruso_ventana") {
    const m = minutosEnEscenario(ctx, fecha);
    // intruder approaches during minutes 2..12 of each hour
    if (m > 2 && m < 12) return Math.round((0.4 + 0.3 * noiseAt("intruso", Math.floor(m))) * 100) / 100;
  }
  const base = 4.5 + smoothNoise(`${ctx.aula}:prox`, fecha.getTime() / (10 * MIN)) * 1.2;
  return Math.round(base * 100) / 100;
}

export function bateriaAt(ctx: PerfilContexto, nodo: string, fecha: Date): number {
  // slow sawtooth discharge over ~20 days, offset per node
  const horas = fecha.getTime() / (60 * MIN);
  const offset = (noiseAt(`${ctx.aula}:${nodo}:bat`, 0) * 500) | 0;
  const ciclo = 100 - (((horas + offset) * 0.2) % 85);
  return Math.round(ciclo * 10) / 10;
}

/** Whether a node is alive at t (nodo_caido kills nodoAmbiental). */
export function nodoVivo(ctx: PerfilContexto, nodo: string, _fecha: Date): boolean {
  if (ctx.escenario === "nodo_caido" && nodo === "nodoAmbiental") return false;
  return true;
}

export function valorMagnitud(
  ctx: PerfilContexto,
  magnitud: Magnitud,
  fecha: Date,
): number | EstadoPuerta {
  switch (magnitud) {
    case "temperatura":
      return temperaturaAt(ctx, fecha);
    case "humedad":
      return humedadAt(ctx, fecha);
    case "co2":
      return co2At(ctx, fecha);
    case "pm25":
      return pm25At(ctx, fecha);
    case "voc":
      return vocAt(ctx, fecha);
    case "lux":
      return luxAt(ctx, fecha);
    case "ruido":
      return ruidoAt(ctx, fecha);
    case "presencia":
      return ocupacionAt(ctx, fecha) > 0 ? 1 : 0;
    case "ocupacion":
      return ocupacionAt(ctx, fecha);
    case "puerta":
      return puertaAt(ctx, fecha);
    case "proximidad_ventana":
      return proximidadVentanaAt(ctx, fecha);
    case "bateria":
      return bateriaAt(ctx, "nodoPuerta", fecha);
    case "latido":
      return 1;
  }
}

export const UNIDADES: Record<Magnitud, string> = {
  temperatura: "°C",
  humedad: "%",
  co2: "ppm",
  pm25: "µg/m³",
  voc: "índice",
  lux: "lx",
  ruido: "dBA",
  presencia: "0/1",
  ocupacion: "personas",
  puerta: "estado",
  proximidad_ventana: "m",
  bateria: "%",
  latido: "1",
};
