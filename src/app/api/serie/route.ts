import { NextRequest, NextResponse } from "next/server";
import { historial } from "@/lib/simulator/generator";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import {
  CLASSROOMS,
  SCENARIOS,
  MAGNITUDES,
  validNumber,
} from "@/lib/validation";
import type { AulaCodigo, Escenario, Magnitud } from "@/lib/types";

export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const aula = (p.get("aula") ?? "L-419") as AulaCodigo;
  const magnitud = (p.get("magnitud") ?? "temperatura") as Magnitud;
  const escenario = (p.get("escenario") ?? "clase_normal") as Escenario;
  const horas = validNumber(p.get("horas"), 1, 0.1, 168);
  const pasoMin = validNumber(p.get("pasoMin"), 1, 0.5, 120);
  if (
    !CLASSROOMS.includes(aula) ||
    !MAGNITUDES.includes(magnitud) ||
    !SCENARIOS.includes(escenario) ||
    horas === null ||
    pasoMin === null
  ) {
    return NextResponse.json(
      { error: "Aula, magnitud, escenario o rango inválido." },
      { status: 400 },
    );
  }
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - horas * 3600_000);
  const step = Math.max(
    pasoMin * 60_000,
    Math.ceil((horas * 3600_000) / 2000 / 5000) * 5000,
  );
  const serie = historial(
    aula,
    escenario,
    HORARIO_DEFAULT,
    magnitud,
    desde,
    hasta,
    step,
  );
  return NextResponse.json(
    { aula, magnitud, horas, pasoMs: step, serie },
    { headers: { "Cache-Control": "no-store" } },
  );
}
