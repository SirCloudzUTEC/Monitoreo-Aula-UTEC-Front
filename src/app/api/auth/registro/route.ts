// POST /api/auth/registro — creates an account with an app-specific
// password. This is never the user's real UTEC credential; it only unlocks
// this app. New accounts start pending, same as the OAuth path, unless the
// email matches SUPERADMIN_EMAIL.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data/db";
import { sameOrigin } from "@/lib/auth/session";
import { isRecord } from "@/lib/validation";
import {
  esCorreoInstitucional,
  estadoInicial,
  rolInicial,
} from "@/lib/auth/identity";
import { fortalezaPassword, hashPassword } from "@/lib/auth/password";

function nombreValido(nombre: unknown): string | null {
  if (typeof nombre !== "string") return null;
  const limpio = nombre.trim();
  return limpio.length > 0 && limpio.length <= 120 ? limpio : null;
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const emailRaw = body.email;
  if (typeof emailRaw !== "string" || !esCorreoInstitucional(emailRaw)) {
    return NextResponse.json(
      { error: "Usa tu correo institucional @utec.edu.pe." },
      { status: 400 },
    );
  }
  const email = emailRaw.toLowerCase();

  const nombre = nombreValido(body.nombre);
  if (!nombre) {
    return NextResponse.json(
      { error: "Ingresa tu nombre (máximo 120 caracteres)." },
      { status: 400 },
    );
  }

  const errorPassword = fortalezaPassword(body.password, email);
  if (errorPassword) {
    return NextResponse.json({ error: errorPassword }, { status: 400 });
  }

  const sql = db();
  if (!sql) {
    return NextResponse.json(
      {
        error:
          "La base de datos aún no está configurada en este entorno. No se creó la cuenta.",
      },
      { status: 503 },
    );
  }

  const password_hash = await hashPassword(body.password as string);
  const rol = rolInicial(email);
  const estado = estadoInicial(rol);

  try {
    const rows = await sql`
      insert into usuarios (email, nombre, rol, estado, password_hash)
      values (${email}, ${nombre}, ${rol}, ${estado}, ${password_hash})
      on conflict (email) do nothing
      returning email
    `;
    if (rows.length === 0) {
      // Same message whether the email exists with or without a password,
      // so this endpoint can't be used to enumerate accounts.
      return NextResponse.json(
        { error: "No se pudo crear la cuenta con esos datos." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        ok: true,
        pendiente: estado === "pendiente",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la cuenta. Inténtalo nuevamente." },
      { status: 502 },
    );
  }
}
