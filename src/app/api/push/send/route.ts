// POST /api/push/send — sends a Web Push notification to the subscription the
// browser provides. Phase 1 is stateless (no DB): each browser stores its own
// subscription and asks the server to push to it. Phase 2: persist operations
// team subscriptions and fan out on critical events.

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: "Claves VAPID no configuradas (ver README)." },
      { status: 503 },
    );
  }
  let body: {
    subscription?: webpush.PushSubscription;
    titulo?: string;
    cuerpo?: string;
    url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body.subscription?.endpoint) {
    return NextResponse.json({ error: "Falta subscription" }, { status: 400 });
  }
  webpush.setVapidDetails("mailto:operaciones@utec.edu.pe", publicKey, privateKey);
  try {
    await webpush.sendNotification(
      body.subscription,
      JSON.stringify({
        titulo: body.titulo ?? "Aula Digital UTEC",
        cuerpo: body.cuerpo ?? "",
        url: body.url ?? "/alertas",
      }),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json({ error: "No se pudo enviar el push" }, { status });
  }
}
