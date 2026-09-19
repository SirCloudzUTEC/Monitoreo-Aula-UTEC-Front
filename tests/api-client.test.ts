import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  api,
  getAccessToken,
  onSesionPerdida,
  setAccessToken,
} from "@/lib/api/client";
import { destinoSeguro } from "@/lib/api/session";

const BASE = "http://localhost:8080";

function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  setAccessToken(null);
  onSesionPerdida(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function llamada(i: number) {
  const [url, init] = fetchMock.mock.calls[i] as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
}

describe("api client", () => {
  it("sends the bearer token and the X-Client header, never cookies on data endpoints", async () => {
    setAccessToken("tok-1");
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await api("/api/umbrales");
    const { url, init, headers } = llamada(0);
    expect(url).toBe(`${BASE}/api/umbrales`);
    expect(headers.Authorization).toBe("Bearer tok-1");
    expect(headers["X-Client"]).toBe("web");
    expect(init.credentials).toBe("omit");
  });

  it("serializes query params, skipping empty ones", async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}));
    await api("/api/eventos", { query: { aula: "L-419", severidad: undefined, page: 0, abierto: true } });
    expect(llamada(0).url).toBe(`${BASE}/api/eventos?aula=L-419&page=0&abierto=true`);
  });

  it("does one silent refresh on 401 and retries the request with the new token", async () => {
    setAccessToken("viejo");
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, { accessToken: "nuevo" })) // refresh
      .mockResolvedValueOnce(json(200, { dato: 1 }));
    await expect(api("/api/horario")).resolves.toEqual({ dato: 1 });
    expect(llamada(1).url).toBe(`${BASE}/api/auth/refresh`);
    expect(llamada(1).init.credentials).toBe("include");
    expect(llamada(1).headers.Authorization).toBeUndefined();
    expect(llamada(2).headers.Authorization).toBe("Bearer nuevo");
    expect(getAccessToken()).toBe("nuevo");
  });

  it("shares a single refresh between concurrent 401s", async () => {
    setAccessToken("viejo");
    let refrescos = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith("/api/auth/refresh")) {
        refrescos++;
        return json(200, { accessToken: "nuevo" });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer nuevo" ? json(200, { ok: 1 }) : json(401);
    });
    await Promise.all([api("/api/a"), api("/api/b"), api("/api/c")]);
    expect(refrescos).toBe(1);
  });

  it("drops the session when the refresh is rejected, without retrying", async () => {
    setAccessToken("viejo");
    const perdida = vi.fn();
    onSesionPerdida(perdida);
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(401));
    await expect(api("/api/horario")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBeNull();
    expect(perdida).toHaveBeenCalledOnce();
  });

  it("keeps the session when the refresh fails only because the network is down", async () => {
    setAccessToken("viejo");
    const perdida = vi.fn();
    onSesionPerdida(perdida);
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api("/api/horario")).rejects.toBeInstanceOf(ApiError);
    expect(perdida).not.toHaveBeenCalled();
  });

  it("does not refresh for public endpoints (a failed login is not an expired session)", async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, { detail: "Credenciales inválidas.", status: 401 }),
    );
    await expect(
      api("/api/auth/login", { method: "POST", body: { email: "a", password: "b" }, publico: true }),
    ).rejects.toThrow("Credenciales inválidas.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(llamada(0).headers.Authorization).toBeUndefined();
  });

  it("turns ProblemDetail into a typed error with the server's message", async () => {
    setAccessToken("t");
    fetchMock.mockResolvedValueOnce(
      json(409, { title: "Conflict", detail: "El evento ya no está abierto.", status: 409 }),
    );
    const e = await api("/api/eventos/EV-1/acuse", { method: "POST" }).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(409);
    expect(e.message).toBe("El evento ya no está abierto.");
  });

  it("reports an unreachable server as status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const e = await api("/api/umbrales").catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.sinConexion).toBe(true);
  });

  it("returns undefined on 204", async () => {
    setAccessToken("t");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api("/api/push/subscripciones/1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});

describe("destinoSeguro", () => {
  it("only allows same-site relative paths", () => {
    expect(destinoSeguro("/alertas")).toBe("/alertas");
    expect(destinoSeguro("/aula/L-419?x=1")).toBe("/aula/L-419?x=1");
    expect(destinoSeguro("https://evil.com")).toBe("/");
    expect(destinoSeguro("//evil.com")).toBe("/");
    expect(destinoSeguro("/\\evil.com")).toBe("/");
    expect(destinoSeguro(null)).toBe("/");
  });
});
