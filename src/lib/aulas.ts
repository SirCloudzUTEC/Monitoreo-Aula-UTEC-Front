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
