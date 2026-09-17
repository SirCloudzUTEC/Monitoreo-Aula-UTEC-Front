import type { NextRequest } from "next/server";

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return true; // Non-browser clients still require a signed session.
  try {
    // NextURL normalizes loopback hosts to localhost. The actual Host preserves
    // the browser's origin; never trust forwarded-host or accept sibling origins.
    const host = request.headers.get("host") ?? request.nextUrl.host;
    const expected = new URL(`${request.nextUrl.protocol}//${host}`);
    return expected.host === host.toLowerCase() && origin === expected.origin;
  } catch {
    return false;
  }
}
