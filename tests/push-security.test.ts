import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CuentaUsuario } from "@/lib/auth/identity";
import { auth } from "@/auth";
import { POST } from "@/app/api/push/subscribe/route";
import { POST as send } from "@/app/api/push/send/route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const mockAuth = vi.mocked(auth);

const miembro: CuentaUsuario = {
  email: "miembro@utec.edu.pe",
  nombre: "Miembro",
  rol: "miembro",
  ambitos: [],
  estado: "aprobada",
};

const superadmin: CuentaUsuario = {
  email: "superadmin@utec.edu.pe",
  nombre: "Superadmin",
  rol: "superadmin",
  ambitos: [],
  estado: "aprobada",
};

const req = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });

describe("push destination and permissions", () => {
  it("rejects subscriptions without a session", async () => {
    mockAuth.mockResolvedValueOnce(null as never);
    expect(
      (
        await POST(
          req("/api/push/subscribe", {
            endpoint: "https://fcm.googleapis.com/fcm/send/demo",
          }),
        )
      ).status,
    ).toBe(403);
  });
  it("accepts a subscription from any approved account", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: miembro } as never);
    expect(
      (
        await POST(
          req("/api/push/subscribe", {
            endpoint: "https://fcm.googleapis.com/fcm/send/demo",
            keys: { auth: "a".repeat(22), p256dh: "b".repeat(87) },
          }),
        )
      ).status,
    ).toBe(201);
  });
  it.each([
    "http://127.0.0.1/private",
    "https://example.com/relay",
    "https://fcm.googleapis.com.evil.example/a",
  ])("rejects untrusted push destination %s", async (endpoint) => {
    mockAuth.mockResolvedValueOnce({ cuenta: miembro } as never);
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
    mockAuth.mockResolvedValueOnce(null as never);
    expect((await send(req("/api/push/send", {}))).status).toBe(403);
  });
  it("rejects push-sending from a non-superadmin account", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: miembro } as never);
    expect((await send(req("/api/push/send", {}))).status).toBe(403);
  });
  it("lets a superadmin reach the push-sending validation", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    const response = await send(req("/api/push/send", {}));
    expect(response.status).not.toBe(403);
  });
});
