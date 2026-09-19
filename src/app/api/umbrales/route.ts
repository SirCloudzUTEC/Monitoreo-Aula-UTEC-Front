// GET /api/umbrales — default comfort parameters (SysML seed values).
// POST /api/umbrales — validates a threshold update; only accounts with
// gestionar_dispositivos (admin_operativo/superadmin) may write.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import umbralesSeed from "@/data/umbrales.json";
import { validateThresholds } from "@/lib/validation";
import { puede } from "@/lib/auth/identity";
import { sameOrigin } from "@/lib/auth/session";

export function GET() {
  return NextResponse.json(umbralesSeed);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !sameOrigin(req) ||
    !session?.cuenta ||
    !puede(session.cuenta, "gestionar_dispositivos")
  ) {
    return NextResponse.json(
      { error: "Solo una cuenta administradora o superusuaria puede modificar umbrales." },
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
