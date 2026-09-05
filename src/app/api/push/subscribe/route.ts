// POST /api/push/subscribe — acknowledges a browser subscription.
// Phase 1 is stateless: the subscription lives in the browser (service worker)
// and /api/push/send receives it explicitly. Phase 2: persist it server-side
// keyed by contact so the notifier can fan out to all administrators.

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { endpoint?: string };
    if (!body.endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
}
