// Session lifecycle against the backend. The access token is held in memory
// only (client.ts), so on every page load the session is restored silently:
// the httpOnly refresh cookie is exchanged for a new access token, then
// `/api/auth/me` returns the fresh account.

import { refrescarSesion } from "@/lib/api/client";
import { yo } from "@/lib/api/endpoints";
import type { CuentaUsuario } from "@/lib/auth/identity";

export async function restaurarSesion(): Promise<CuentaUsuario | null> {
  if ((await refrescarSesion()) !== "ok") return null;
  try {
    return await yo();
  } catch {
    return null;
  }
}

/** Only same-site relative paths: never redirect to an attacker-controlled URL after login. */
export function destinoSeguro(next: string | null | undefined): string {
  return next && /^\/(?!\/|\\)/.test(next) ? next : "/";
}
