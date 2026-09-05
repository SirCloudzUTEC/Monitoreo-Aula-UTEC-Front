// GET /api/estado — schedule-derived state and a current snapshot per aula.
// Note: open-alert state lives in the browser session (phase 1); server-side
// this reports the schedule-based state plus current simulated values.

import { NextResponse } from "next/server";
import { medicionesEnTick } from "@/lib/simulator/generator";
import { HORARIO_DEFAULT, bloqueEnCurso, claseEnCurso, enHorarioOperacion, proximoBloque } from "@/lib/schedule";
import type { AulaCodigo } from "@/lib/types";

const AULAS: AulaCodigo[] = ["L-419", "A-1001"];

export function GET() {
  const ahora = new Date();
  const out = AULAS.map((aula) => {
    const estado = !enHorarioOperacion(ahora)
      ? "Cerrada"
      : claseEnCurso(HORARIO_DEFAULT, aula, ahora)
        ? "EnClase"
        : "Libre";
    const mediciones = medicionesEnTick(aula, "clase_normal", HORARIO_DEFAULT, ahora);
    const valores = Object.fromEntries(mediciones.map((m) => [m.magnitud, m.valor]));
    const bloque = bloqueEnCurso(HORARIO_DEFAULT, aula, ahora);
    const proximo = proximoBloque(HORARIO_DEFAULT, aula, ahora);
    return {
      aula,
      estado,
      valores,
      claseActual: bloque?.curso ?? null,
      proximaClase: proximo ? { curso: proximo.bloque.curso, inicia: proximo.inicia.toISOString() } : null,
    };
  });
  return NextResponse.json({ ts: ahora.toISOString(), aulas: out });
}
