// Email+password login: verification, lockout and rate limiting live here
// (not in src/auth.ts) so they're unit-testable without booting Auth.js.

import { db } from "@/lib/data/db";
import { esCorreoInstitucional } from "@/lib/auth/identity";
import { verifyPassword, verificarConSenuelo } from "@/lib/auth/password";

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60_000;

interface UsuarioCredenciales {
  nombre: string;
  password_hash: string | null;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
}

/**
 * Verifies email+password against `usuarios`. Always takes roughly the same
 * time on failure (unknown email, no password set, wrong password) so a
 * timing side-channel can't be used to enumerate accounts.
 */
export async function autenticarConCredenciales(
  email: unknown,
  password: unknown,
): Promise<{ email: string; nombre: string } | null> {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !esCorreoInstitucional(email)
  ) {
    if (typeof password === "string") await verificarConSenuelo(password);
    return null;
  }
  const correo = email.toLowerCase();
  const sql = db();
  if (!sql) {
    await verificarConSenuelo(password);
    return null;
  }

  const rows = (await sql`
    select nombre, password_hash, intentos_fallidos, bloqueado_hasta
    from usuarios where email = ${correo}
  `) as UsuarioCredenciales[];
  const row = rows[0];

  if (!row || !row.password_hash) {
    await verificarConSenuelo(password);
    return null;
  }
  if (row.bloqueado_hasta && new Date(row.bloqueado_hasta).getTime() > Date.now()) {
    await verificarConSenuelo(password);
    return null;
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    const intentos = row.intentos_fallidos + 1;
    const bloqueado = intentos >= MAX_INTENTOS;
    await sql`
      update usuarios set
        intentos_fallidos = ${intentos},
        bloqueado_hasta = ${bloqueado ? new Date(Date.now() + BLOQUEO_MS).toISOString() : null}
      where email = ${correo}
    `;
    return null;
  }

  await sql`
    update usuarios set intentos_fallidos = 0, bloqueado_hasta = null
    where email = ${correo}
  `;
  return { email: correo, nombre: row.nombre };
}
