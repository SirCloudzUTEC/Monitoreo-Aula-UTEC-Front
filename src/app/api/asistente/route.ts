// GET /api/asistente — provider availability (no keys ever leave the server).
// POST /api/asistente — validates a chat request. When the chosen provider
// has no configured key, responds 503 with an honest status instead of a
// simulated AI answer. Real provider calls arrive once keys are installed.

import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/auth/session";
import {
  estadoProveedores,
  proveedorDisponible,
  validarPeticionChat,
} from "@/lib/assistant/providers";

export function GET() {
  return NextResponse.json({ proveedores: estadoProveedores() });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const r = validarPeticionChat(body as Record<string, unknown>);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: 400 });
  }
  if (!proveedorDisponible(r.proveedor)) {
    return NextResponse.json(
      {
        error:
          "Este proveedor de IA aún no está configurado en el servidor. " +
          "El mensaje no fue procesado.",
        pendiente: true,
      },
      { status: 503 },
    );
  }
  // A configured key will route the message to the real provider here.
  // Not implemented yet — say so instead of inventing an answer.
  return NextResponse.json(
    {
      error:
        "La conexión con el proveedor está en desarrollo. El mensaje no fue procesado.",
      pendiente: true,
    },
    { status: 501 },
  );
}
