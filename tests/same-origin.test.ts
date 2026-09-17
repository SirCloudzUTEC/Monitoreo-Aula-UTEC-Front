import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { sameOrigin } from "@/lib/auth/session";

describe("sameOrigin", () => {
  it.each([
    "http://127.0.0.1:3101",
    "http://localhost:3101",
    "http://[::1]:3101",
    "https://utec-demo.example",
  ])("accepts the actual browser origin %s", (origin) => {
    const request = new NextRequest(`${origin}/api/umbrales`, {
      method: "POST",
      headers: { host: new URL(origin).host, origin },
    });
    expect(sameOrigin(request)).toBe(true);
  });
  it.each([
    "http://localhost:3101",
    "http://127.0.0.1:3102",
    "https://127.0.0.1:3101",
    "null",
  ])("rejects a different origin %s even for loopback", (origin) => {
    const request = new NextRequest("http://127.0.0.1:3101/api/umbrales", {
      method: "POST",
      headers: { host: "127.0.0.1:3101", origin },
    });
    expect(sameOrigin(request)).toBe(false);
  });
  it("rejects cross-origin requests", () => {
    const request = new NextRequest("http://localhost/api/umbrales", {
      method: "POST",
      headers: { origin: "https://other.example" },
    });
    expect(sameOrigin(request)).toBe(false);
  });
  it("rejects sec-fetch-site: cross-site even with no origin header", () => {
    const request = new NextRequest("http://localhost/api/umbrales", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(sameOrigin(request)).toBe(false);
  });
  it("accepts non-browser clients that send no origin header", () => {
    const request = new NextRequest("http://localhost/api/umbrales", {
      method: "POST",
    });
    expect(sameOrigin(request)).toBe(true);
  });
});
