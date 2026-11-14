import { test as base, expect, type Page } from "@playwright/test";
import umbrales from "../../src/data/umbrales.json";

export interface BackendFixture {
  signedIn: boolean;
  failedRoom: string | null;
  requests: { path: string; method: string }[];
  unexpected: string[];
}

// Exported only so negative selftests can exercise isolation separately from
// normal auto-fixture teardown, without clearing intentionally rejected calls.
export async function installBackendFixture(page: Page, baseURL?: string) {
  const backend: BackendFixture = {
    signedIn: true,
    failedRoom: null,
    requests: [],
    unexpected: [],
  };
  const apiOrigin = new URL(
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
  ).origin;
  const frontendOrigin = new URL(baseURL || "http://127.0.0.1:3112").origin;
  const headers = {
    "access-control-allow-origin": frontendOrigin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type,authorization,x-client",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  };
  // Catch every origin, including requests from other pages/service workers in
  // this context. Only frontend documents/assets may reach the local frontend.
  await page.context().route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const isBackend = /^\/(?:api|actuator|health)(?:\/|$)/.test(path);
    if (!isBackend && url.origin === frontendOrigin) return route.continue();
    if (url.origin !== apiOrigin) {
      // Never retain query values, bodies or credentials in diagnostics.
      backend.unexpected.push(`${method} unexpected origin`);
      return route.abort("blockedbyclient");
    }
    let inspectedPath = path;
    let payload = request.postData() ?? "";
    try {
      inspectedPath = decodeURIComponent(path);
    } catch {
      // Keep malformed transport text unchanged; unknown routes are rejected below.
    }
    try {
      payload = JSON.stringify(request.postDataJSON()) ?? "";
    } catch {
      try {
        payload = decodeURIComponent(payload.replace(/\+/g, " "));
      } catch {
        // Retain the original body for inspection, never in diagnostics.
      }
    }
    const modelReference = [
      inspectedPath,
      ...url.searchParams.keys(),
      ...url.searchParams.values(),
      payload,
    ].some((value) => value.includes("L-418"));
    if (modelReference) {
      backend.unexpected.push(`${method} L-418 reference`);
      return route.abort("blockedbyclient");
    }
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    backend.requests.push({ path, method });
    const reply = (json: unknown, status = 200) =>
      route.fulfill({ status, headers, json });
    if (path === "/actuator/health/liveness" && method === "GET")
      return reply({ status: "UP" });
    if (path === "/api/auth/refresh" && method === "POST") {
      return backend.signedIn
        ? reply({ accessToken: "mock-model-test-token-not-a-credential" })
        : reply({ detail: "No hay sesión de prueba" }, 401);
    }
    if (path === "/api/auth/me" && method === "GET") {
      return reply({
        email: "prueba-modelo-e2e@utec.edu.pe",
        nombre: "Prueba frontend",
        rol: "miembro",
        ambitos: [],
        estado: "aprobada",
      });
    }
    const state = path.match(/^\/api\/aulas\/(L-419|A-1001)\/estado$/);
    if (state && method === "GET") {
      if (backend.failedRoom === state[1])
        return reply({ detail: "Fallo de contrato controlado" }, 500);
      return reply({
        aula: state[1],
        estado: "Libre",
        ts: new Date().toISOString(),
        ultimaLectura: [],
      });
    }
    if (/^\/api\/aulas\/(L-419|A-1001)\/serie$/.test(path) && method === "GET")
      return reply({ puntos: [] });
    if (path === "/api/eventos" && method === "GET")
      return reply({ content: [], totalElements: 0, page: 0, size: 200 });
    if (path === "/api/horario" && method === "GET")
      return reply({ "L-419": [], "A-1001": [] });
    if (path === "/api/umbrales" && method === "GET") return reply(umbrales);
    backend.unexpected.push(`${method} ${path}`);
    await route.abort("blockedbyclient");
  });
  return backend;
}

export function assertBackendFixture(backend: BackendFixture) {
  expect(
    backend.unexpected,
    "Todo el tráfico backend debe estar previsto e interceptado",
  ).toEqual([]);
  expect(
    backend.requests.filter((r) => r.path.includes("L-418")),
    "El modelo no debe originar operaciones para un aula no habilitada en Spring",
  ).toEqual([]);
  const expectedContracts = [
    { method: "POST", path: "/api/auth/refresh" },
    ...(backend.signedIn ? [{ method: "GET", path: "/api/auth/me" }] : []),
  ];
  for (const expected of expectedContracts) {
    expect(
      backend.requests.some(
        (request) =>
          request.method === expected.method && request.path === expected.path,
      ),
      `Debe haberse interceptado ${expected.method} ${expected.path}`,
    ).toBe(true);
  }
}

// Test-only contract fixtures. No request reaches Spring Boot and no real
// credentials are used. These tests prove the frontend boundary, NOT the server.
export const test = base.extend<{ backend: BackendFixture }>({
  backend: [
    async ({ page, baseURL }, use) => {
      const backend = await installBackendFixture(page, baseURL);
      await use(backend);
      assertBackendFixture(backend);
    },
    { auto: true },
  ],
});

export { expect };
