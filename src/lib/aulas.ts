// Static visual models ship with the frontend; telemetry comes only from Spring Boot.
import type { Aula, AulaCodigo, ModeloAulaCodigo } from "@/lib/types";
import aulasSeed from "@/data/aulas.json";

export const MODELOS_AULA = aulasSeed as Aula[];
export const CODIGOS_MODELO_AULA: ModeloAulaCodigo[] = MODELOS_AULA.map(
  (a) => a.codigo,
);

// Explicit backend contract: adding a visual model must not enable operational
// queries, device registration, schedules, dashboards or risk totals for it.
export const CODIGOS_AULA: AulaCodigo[] = ["L-419", "A-1001"];
export function esAulaMonitoreada(codigo: string): codigo is AulaCodigo {
  return CODIGOS_AULA.some((a) => a === codigo);
}
export const AULAS = MODELOS_AULA.filter(
  (a): a is Aula & { codigo: AulaCodigo } => esAulaMonitoreada(a.codigo),
);

export function getAula<Codigo extends ModeloAulaCodigo>(
  codigo: Codigo,
): Aula & { codigo: Codigo } {
  const a = MODELOS_AULA.find((x) => x.codigo === codigo);
  if (!a) throw new Error(`Aula desconocida: ${codigo}`);
  return a as Aula & { codigo: Codigo };
}
