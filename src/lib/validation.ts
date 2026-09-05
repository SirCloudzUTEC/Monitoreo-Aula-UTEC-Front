import type { AulaCodigo, Escenario, Magnitud, Umbrales } from "@/lib/types";
import seed from "@/data/umbrales.json";
import { UNIDADES } from "@/lib/simulator/profiles";

export const CLASSROOMS: AulaCodigo[] = ["L-419", "A-1001"];
export const SCENARIOS: Escenario[] = [
  "clase_normal",
  "aula_libre",
  "aforo_excedido",
  "puerta_trabada",
  "co2_alto",
  "intruso_ventana",
  "nodo_caido",
];
export const MAGNITUDES = Object.keys(UNIDADES) as Magnitud[];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validNumber(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number | null {
  const number = value === null ? fallback : Number(value);
  return value !== "" &&
    Number.isFinite(number) &&
    number >= min &&
    number <= max
    ? number
    : null;
}

/** Shared validation for local settings and the stateless server API. */
export function validateThresholds(value: unknown): string | null {
  if (!isRecord(value)) return "Los umbrales deben ser un objeto JSON.";
  for (const key of Object.keys(seed)) {
    if (
      typeof value[key] !== "number" ||
      !Number.isFinite(value[key]) ||
      value[key] < 0 ||
      value[key] > 1_000_000
    ) {
      return `Valor inválido en ${key}.`;
    }
  }
  const u = value as unknown as Umbrales;
  if (u.hrMin >= u.hrMax || u.hrMax > 100)
    return "La humedad mínima debe ser menor que la máxima (0–100 %).";
  if (u.co2Aviso >= u.co2Alerta)
    return "El aviso de CO₂ debe ser menor que la alerta crítica.";
  if (u.umbralLux > u.luxObjetivo)
    return "La luz mínima no puede superar el objetivo.";
  if (u.distVentanaHisteresis <= u.distVentana)
    return "La distancia de liberación debe superar la distancia mínima.";
  if (u.umbralTempHisteresis >= u.umbralTemp)
    return "La histéresis debe ser menor que el umbral de temperatura.";
  if (u.bateriaBaja > 100) return "La batería debe estar entre 0 y 100 %.";
  if (
    !Number.isInteger(u.aforoMaximo) ||
    u.aforoMaximo < 1 ||
    u.aforoMaximo > 40
  )
    return "El aforo debe ser un entero entre 1 y 40, el límite físico de estas aulas.";
  if (
    u.latidoMin <= 0 ||
    u.nodoSinDatosMin <= u.latidoMin ||
    u.procesadorOfflineSeg <= 0
  )
    return "Revisa los periodos de latido y desconexión.";
  return null;
}
