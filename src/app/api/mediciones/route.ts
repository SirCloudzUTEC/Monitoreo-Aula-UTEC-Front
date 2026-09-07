// GET /api/mediciones?aula=L-419&escenario=clase_normal
// Measurements of the current 5 s tick, SYS-09.2 format. The simulator is a
// pure function of time, so this endpoint is stateless and Vercel-friendly.

import { NextRequest, NextResponse } from "next/server";
import { medicionesEnTick } from "@/lib/simulator/generator";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import type { AulaCodigo, Escenario } from "@/lib/types";

const AULAS: AulaCodigo[] = ["L-419", "A-1001"];
const ESCENARIOS: Escenario[] = [
  "clase_normal",
  "aula_libre",
  "aforo_excedido",
  "puerta_trabada",
  "co2_alto",
  "intruso_ventana",
  "nodo_caido",
];

export function GET(req: NextRequest) {
  const aula = (req.nextUrl.searchParams.get("aula") ?? "L-419") as AulaCodigo;
  const escenario = (req.nextUrl.searchParams.get("escenario") ?? "clase_normal") as Escenario;
  if (!AULAS.includes(aula)) {
    return NextResponse.json({ error: `aula inválida: ${aula}` }, { status: 400 });
  }
  if (!ESCENARIOS.includes(escenario)) {
    return NextResponse.json({ error: `escenario inválido: ${escenario}` }, { status: 400 });
  }
  const mediciones = medicionesEnTick(aula, escenario, HORARIO_DEFAULT, new Date());
  return NextResponse.json({ aula, escenario, mediciones });
}
