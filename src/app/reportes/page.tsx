"use client";

// Lists incident reports from /api/reportes: a plain member sees only
// their own reports, an account with atender_incidentes (admin_operativo/
// superadmin) sees every report with who filed it. No session, no list —
// same privacy rule the API enforces server-side.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardListIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { puede } from "@/lib/auth/identity";
import {
  CATALOGO_INCIDENTES,
  CLASE_PRIORIDAD,
  CLASE_ESTADO_INCIDENTE,
  ETIQUETA_ESTADO_INCIDENTE,
  type CategoriaIncidente,
  type EstadoIncidente,
  type PrioridadIncidente,
} from "@/lib/incidents/catalog";
import { fechaHoraDeIso } from "@/lib/format";

interface ReporteFila {
  id: number;
  categoria: CategoriaIncidente;
  prioridad: PrioridadIncidente;
  ubicacion: string;
  descripcion: string;
  estado: EstadoIncidente;
  creado_en: string;
  reportado_por_email: string | null;
}

export default function ReportesPage() {
  const cuenta = useApp((s) => s.cuenta);
  const verTodos = cuenta ? puede(cuenta, "atender_incidentes") : false;

  const [reportes, setReportes] = useState<ReporteFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/reportes").catch(() => null);
    if (!res) {
      setError("Sin conexión con el servidor.");
      setCargando(false);
      return;
    }
    const data = (await res.json().catch(() => null)) as
      | { reportes?: ReporteFila[]; configurada?: boolean }
      | null;
    if (!res.ok || !data?.configurada) {
      setError("La base de datos no está disponible en este entorno.");
      setReportes([]);
    } else {
      setError(null);
      setReportes(data.reportes ?? []);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

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
              <p className="text-sm text-muted-foreground">Cargando…</p>
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
                        {fechaHoraDeIso(r.creado_en)}
                      </TableCell>
                      {verTodos && (
                        <TableCell className="font-mono text-xs">
                          {r.reportado_por_email ?? "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
