// GET /api/usuarios — lists accounts (no password hashes); admin-only.
// POST /api/usuarios — creates an account with a generated app-specific
// password and an assigned role. There is no self-registration: this is
// now the only way a new account comes into existence, other than the
// bootstrap superadmin from SUPERADMIN_EMAIL (src/auth.ts). Reserved to
// `gestionar_usuarios` (superadmin).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/data/db";
import { sameOrigin } from "@/lib/auth/session";
import { isRecord } from "@/lib/validation";
import { esCorreoInstitucional, puede, type Rol } from "@/lib/auth/identity";
import {
  fortalezaPassword,
  generarPasswordTemporal,
  hashPassword,
} from "@/lib/auth/password";

const ROLES: readonly Rol[] = ["miembro", "admin_operativo", "superadmin"];

interface UsuarioRow {
  email: string;
  nombre: string;
  rol: Rol;
  estado: string;
  creado_en: string;
}

function nombreValido(nombre: unknown): string | null {
  if (typeof nombre !== "string") return null;
  const limpio = nombre.trim();
  return limpio.length > 0 && limpio.length <= 120 ? limpio : null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (
    !sameOrigin(req) ||
    !session?.cuenta ||
    !puede(session.cuenta, "gestionar_usuarios")
  ) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const sql = db();
  if (!sql) return NextResponse.json({ usuarios: [] });
  const usuarios = (await sql`
    select email, nombre, rol, estado, creado_en
    from usuarios
    order by creado_en desc
  `) as UsuarioRow[];
  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !sameOrigin(req) ||
    !session?.cuenta ||
    !puede(session.cuenta, "gestionar_usuarios")
  ) {
    return NextResponse.json(
      { error: "Solo un superusuario puede crear cuentas." },
      { status: 403 },
    );
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
      { error: "Usa un correo institucional @utec.edu.pe." },
      { status: 400 },
    );
  }
  const email = emailRaw.toLowerCase();

  const nombre = nombreValido(body.nombre);
  if (!nombre) {
    return NextResponse.json(
      { error: "Ingresa un nombre (máximo 120 caracteres)." },
      { status: 400 },
    );
  }

  const rol = body.rol;
  if (typeof rol !== "string" || !ROLES.includes(rol as Rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
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

  const password = generarPasswordTemporal();
  const errorPassword = fortalezaPassword(password, email);
  if (errorPassword) {
    // Should be unreachable — generarPasswordTemporal() always clears
    // fortalezaPassword() — but never hand out a password silently unless
    // it does.
    return NextResponse.json(
      { error: "No se pudo generar una contraseña válida. Intenta de nuevo." },
      { status: 500 },
    );
  }
  const password_hash = await hashPassword(password);

  try {
    const rows = await sql`
      insert into usuarios (
        email, nombre, rol, estado, password_hash, aprobado_en, aprobado_por
      )
      values (
        ${email}, ${nombre}, ${rol}, 'aprobada', ${password_hash}, now(),
        (select id from usuarios where email = ${session.cuenta.email})
      )
      on conflict (email) do nothing
      returning email
    `;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, email, password }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la cuenta. Inténtalo nuevamente." },
      { status: 502 },
    );
  }
}
