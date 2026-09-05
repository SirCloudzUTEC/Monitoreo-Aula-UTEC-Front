// GET /api/umbrales — default comfort parameters (SysML seed values).
// POST /api/umbrales — validates a threshold update; only the administrator
// role may write (criterio 7: the API must reject a visualizador).

import { NextRequest, NextResponse } from "next/server";
import umbralesSeed from "@/data/umbrales.json";
import { validateThresholds } from "@/lib/validation";
import { isAdministrator, sameOrigin } from "@/lib/auth/session";

export function GET() {
  return NextResponse.json(umbralesSeed);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req) || !isAdministrator(req)) {
    return NextResponse.json(
      { error: "Solo el rol administrador puede modificar umbrales." },
      { status: 403 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const error = validateThresholds(body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  // phase 1 keeps persistence client-side (localStorage); this endpoint
  // validates and authorizes. Phase 2: persist on the classroom processor.
  return NextResponse.json({ ok: true });
}
