import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { isAdministrator, sameOrigin } from "@/lib/auth/session";
import { isRecord } from "@/lib/validation";
import {
  safeNotificationPath,
  validSubscription,
} from "@/lib/notify/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req) || !isAdministrator(req))
    return NextResponse.json({ error: "Solo administrador." }, { status: 403 });
  const body: unknown = await req.json().catch(() => null);
  if (!isRecord(body) || !validSubscription(body.subscription))
    return NextResponse.json(
      { error: "Suscripción push inválida." },
      { status: 400 },
    );
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject)
    return NextResponse.json(
      {
        error:
          "Push no configurado. Configura las claves VAPID y VAPID_SUBJECT; las alertas in-app siguen disponibles.",
      },
      { status: 503 },
    );
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    await webpush.sendNotification(
      body.subscription,
      JSON.stringify({
        titulo:
          typeof body.titulo === "string"
            ? body.titulo.slice(0, 150)
            : "Aula Digital UTEC",
        cuerpo:
          typeof body.cuerpo === "string" ? body.cuerpo.slice(0, 600) : "",
        url: safeNotificationPath(body.url),
      }),
      { timeout: 5000, TTL: 300 },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { statusCode?: number }).statusCode;
    return NextResponse.json(
      { error: "No se pudo enviar el push." },
      { status: code === 410 ? 410 : 502 },
    );
  }
}
