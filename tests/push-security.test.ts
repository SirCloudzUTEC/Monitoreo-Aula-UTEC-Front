import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/push/subscribe/route";
import { POST as send } from "@/app/api/push/send/route";
import { signSession } from "@/lib/auth/session";

beforeEach(() =>
  vi.stubEnv(
    "AUTH_SESSION_SECRET",
    "test-only-session-secret-with-at-least-32-characters",
  ),
);
afterEach(() => vi.unstubAllEnvs());
const req = (url: string, body: unknown, auth = true) =>
  new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(auth ? { cookie: `utec_demo_session=${signSession()}` } : {}),
    },
    body: JSON.stringify(body),
  });

describe("push destination and permissions", () => {
  it("rejects subscriptions from a visualizador", async () => {
    expect(
      (
        await POST(
          req(
            "/api/push/subscribe",
            { endpoint: "https://fcm.googleapis.com/fcm/send/demo" },
            false,
          ),
        )
      ).status,
    ).toBe(403);
  });
  it.each([
    "http://127.0.0.1/private",
    "https://example.com/relay",
    "https://fcm.googleapis.com.evil.example/a",
  ])("rejects untrusted push destination %s", async (endpoint) => {
    expect(
      (
        await POST(
          req("/api/push/subscribe", {
            endpoint,
            keys: { auth: "bad", p256dh: "bad" },
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("does not expose a public push-sending relay", async () => {
    expect((await send(req("/api/push/send", {}, false))).status).toBe(403);
  });
});
