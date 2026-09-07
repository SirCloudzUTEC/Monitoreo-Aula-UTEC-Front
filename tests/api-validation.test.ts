import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSession } from "@/lib/auth/session";
beforeEach(() =>
  vi.stubEnv(
    "AUTH_SESSION_SECRET",
    "test-only-session-secret-with-at-least-32-characters",
  ),
);
afterEach(() => vi.unstubAllEnvs());
import { NextRequest } from "next/server";
import { GET } from "@/app/api/serie/route";

import { POST } from "@/app/api/umbrales/route";
import { GET as getEvents } from "@/app/api/eventos/route";
import seed from "@/data/umbrales.json";

describe("threshold API validation", () => {
  it("does not trust a forged administrator header", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/umbrales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rol": "administrador",
        },
        body: JSON.stringify(seed),
      }),
    );
    expect(response.status).toBe(403);
  });
  it.each([null, [], "wrong", { ...seed, co2Aviso: 1800, co2Alerta: 1500 }])(
    "rejects malformed or inconsistent threshold bodies",
    async (body) => {
      const response = await POST(
        new NextRequest("http://localhost/api/umbrales", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `utec_demo_session=${signSession()}`,
          },
          body: JSON.stringify(body),
        }),
      );
      expect(response.status).toBe(400);
    },
  );
});

describe("series API input validation", () => {
  it.each([
    "magnitud=invalid",
    "escenario=invalid",
    "horas=NaN",
    "horas=Infinity",
    "pasoMin=0",
    "pasoMin=-1",
  ])("rejects invalid query %s", async (query) => {
    expect(
      (await GET(new NextRequest(`http://localhost/api/serie?${query}`)))
        .status,
    ).toBe(400);
  });
  it.each(["horas=no", "escenario=invalid"])(
    "rejects invalid replay query %s",
    async (query) => {
      expect(
        (
          await getEvents(
            new NextRequest(`http://localhost/api/eventos?${query}`),
          )
        ).status,
      ).toBe(400);
    },
  );
  it("rejects unknown classrooms with a structured 400 instead of crashing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/serie?aula=NO-EXISTE"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("error");
  });
});
