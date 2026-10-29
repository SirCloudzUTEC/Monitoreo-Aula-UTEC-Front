// Static classroom configuration (plan, positions, components). It ships with
// the app because the 2D/3D views need it synchronously; live values come
// from the backend (`GET /api/aulas/{codigo}/estado`).

import type { Aula, AulaCodigo } from "@/lib/types";
import aulasSeed from "@/data/aulas.json";

export const AULAS = aulasSeed as Aula[];
export const CODIGOS_AULA: AulaCodigo[] = AULAS.map((a) => a.codigo);

export function getAula(codigo: AulaCodigo): Aula {
  const a = AULAS.find((x) => x.codigo === codigo);
  if (!a) throw new Error(`Aula desconocida: ${codigo}`);
  return a;
}

/** One value per classroom: `porAula((a) => …)` instead of hand-built records. */
export function porAula<T>(fn: (codigo: AulaCodigo) => T): Record<AulaCodigo, T> {
  return Object.fromEntries(CODIGOS_AULA.map((a) => [a, fn(a)])) as Record<AulaCodigo, T>;
}

export function esCodigoAula(codigo: string): codigo is AulaCodigo {
  return (CODIGOS_AULA as string[]).includes(codigo);
}
