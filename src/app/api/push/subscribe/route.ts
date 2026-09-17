import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { puede } from "@/lib/auth/identity";
import { sameOrigin } from "@/lib/auth/session";
import { validSubscription } from "@/lib/notify/validation";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !sameOrigin(req) ||
    !session?.cuenta ||
    !puede(session.cuenta, "recibir_alertas")
  )
    return NextResponse.json(
      { error: "Inicia sesión con una cuenta aprobada." },
      { status: 403 },
    );
  const body: unknown = await req.json().catch(() => null);
  if (!validSubscription(body))
    return NextResponse.json(
      { error: "Suscripción push inválida o proveedor no permitido." },
      { status: 400 },
    );
  // Phase 1: browser-owned subscription, no cross-device registry.
  return NextResponse.json(
    { ok: true, scope: "este_navegador" },
    { status: 201 },
  );
}
