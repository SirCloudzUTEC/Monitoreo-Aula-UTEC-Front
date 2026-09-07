import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";

type FetchHandler = (event: {
  request: Request;
  respondWith: (value: Promise<Response>) => void;
  waitUntil: (value: Promise<unknown>) => void;
}) => void;

function worker() {
  const handlers = new Map<string, FetchHandler>();
  const cache = {
    put: vi.fn().mockResolvedValue(undefined),
    addAll: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi
      .fn()
      .mockResolvedValue(
        new Response("<html>app</html>", {
          headers: { "Content-Type": "text/html" },
        }),
      ),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
  };
  const fetch = vi.fn().mockRejectedValue(new Error("offline"));
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://aula.example" },
      addEventListener: (name: string, fn: FetchHandler) =>
        handlers.set(name, fn),
    },
    URL,
    Response,
    Request,
    caches,
    fetch,
  });
  const request = (url: string, headers?: Record<string, string>) => {
    let response: Promise<Response> | undefined;
    handlers.get("fetch")!({
      request: new Request(url, { headers }),
      respondWith: (value) => {
        response = value;
      },
      waitUntil: () => {},
    });
    return response;
  };
  return { request, fetch, cache };
}

describe("service worker response isolation", () => {
  it("never returns cached HTML for an offline JSON API", async () => {
    const { request } = worker();
    const response = await request("https://aula.example/api/session");
    expect(response?.status).toBe(503);
    expect(response?.headers.get("content-type")).toContain("application/json");
  });
  it("does not intercept RSC payloads as HTML pages", () => {
    const { request } = worker();
    expect(
      request("https://aula.example/alertas?_rsc=abc", { RSC: "1" }),
    ).toBeUndefined();
  });
  it("does not cache an authenticated API response", async () => {
    const { request, fetch, cache } = worker();
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ rol: "administrador" }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    await request("https://aula.example/api/session");
    expect(cache.put).not.toHaveBeenCalled();
  });
});
