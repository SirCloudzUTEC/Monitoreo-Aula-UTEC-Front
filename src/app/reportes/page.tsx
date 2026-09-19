"use client";

// Lists incident reports from `GET /api/incidentes`: a plain member sees only
// their own reports (`propios=true`), an account with atender_incidentes
// (admin_operativo/superadmin) sees the operational list and can take a
// report or close it. The backend enforces the same privacy rule.

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { ClipboardListIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilasSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { useHabilitado } from "@/lib/api/hooks";
import {
  atenderIncidente,
  listarIncidentes,
  resolverIncidente,
  type Incidente,
} from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
import { puede } from "@/lib/auth/identity";
import {
  CATALOGO_INCIDENTES,
  CLASE_PRIORIDAD,
  CLASE_ESTADO_INCIDENTE,
  ETIQUETA_ESTADO_INCIDENTE,
} from "@/lib/incidents/catalog";
import { fechaHoraDeIso } from "@/lib/format";

const POR_PAGINA = 20;

export default function ReportesPage() {
  const cuenta = useApp((s) => s.cuenta);
  const verTodos = cuenta ? puede(cuenta, "atender_incidentes") : false;
  const habilitado = useHabilitado("reportar_incidente");
  const qc = useQueryClient();
  const [pagina, setPagina] = useState(0);

  const consulta = useQuery({
    queryKey: ["incidentes", verTodos, pagina],
    queryFn: () => listarIncidentes({ propios: !verTodos, page: pagina, size: POR_PAGINA }),
    enabled: habilitado,
    refetchInterval: 30_000,
    // paging keeps the current list on screen until the next page arrives
    placeholderData: keepPreviousData,
  });
  const reportes: Incidente[] = consulta.data?.content ?? [];
  const totalPaginas = Math.max(1, Math.ceil((consulta.data?.totalElements ?? 0) / POR_PAGINA));
  const cargando = consulta.isPending && habilitado;
  const error = consulta.isError ? mensajeDeError(consulta.error, "No se pudieron cargar los reportes.") : null;

  const cambiar = useMutation({
    mutationFn: (accion: { id: number; a: "atender" | "resuelto" | "descartado" }) =>
      accion.a === "atender" ? atenderIncidente(accion.id) : resolverIncidente(accion.id, accion.a),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidentes"] }),
    onError: (e) => toast.error(mensajeDeError(e, "No se pudo actualizar el reporte.")),
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardListIcon className="size-7 text-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Reportes</h1>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/reportar">
            <SendIcon className="size-4" aria-hidden />
            Reportar un incidente
          </Link>
        </Button>
      </div>

      {!cuenta ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Inicia sesión para ver tus reportes.{" "}
            <Link href="/acceso" className="underline">
              Iniciar sesión
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <p className="text-sm text-muted-foreground">
              {verTodos
                ? "Todos los reportes registrados, más recientes primero."
                : "Tus reportes registrados, más recientes primero."}
            </p>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            {cargando ? (
              <FilasSkeleton filas={5} columnas={4} />
            ) : reportes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {verTodos
                  ? "Todavía no hay reportes registrados."
                  : "Todavía no has reportado ningún incidente."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    {verTodos && <TableHead>Reportado por</TableHead>}
                    {verTodos && <TableHead>Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportes.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">
                          {CATALOGO_INCIDENTES[r.categoria]?.nombre ?? r.categoria}
                        </div>
                        <div className="max-w-xs truncate text-xs text-muted-foreground" title={r.descripcion}>
                          {r.descripcion}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CLASE_PRIORIDAD[r.prioridad]}`}
                        >
                          {r.prioridad}
                        </span>
                      </TableCell>
                      <TableCell>{r.ubicacion}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASE_ESTADO_INCIDENTE[r.estado]}`}
                        >
                          {ETIQUETA_ESTADO_INCIDENTE[r.estado] ?? r.estado}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {fechaHoraDeIso(r.creadoEn)}
                      </TableCell>
                      {verTodos && (
                        <TableCell className="font-mono text-xs">
                          {r.reportadoPorEmail ?? `usuario #${r.reportadoPor}`}
                        </TableCell>
                      )}
                      {verTodos && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.estado === "abierto" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={cambiar.isPending}
                                onClick={() => cambiar.mutate({ id: r.id, a: "atender" })}
                              >
                                Atender
                              </Button>
                            )}
                            {(r.estado === "abierto" || r.estado === "en_atencion") && (
                              <>
                                <Button
                                  size="sm"
                                  disabled={cambiar.isPending}
                                  onClick={() => cambiar.mutate({ id: r.id, a: "resuelto" })}
                                >
                                  Resolver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={cambiar.isPending}
                                  onClick={() => cambiar.mutate({ id: r.id, a: "descartado" })}
                                >
                                  Descartar
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina === 0}
                  onClick={() => setPagina(pagina - 1)}
                >
                  ← Anterior
                </Button>
                <span className="text-muted-foreground">
                  Página {pagina + 1} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= totalPaginas - 1}
                  onClick={() => setPagina(pagina + 1)}
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
