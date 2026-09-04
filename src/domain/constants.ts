import type { AulaId, Umbrales } from "@/domain/types";
import type { Magnitud } from "@/domain/enums";

export const AULA_IDS: AulaId[] = ["L-419", "A-1001"];

export const AULA_NOMBRES: Record<AulaId, { nombre: string; edificio: string; piso: string }> = {
  "L-419": { nombre: "Laboratorio 419", edificio: "Edificio L", piso: "Piso 4" },
  "A-1001": { nombre: "Aula 1001", edificio: "Edificio A", piso: "Piso 10" },
};

/** Rango físico de instrumento, punto de operación "normal" y unidad, por magnitud. */
export const RANGO_MAGNITUD: Record<
  Magnitud,
  { min: number; max: number; target: number; unidad: string; decimales: number; stdDev: number; pull: number }
> = {
  temperatura: { min: 0, max: 50, target: 24.5, unidad: "°C", decimales: 1, stdDev: 0.15, pull: 0.04 },
  humedad: { min: 20, max: 90, target: 48, unidad: "%", decimales: 0, stdDev: 0.8, pull: 0.03 },
  co2: { min: 400, max: 5000, target: 650, unidad: "ppm", decimales: 0, stdDev: 15, pull: 0.03 },
  pm25: { min: 0, max: 500, target: 12, unidad: "µg/m³", decimales: 1, stdDev: 1.2, pull: 0.03 },
  ruido: { min: 35, max: 110, target: 48, unidad: "dBA", decimales: 0, stdDev: 1.5, pull: 0.05 },
  iluminancia: { min: 0, max: 10000, target: 520, unidad: "lux", decimales: 0, stdDev: 20, pull: 0.04 },
  aforo: { min: 0, max: 60, target: 18, unidad: "personas", decimales: 0, stdDev: 1, pull: 0.05 },
  puerta: { min: 0, max: 1, target: 0, unidad: "", decimales: 0, stdDev: 0, pull: 0 },
  proximidad_ventana: { min: 0, max: 5, target: 3, unidad: "m", decimales: 1, stdDev: 0.3, pull: 0.06 },
  bateria: { min: 0, max: 100, target: 82, unidad: "%", decimales: 0, stdDev: 0.05, pull: 0.01 },
};

export const UMBRALES_DEFAULT: Umbrales = {
  temperaturaConfortMin: 25,
  temperaturaConfortMax: 26,
  hrConfortMin: 30,
  hrConfortMax: 65,
  co2AvisoPpm: 1000,
  co2AlertaPpm: 1500,
  pm25AlertaUgM3: 35,
  ruidoAlertaDba: 70,
  iluminanciaMinLux: 300,
  puertaAbiertaMinFueraHorarioMin: 5,
  puertaAbiertaMinEnClaseMin: 10,
  bateriaBajaPct: 20,
};

export const AFORO_MAXIMO_DEFAULT = 40;

/**
 * Duraciones "sostenido" reales (minutos) según los requisitos del sistema,
 * y su versión comprimida para la demo (segundos) usada por el motor de
 * simulación para que las alertas se disparen en un tiempo observable.
 * `demoSegundos` se escala además por el `speedMultiplier` del simulador.
 */
export const DURACION_SOSTENIDO: Record<string, { realMinutos: number; demoSegundos: number }> = {
  temperatura_fuera_confort: { realMinutos: 5, demoSegundos: 12 },
  hr_fuera_confort: { realMinutos: 10, demoSegundos: 18 },
  co2_aviso: { realMinutos: 10, demoSegundos: 15 },
  co2_alerta: { realMinutos: 10, demoSegundos: 20 },
  pm25_alto: { realMinutos: 60, demoSegundos: 30 },
  ruido_excesivo: { realMinutos: 1, demoSegundos: 8 },
  iluminacion_insuficiente: { realMinutos: 5, demoSegundos: 12 },
  proximidad_ventana: { realMinutos: 0.05, demoSegundos: 6 },
  nodo_sin_datos: { realMinutos: 15, demoSegundos: 25 },
  procesador_offline: { realMinutos: 1, demoSegundos: 10 },
};

/** Compresion lineal de un umbral en minutos (configurable, p.ej. puerta abierta) a segundos de demo. */
export function demoSecondsFromMinutes(minutos: number): number {
  return Math.min(60, Math.max(6, minutos * 2));
}

export const HORARIO_DEFAULT = [
  { dia: 1 as const, inicio: "08:00", fin: "18:00" },
  { dia: 2 as const, inicio: "08:00", fin: "18:00" },
  { dia: 3 as const, inicio: "08:00", fin: "18:00" },
  { dia: 4 as const, inicio: "08:00", fin: "18:00" },
  { dia: 5 as const, inicio: "08:00", fin: "18:00" },
];

export const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
