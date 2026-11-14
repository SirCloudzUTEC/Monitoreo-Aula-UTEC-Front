import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import {
  assertBackendFixture,
  installBackendFixture,
  type BackendFixture,
} from "./models-e2e/fixtures";

// These negative selftests deliberately do NOT use the normal auto-fixture.
// Every possible network destination belongs to an ephemeral loopback sentinel.
// Rejected requests remain in backend.unexpected and must fail its verifier.
interface Sentinel {
  server: Server;
  origin: string;
  backendHits: string[];
}

async function sentinel(): Promise<Sentinel> {
  const backendHits: string[] = [];
  const server = createServer((request, response) => {
    const path = new URL(request.url!, "http://127.0.0.1").pathname;
    response.setHeader("access-control-allow-origin", "*");
    if (path.startsWith("/api") || path.startsWith("/actuator")) {
      backendHits.push(path);
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ sentinel: true }));
    } else if (path === "/fixture-asset.js") {
      response.setHeader("content-type", "application/javascript");
      response.end('document.body.dataset.asset = "loaded";');
    } else {
      response.setHeader("content-type", "text/html");
      response.end(
        '<body>Owned frontend<script src="/fixture-asset.js"></script>',
      );
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    server,
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    backendHits,
  };
}

let browser: Browser;
let frontend: Sentinel;
let api: Sentinel;
let context: BrowserContext;
let page: Page;
let backend: BackendFixture;

beforeAll(async () => {
  frontend = await sentinel();
  api = await sentinel();
  browser = await chromium.launch({ channel: "chrome", headless: true });
});

beforeEach(async () => {
  frontend.backendHits.length = 0;
  api.backendHits.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", api.origin);
  context = await browser.newContext();
  page = await context.newPage();
  backend = await installBackendFixture(page, frontend.origin);
  await page.goto(frontend.origin);
});

afterEach(async () => {
  await context?.close();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await browser?.close();
  for (const owned of [frontend, api]) {
    if (!owned) continue;
    owned.server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      owned.server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it("rejects API and health requests to a mismatched origin before they reach the owned sentinel", async () => {
  const outcomes = await page.evaluate(async (origin) => {
    const outcomes: string[] = [];
    for (const path of ["/api/auth/me", "/actuator/health/liveness"]) {
      try {
        await fetch(origin + path);
        outcomes.push("network response");
      } catch {
        outcomes.push("blocked");
      }
    }
    return outcomes;
  }, frontend.origin);

  expect(frontend.backendHits).toEqual([]);
  expect(outcomes).toEqual(["blocked", "blocked"]);
  expect(backend.unexpected).toHaveLength(2);
  expect(() => assertBackendFixture(backend)).toThrow();
});

it.each(["no traffic", "health only", "refresh only"] as const)(
  "rejects missing expected interception evidence: %s",
  async (traffic) => {
    if (traffic !== "no traffic") {
      await page.evaluate(
        ({ origin, traffic }) =>
          fetch(
            origin +
              (traffic === "health only"
                ? "/actuator/health/liveness"
                : "/api/auth/refresh"),
            { method: traffic === "health only" ? "GET" : "POST" },
          ).then(() => undefined),
        { origin: api.origin, traffic },
      );
    }
    expect(() => assertBackendFixture(backend)).toThrow(/interceptad/);
  },
);

it("accepts expected intercepted auth contracts without contacting a sentinel backend", async () => {
  await page.evaluate(async (origin) => {
    await fetch(origin + "/api/auth/refresh", { method: "POST" });
    await fetch(origin + "/api/auth/me");
  }, api.origin);
  expect(() => assertBackendFixture(backend)).not.toThrow();
  expect(api.backendHits).toEqual([]);
  expect(frontend.backendHits).toEqual([]);
});

it("requires intercepted refresh but not me for the intentionally signed-out contract", async () => {
  backend.signedIn = false;
  const status = await page.evaluate(
    (origin) =>
      fetch(origin + "/api/auth/refresh", { method: "POST" }).then(
        (r) => r.status,
      ),
    api.origin,
  );
  expect(status).toBe(401);
  expect(() => assertBackendFixture(backend)).not.toThrow();
  expect(api.backendHits).toEqual([]);
});

it("still permits frontend navigation and assets", async () => {
  expect(await page.title()).toBe("");
  expect(await page.locator("body").textContent()).toContain("Owned frontend");
  expect(await page.locator("body").getAttribute("data-asset")).toBe("loaded");
});

const modelReferences = [
  { name: "query", path: "/api/eventos?aula=L-418", method: "GET" },
  { name: "encoded query", path: "/api/eventos?aula=L%2D418", method: "GET" },
  {
    name: "JSON body",
    path: "/api/auth/refresh",
    method: "POST",
    body: '{"aula":"L-418"}',
    contentType: "application/json",
  },
  {
    name: "escaped JSON body",
    path: "/api/auth/refresh",
    method: "POST",
    body: String.raw`{"aula":"L-\u003418"}`,
    contentType: "application/json",
  },
  {
    name: "encoded form body",
    path: "/api/auth/refresh",
    method: "POST",
    body: "aula=L%2D418",
    contentType: "application/x-www-form-urlencoded",
  },
];

it.each(modelReferences)(
  "rejects operational L-418 references in $name",
  async (reference) => {
    const outcome = await page.evaluate(
      async ({ origin, reference }) => {
        await fetch(origin + "/api/auth/refresh", { method: "POST" });
        await fetch(origin + "/api/auth/me");
        try {
          await fetch(origin + reference.path, {
            method: reference.method,
            body: reference.body,
            headers: reference.contentType
              ? { "content-type": reference.contentType }
              : undefined,
          });
          return "response";
        } catch {
          return "blocked";
        }
      },
      { origin: api.origin, reference },
    );
    expect(outcome).toBe("blocked");
    expect(backend.unexpected).toContain(`${reference.method} L-418 reference`);
    expect(() => assertBackendFixture(backend)).toThrow();
    expect(api.backendHits).toEqual([]);
  },
);
