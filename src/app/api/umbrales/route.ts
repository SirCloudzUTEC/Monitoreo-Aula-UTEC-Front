// GET /api/umbrales — default comfort parameters (SysML seed values).
// POST /api/umbrales — validates a threshold update; only the administrator
// role may write (criterio 7: the API must reject a visualizador).

import { NextRequest, NextResponse } from "next/server";
import umbralesSeed from "@/data/umbrales.json";
import type { Umbrales } from "@/lib/types";

export function GET() {
  return NextResponse.json(umbralesSeed);
}

const CLAVES = Object.keys(umbralesSeed) as (keyof Umbrales)[];

export async function POST(req: NextRequest) {
  const rol = req.headers.get("x-rol");
  if (rol !== "administrador") {
    return NextResponse.json(
      { error: "Solo el rol administrador puede modificar umbrales." },
      { status: 403 },
    );
  }
  let body: Partial<Umbrales>;
  try {
    body = (await req.json()) as Partial<Umbrales>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  for (const k of CLAVES) {
    const v = body[k];
    if (v === undefined) return NextResponse.json({ error: `Falta ${k}` }, { status: 400 });
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: `Valor inválido en ${k}` }, { status: 400 });
    }
  }
  // phase 1 keeps persistence client-side (localStorage); this endpoint
  // validates and authorizes. Phase 2: persist on the classroom processor.
  return NextResponse.json({ ok: true });
}
