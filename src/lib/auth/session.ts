import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "utec_demo_session";
export const SESSION_SECONDS = 8 * 60 * 60;

function secret(): string | null {
  const value = process.env.AUTH_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

export function sessionConfigured(): boolean {
  return secret() !== null && Boolean(process.env.DEMO_ADMIN_PIN);
}

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

export function validPin(pin: unknown): boolean {
  const expected = process.env.DEMO_ADMIN_PIN;
  if (!expected || typeof pin !== "string" || pin.length > 128) return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signSession(now = Date.now()): string {
  const key = secret();
  if (!key)
    throw new Error("Falta AUTH_SESSION_SECRET (mínimo 32 caracteres).");
  const payload = Buffer.from(
    JSON.stringify({ rol: "administrador", exp: now + SESSION_SECONDS * 1000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function isAdministrator(
  request: NextRequest,
  now = Date.now(),
): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const key = secret();
  if (!token || !key || token.length > 1024) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  try {
    const expected = createHmac("sha256", key).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return (
      data.rol === "administrador" &&
      Number.isFinite(data.exp) &&
      data.exp > now
    );
  } catch {
    return false;
  }
}
