// GET /api/reportes — database status and total (no report contents:
// members must not browse other people's reports until real auth exists).
// POST /api/reportes — validates and stores an incident plus one
// notification per responsible scope. Reports are attributed to a demo
// system account until institutional sign-in is active.

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sameOrigin } from "@/lib/auth/session";
import {
  CATALOGO_INCIDENTES,
  validarBorrador,
} from "@/lib/incidents/catalog";

const EMAIL_SISTEMA = "sistema.demo@utec.edu.pe";

function db() {
  const url = process.env.DATABASE_URL;
  return url && url.trim().length > 0 ? neon(url) : null;
}

export async function GET() {
  const sql = db();
  if (!sql) return NextResponse.json({ configurada: false, total: 0 });
  try {
    const [{ total }] =
      await sql`select count(*)::int as total from incidentes`;
    return NextResponse.json({ configurada: true, total });
  } catch {
    return NextResponse.json(
      { configurada: false, total: 0, error: "Base de datos no disponible." },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const r = validarBorrador(body as Record<string, unknown>);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  const sql = db();
  if (!sql) {
    return NextResponse.json(
      {
        error:
          "La base de datos aún no está configurada en este entorno. " +
          "El reporte no fue guardado.",
        pendiente: true,
      },
      { status: 503 },
    );
  }

  const info = CATALOGO_INCIDENTES[r.borrador.categoria];
  try {
    const [reporter] = await sql`
      insert into usuarios (email, nombre, estado)
      values (${EMAIL_SISTEMA}, 'Reportes de demostración (sin sesión)', 'aprobada')
      on conflict (email) do update set nombre = excluded.nombre
      returning id`;
    const [incidente] = await sql`
      insert into incidentes (categoria, prioridad, ubicacion, descripcion, reportado_por)
      values (${r.borrador.categoria}, ${info.prioridad}, ${r.borrador.ubicacion},
              ${r.borrador.descripcion}, ${reporter.id})
      returning id, creado_en`;
    for (const ambito of info.destinatarios) {
      await sql`insert into notificaciones (incidente_id, ambito)
                values (${incidente.id}, ${ambito})`;
    }
    return NextResponse.json(
      {
        id: incidente.id,
        creado_en: incidente.creado_en,
        notificados: [...info.destinatarios],
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar el reporte. Inténtalo nuevamente." },
      { status: 502 },
    );
  }
}
