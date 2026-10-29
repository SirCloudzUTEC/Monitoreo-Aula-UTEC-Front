"use client";

// Lists incident reports from `GET /api/incidentes`: a plain member sees only
// their own reports (`propios=true`), an account with atender_incidentes
// (admin_operativo/superadmin) sees the operational list and can take a
// report or close it. The backend enforces the same privacy rule.

import { useState } from "react";
import Link from "next/link";
import { ClipboardListIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvisoError, Chip, PageHeader } from "@/components/common/layout";
import { DataTable, EstadoLista, Paginador, totalPaginas, type Columna } from "@/components/common/data-table";
import { useApp } from "@/lib/store";
import { useHabilitado, useIncidentes, useMutacionAdmin } from "@/lib/api/hooks";
import { atenderIncidente, resolverIncidente, type Incidente } from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
import {
  ACCIONES_INCIDENTE,
  CATALOGO_INCIDENTES,
  CLASE_ESTADO_INCIDENTE,
  CLASE_PRIORIDAD,
  ETIQUETA_ESTADO_INCIDENTE,
  ETIQUETA_PRIORIDAD,
  type AccionIncidente,
} from "@/lib/incidents/catalog";
import { fechaHoraDeIso } from "@/lib/format";

const POR_PAGINA = 20;

const TEXTOS = {
  todos: {
    intro: "Todos los reportes registrados, más recientes primero.",
    vacio: "Todavía no hay reportes registrados.",
  },
  propios: {
    intro: "Tus reportes registrados, más recientes primero.",
    vacio: "Todavía no has reportado ningún incidente.",
  },
};

export default function ReportesPage() {
  const cuenta = useApp((s) => s.cuenta);
  const verTodos = useHabilitado("atender_incidentes");
  const [pagina, setPagina] = useState(0);

  const consulta = useIncidentes(verTodos, pagina, POR_PAGINA);
  const reportes = consulta.data?.content ?? [];
  const error = consulta.isError ? mensajeDeError(consulta.error, "No se pudieron cargar los reportes.") : null;
  const textos = TEXTOS[verTodos ? "todos" : "propios"];

  const cambiar = useMutacionAdmin({
    fn: (v: { id: number; a: AccionIncidente }) =>
      v.a === "atender" ? atenderIncidente(v.id) : resolverIncidente(v.id, v.a),
    invalidar: "incidentes",
    error: "No se pudo actualizar el reporte.",
  });

  const columnas: Columna<Incidente>[] = [
    {
      titulo: "Categoría",
      celda: (r) => (
        <>
          <div className="font-medium">{CATALOGO_INCIDENTES[r.categoria]?.nombre ?? r.categoria}</div>
          <div className="max-w-xs truncate text-xs text-muted-foreground" title={r.descripcion}>
            {r.descripcion}
          </div>
        </>
      ),
    },
    {
      titulo: "Prioridad",
      celda: (r) => <Chip clase={CLASE_PRIORIDAD[r.prioridad]}>{ETIQUETA_PRIORIDAD[r.prioridad] ?? r.prioridad}</Chip>,
    },
    { titulo: "Ubicación", celda: (r) => r.ubicacion },
    {
      titulo: "Estado",
      celda: (r) => (
        <Chip clase={CLASE_ESTADO_INCIDENTE[r.estado]}>{ETIQUETA_ESTADO_INCIDENTE[r.estado] ?? r.estado}</Chip>
      ),
    },
    {
      titulo: "Fecha",
      className: "whitespace-nowrap text-xs text-muted-foreground",
      celda: (r) => fechaHoraDeIso(r.creadoEn),
    },
    {
      titulo: "Reportado por",
      visible: verTodos,
      className: "font-mono text-xs",
      celda: (r) => r.reportadoPorEmail ?? `usuario #${r.reportadoPor}`,
    },
    {
      titulo: "Acciones",
      visible: verTodos,
      celda: (r) => (
        <div className="flex flex-wrap gap-1">
          {ACCIONES_INCIDENTE[r.estado]?.map((b) => (
            <Button
              key={b.accion}
              size="sm"
              variant={b.variante}
              disabled={cambiar.isPending}
              onClick={() => cambiar.mutate({ id: r.id, a: b.accion })}
            >
              {b.etiqueta}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  const paginas = totalPaginas(consulta.data?.totalElements ?? 0, POR_PAGINA);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader icon={ClipboardListIcon} title="Reportes" />
        <Button asChild size="sm" className="gap-2">
          <Link href="/reportar">
            <SendIcon className="size-4" aria-hidden />
            Reportar un incidente
          </Link>
        </Button>
      </div>

      <Card>
        {!cuenta ? (
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Inicia sesión para ver tus reportes.{" "}
            <Link href="/acceso" className="underline">
              Iniciar sesión
            </Link>
            .
          </CardContent>
        ) : (
          <CardContent className="flex flex-col gap-4 pt-6">
            <p className="text-sm text-muted-foreground">{textos.intro}</p>
            {error && <AvisoError>{error}</AvisoError>}
            <EstadoLista
              cargando={consulta.isPending && consulta.fetchStatus !== "idle"}
              vacio={reportes.length === 0}
              mensajeVacio={textos.vacio}
            >
              <DataTable columnas={columnas} filas={reportes} clave={(r) => r.id} />
            </EstadoLista>
            {paginas > 1 && <Paginador pagina={pagina} total={paginas} onChange={setPagina} />}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
