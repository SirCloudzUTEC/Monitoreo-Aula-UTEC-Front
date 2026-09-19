import { getAula } from "@/lib/aulas";
import type { AulaCodigo } from "@/lib/types";

/** A registered node not heard from for longer than this is highlighted in the roster. */
export const AVISO_LATIDO_MS = 15 * 60_000;

/**
 * Nodes a classroom can host (same rule as the backend's DispositivoService): the ambient node and
 * the classroom processor always; the door node needs a door; each window node needs its window.
 */
export function nodosAdmitidos(aula: AulaCodigo): string[] {
  const a = getAula(aula);
  return [
    "nodoAmbiental",
    "procesadorAula",
    ...(a.puertas >= 1 ? ["nodoPuerta"] : []),
    ...(a.ventanas >= 1 ? ["nodoVentana1"] : []),
    ...(a.ventanas >= 2 ? ["nodoVentana2"] : []),
  ];
}
