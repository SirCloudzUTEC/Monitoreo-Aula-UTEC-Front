// GET /api/reportes — database status, total, and (only with a session)
// the report list: own reports for a plain member, every report for an
// account with atender_incidentes (admin_operativo/superadmin) — nobody
// without a session, and no member browsing another member's reports.
// POST /api/reportes — validates and stores an incident plus one
// notification per responsible scope. Attributed to the signed-in user's
// account when there is a session, otherwise to a shared demo account.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { sameOrigin } from "@/lib/auth/session";
import { db } from "@/lib/data/db";
import { puede } from "@/lib/auth/identity";
import {
  CATALOGO_INCIDENTES,
  validarBorrador,
  type CategoriaIncidente,
  type PrioridadIncidente,
} from "@/lib/incidents/catalog";

const EMAIL_SISTEMA = "sistema.demo@utec.edu.pe";
const LIMITE_LISTADO = 100;

interface ReporteRow {
  id: number;
  categoria: CategoriaIncidente;
  prioridad: PrioridadIncidente;
  ubicacion: string;
  descripcion: string;
  estado: string;
  creado_en: string;
  reportado_por_email: string | null;
}

export async function GET() {
  const sql = db();
  if (!sql) return NextResponse.json({ configurada: false, total: 0, reportes: [] });
  try {
    const [{ total }] =
      await sql`select count(*)::int as total from incidentes`;

    const session = await auth();
    let reportes: ReporteRow[] = [];
    if (session?.cuenta) {
      reportes = puede(session.cuenta, "atender_incidentes")
        ? ((await sql`
            select i.id, i.categoria, i.prioridad, i.ubicacion, i.descripcion,
                   i.estado, i.creado_en, u.email as reportado_por_email
            from incidentes i
            left join usuarios u on u.id = i.reportado_por
            order by i.creado_en desc
            limit ${LIMITE_LISTADO}
          `) as ReporteRow[])
        : ((await sql`
            select i.id, i.categoria, i.prioridad, i.ubicacion, i.descripcion,
                   i.estado, i.creado_en, null as reportado_por_email
            from incidentes i
            join usuarios u on u.id = i.reportado_por
            where u.email = ${session.cuenta.email}
            order by i.creado_en desc
            limit ${LIMITE_LISTADO}
          `) as ReporteRow[]);
    }
    return NextResponse.json({ configurada: true, total, reportes });
  } catch {
    return NextResponse.json(
      { configurada: false, total: 0, reportes: [], error: "Base de datos no disponible." },
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
    const session = await auth();
    let reporter: { id: number } | undefined;
    if (session?.cuenta) {
      const rows = await sql`
        select id from usuarios where email = ${session.cuenta.email}`;
      reporter = rows[0] as { id: number } | undefined;
    }
    if (!reporter) {
      const rows = await sql`
        insert into usuarios (email, nombre, estado)
        values (${EMAIL_SISTEMA}, 'Reportes de demostración (sin sesión)', 'aprobada')
        on conflict (email) do update set nombre = excluded.nombre
        returning id`;
      reporter = rows[0] as { id: number };
    }
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
