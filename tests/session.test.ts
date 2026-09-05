import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/session/route";
import { POST as updateThresholds } from "@/app/api/umbrales/route";
import seed from "@/data/umbrales.json";

beforeEach(() => {
  vi.stubEnv(
    "AUTH_SESSION_SECRET",
    "test-only-session-secret-with-at-least-32-characters",
  );
  vi.stubEnv("DEMO_ADMIN_PIN", "2026");
});
afterEach(() => vi.unstubAllEnvs());

const login = (pin: string) =>
  POST(
    new NextRequest("http://localhost/api/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ pin }),
    }),
  );

describe("signed demonstration session", () => {
  it("rejects an incorrect PIN", async () =>
    expect((await login("incorrect")).status).toBe(403));
  it("issues an httpOnly cookie after the configured PIN and permits a validated update", async () => {
    const response = await login("2026");
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    const request = new NextRequest("http://localhost/api/umbrales", {
      method: "POST",
      headers: {
        cookie: cookie.split(";")[0],
        origin: "http://localhost",
        "content-type": "application/json",
      },
      body: JSON.stringify(seed),
    });
    expect((await updateThresholds(request)).status).toBe(200);
  });
  it("defaults to visualizador and never trusts a hand-written cookie", async () => {
    const response = GET(
      new NextRequest("http://localhost/api/session", {
        headers: { cookie: "utec_demo_session=administrador" },
      }),
    );
    expect(await response.json()).toEqual({ rol: "visualizador", demo: true });
  });
  it.each([
    "http://127.0.0.1:3101",
    "http://localhost:3101",
    "http://[::1]:3101",
    "https://utec-demo.example",
  ])("accepts the actual browser origin %s", async (origin) => {
    const response = await POST(
      new NextRequest(`${origin}/api/session`, {
        method: "POST",
        headers: { host: new URL(origin).host, origin },
        body: JSON.stringify({ pin: "2026" }),
      }),
    );
    expect(response.status).toBe(200);
  });
  it.each([
    "http://localhost:3101",
    "http://127.0.0.1:3102",
    "https://127.0.0.1:3101",
    "null",
  ])("rejects a different origin %s even for loopback", async (origin) => {
    const response = await POST(
      new NextRequest("http://127.0.0.1:3101/api/session", {
        method: "POST",
        headers: { host: "127.0.0.1:3101", origin },
        body: JSON.stringify({ pin: "2026" }),
      }),
    );
    expect(response.status).toBe(403);
  });
  it("rejects cross-origin login", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/session", {
        method: "POST",
        headers: { origin: "https://other.example" },
        body: JSON.stringify({ pin: "2026" }),
      }),
    );
    expect(response.status).toBe(403);
  });
  it("clears the role cookie on logout", async () => {
    expect(
      DELETE(
        new NextRequest("http://localhost/api/session", { method: "DELETE" }),
      ).headers.get("set-cookie"),
    ).toContain("Max-Age=0");
  });
});
