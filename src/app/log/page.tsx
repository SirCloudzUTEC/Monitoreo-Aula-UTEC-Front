"use client";

// F6 — event log (SYS-10.1): paginated table with filters, exact-format CSV
// export and the actor "footprint" tab (retention: 90 days).

import { useMemo, useState } from "react";
import { DownloadIcon, ScrollTextIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ETIQUETA_SEVERIDAD } from "@/components/events/evento-card";
import { CODIGOS_AULA } from "@/lib/aulas";
import { useEventosPagina, useEventosVentana } from "@/lib/api/hooks";
import { listarEventos } from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
import {
  actoresEnLog,
  exportarCsv,
  filtrarLog,
  footprint,
  nombreArchivoCsv,
  RETENCION_DIAS,
  type LogRow,
} from "@/lib/events/log";
import { descargarArchivo } from "@/lib/data/storage";
import { fechaHoraDeIso } from "@/lib/format";
import type { AulaCodigo, Severidad } from "@/lib/types";

const POR_PAGINA = 50;

function TablaLog({ rows }: { rows: LogRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha/hora</TableHead>
            <TableHead>Aula</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Severidad</TableHead>
            <TableHead>Fuente</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Umbral</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id_evento}>
              <TableCell className="whitespace-nowrap tabular-nums">
                {fechaHoraDeIso(r.ts)}
              </TableCell>
              <TableCell>{r.aula}</TableCell>
              <TableCell className="font-mono text-xs">{r.tipo}</TableCell>
              <TableCell>{ETIQUETA_SEVERIDAD[r.severidad]}</TableCell>
              <TableCell className="max-w-32 truncate text-xs">{r.fuente}</TableCell>
              <TableCell className="max-w-32 truncate font-mono text-xs">{r.valor}</TableCell>
              <TableCell className="font-mono text-xs">{r.umbral}</TableCell>
              <TableCell className="text-xs">{r.actor}</TableCell>
              <TableCell className="text-xs">{r.estado_resultante}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin filas para mostrar.</p>
      )}
    </div>
  );
}

/** CSV export walks every server page of the current filter, up to this many rows. */
const MAX_FILAS_CSV = 10_000;
const TAMANO_PAGINA_CSV = 500;

export default function LogPage() {
  const [aula, setAula] = useState<AulaCodigo | "todas">("todas");
  const [sev, setSev] = useState<Severidad | "todas">("todas");
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(0);
  const [actor, setActor] = useState<string>("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Registro tab: aula/severidad are filtered and paginated by the server; the
  // free-text box narrows the page that is already loaded.
  const pagina_ = useEventosPagina({
    aula: aula === "todas" ? undefined : aula,
    severidad: sev === "todas" ? undefined : sev,
    page: pagina,
    size: POR_PAGINA,
  });
  const total = pagina_.data?.totalElements ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = useMemo(
    () => filtrarLog(pagina_.data?.content ?? [], { texto: texto || undefined }),
    [pagina_.data, texto],
  );

  // Huella tab: a window of the log (the range inputs narrow it server-side).
  const desdeFecha = desde ? new Date(`${desde}T00:00:00-05:00`) : undefined;
  const hastaFecha = hasta ? new Date(`${hasta}T23:59:59-05:00`) : undefined;
  const ventana = useEventosVentana(desdeFecha, hastaFecha);
  const filasVentana = useMemo(() => ventana.data?.content ?? [], [ventana.data]);
  const actores = useMemo(() => actoresEnLog(filasVentana), [filasVentana]);
  const huella = useMemo(
    () => (actor ? footprint(filasVentana, actor, 0, Number.MAX_SAFE_INTEGER) : []),
    [filasVentana, actor],
  );

  const exportar = async () => {
    try {
      const filas: LogRow[] = [];
      for (let p = 0; filas.length < MAX_FILAS_CSV; p++) {
        const r = await listarEventos({
          aula: aula === "todas" ? undefined : aula,
          severidad: sev === "todas" ? undefined : sev,
          page: p,
          size: TAMANO_PAGINA_CSV,
        });
        filas.push(...r.content);
        if ((p + 1) * TAMANO_PAGINA_CSV >= r.totalElements) break;
      }
      // the server returns newest first; the CSV is chronological
      const csv = exportarCsv(filas.reverse());
      descargarArchivo(nombreArchivoCsv(aula), csv, "text/csv;charset=utf-8");
    } catch (e) {
      toast.error(mensajeDeError(e, "No se pudo exportar el log."));
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <ScrollTextIcon className="size-7 text-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Log de eventos</h1>
        </div>
        <p className="text-base text-muted-foreground">
          {total} filas en el registro · retención de {RETENCION_DIAS} días
        </p>
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Registro</TabsTrigger>
          <TabsTrigger value="huella">Huella por actor</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={aula}
              onValueChange={(v) => {
                setAula(v as AulaCodigo | "todas");
                setPagina(0);
              }}
            >
              <SelectTrigger className="w-36" aria-label="Filtrar por aula">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las aulas</SelectItem>
                {CODIGOS_AULA.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sev}
              onValueChange={(v) => {
                setSev(v as Severidad | "todas");
                setPagina(0);
              }}
            >
              <SelectTrigger className="w-36" aria-label="Filtrar por severidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Toda severidad</SelectItem>
                {(["critico", "alerta", "info"] as Severidad[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ETIQUETA_SEVERIDAD[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filtrar en esta página…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-56"
            />
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => void exportar()}>
              <DownloadIcon className="size-4" aria-hidden /> Exportar CSV
            </Button>
          </div>

          <TablaLog rows={visibles} />

          <div className="flex items-center justify-between text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={paginaActual === 0}
              onClick={() => setPagina(paginaActual - 1)}
            >
              ← Anterior
            </Button>
            <span className="text-muted-foreground">
              Página {paginaActual + 1} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={paginaActual >= totalPaginas - 1 || pagina_.isPlaceholderData}
              onClick={() => setPagina(paginaActual + 1)}
            >
              Siguiente →
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="huella" className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            La huella es la secuencia ordenada de eventos que originó un actor en un rango de
            fechas.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={actor || "ninguno"} onValueChange={(v) => setActor(v === "ninguno" ? "" : v)}>
              <SelectTrigger className="w-48" aria-label="Actor">
                <SelectValue placeholder="Elige un actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">Elige un actor…</SelectItem>
                {actores.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1 text-sm">
              Desde
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
            </label>
            <label className="flex items-center gap-1 text-sm">
              Hasta
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
            </label>
          </div>
          {actor ? (
            <TablaLog rows={huella} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Elige un actor para ver su huella.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
