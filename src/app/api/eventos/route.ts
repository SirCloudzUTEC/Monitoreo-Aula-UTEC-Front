// GET /api/eventos?horas=4&escenario=clase_normal
// Replays the deterministic stream of the last N hours through a fresh rule
// engine, so events can be recomputed statelessly on the server.

import { NextRequest, NextResponse } from "next/server";
import { RuleEngine } from "@/lib/rules/engine";
import { medicionesEnTick } from "@/lib/simulator/generator";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import type { Aula, AulaCodigo, Escenario, Evento } from "@/lib/types";
import aulasSeed from "@/data/aulas.json";
import umbralesSeed from "@/data/umbrales.json";
import type { Umbrales } from "@/lib/types";

const AULAS = aulasSeed as Aula[];
const PASO_MS = 60_000; // 1-minute replay resolution keeps this endpoint cheap

export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const horas = Math.min(24, Math.max(0.5, Number(p.get("horas") ?? 4)));
  const escenario = (p.get("escenario") ?? "clase_normal") as Escenario;
  const engine = new RuleEngine({
    umbrales: umbralesSeed as Umbrales,
    horario: HORARIO_DEFAULT,
    aulas: AULAS,
  });
  const hasta = Date.now();
  const desde = hasta - horas * 3600_000;
  const eventos: Evento[] = [];
  for (let t = Math.floor(desde / PASO_MS) * PASO_MS; t <= hasta; t += PASO_MS) {
    const fecha = new Date(t);
    for (const aula of AULAS.map((a) => a.codigo as AulaCodigo)) {
      for (const m of medicionesEnTick(aula, escenario, HORARIO_DEFAULT, fecha)) {
        for (const e of engine.process(m)) if (e.accion !== "cerrar") eventos.push(e.evento);
      }
    }
    for (const e of engine.tick(t)) if (e.accion !== "cerrar") eventos.push(e.evento);
  }
  return NextResponse.json({ horas, escenario, eventos, abiertos: engine.eventosAbiertos() });
}
