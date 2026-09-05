import { NextRequest, NextResponse } from "next/server";
import { isAdministrator, sameOrigin } from "@/lib/auth/session";
import { validSubscription } from "@/lib/notify/validation";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req) || !isAdministrator(req))
    return NextResponse.json({ error: "Solo administrador." }, { status: 403 });
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
