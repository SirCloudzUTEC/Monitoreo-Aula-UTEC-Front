import { NextRequest, NextResponse } from "next/server";
import {
  isAdministrator,
  sameOrigin,
  SESSION_COOKIE,
  SESSION_SECONDS,
  sessionConfigured,
  signSession,
  validPin,
} from "@/lib/auth/session";
import { isRecord } from "@/lib/validation";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return NextResponse.json(
    {
      rol: isAdministrator(request) ? "administrador" : "visualizador",
      demo: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Origen no permitido." },
      { status: 403 },
    );
  if (!sessionConfigured())
    return NextResponse.json(
      {
        error:
          "El administrador de la demo debe configurar DEMO_ADMIN_PIN y AUTH_SESSION_SECRET en el servidor.",
      },
      { status: 503 },
    );
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !validPin(body.pin))
    return NextResponse.json({ error: "PIN incorrecto." }, { status: 403 });
  const response = NextResponse.json({ rol: "administrador", demo: true });
  response.cookies.set(SESSION_COOKIE, signSession(), {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return response;
}

export function DELETE(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Origen no permitido." },
      { status: 403 },
    );
  const response = NextResponse.json({ rol: "visualizador", demo: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return response;
}
