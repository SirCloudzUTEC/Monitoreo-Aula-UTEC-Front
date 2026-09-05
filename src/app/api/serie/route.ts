// GET /api/serie?aula=L-419&magnitud=co2&horas=24&pasoMin=15&escenario=clase_normal
// Sampled history for charts, synthesized deterministically.

import { NextRequest, NextResponse } from "next/server";
import { historial } from "@/lib/simulator/generator";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import type { AulaCodigo, Escenario, Magnitud } from "@/lib/types";

export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const aula = (p.get("aula") ?? "L-419") as AulaCodigo;
  if (!["L-419", "A-1001"].includes(aula)) {
    return NextResponse.json({ error: "Aula inválida." }, { status: 400 });
  }
  const magnitud = (p.get("magnitud") ?? "temperatura") as Magnitud;
  const escenario = (p.get("escenario") ?? "clase_normal") as Escenario;
  const horas = Math.min(24 * 7, Math.max(0.1, Number(p.get("horas") ?? 1)));
  const pasoMin = Math.min(120, Math.max(0.5, Number(p.get("pasoMin") ?? 1)));
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - horas * 3600_000);
  const serie = historial(aula, escenario, HORARIO_DEFAULT, magnitud, desde, hasta, pasoMin * 60_000);
  return NextResponse.json({ aula, magnitud, horas, serie });
}
