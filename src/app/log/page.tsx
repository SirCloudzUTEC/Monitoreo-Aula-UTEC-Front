"use client";

// F6 — event log (SYS-10.1): paginated table with filters, exact-format CSV
// export and the actor "footprint" tab (retention: 90 days).

import { useMemo, useState } from "react";
import { DownloadIcon, ScrollTextIcon } from "lucide-react";
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
import { useApp, CODIGOS_AULA } from "@/lib/store";
import {
  actoresEnLog,
  exportarCsv,
  filtrarLog,
  footprint,
  nombreArchivoCsv,
  RETENCION_DIAS,
  type LogRow,
} from "@/lib/events/log";
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

export default function LogPage() {
  const log = useApp((s) => s.log);
  const [aula, setAula] = useState<AulaCodigo | "todas">("todas");
  const [sev, setSev] = useState<Severidad | "todas">("todas");
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(0);
  const [actor, setActor] = useState<string>("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtradas = useMemo(() => {
    const rows = filtrarLog(log, { aula, severidad: sev, texto: texto || undefined });
    return [...rows].reverse(); // newest first
  }, [log, aula, sev, texto]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = filtradas.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA);

  const actores = useMemo(() => actoresEnLog(log), [log]);
  const huella = useMemo(() => {
    if (!actor) return [];
    const desdeMs = desde ? new Date(`${desde}T00:00:00-05:00`).getTime() : 0;
    const hastaMs = hasta ? new Date(`${hasta}T23:59:59-05:00`).getTime() : Number.MAX_SAFE_INTEGER;
    return footprint(log, actor, desdeMs, hastaMs);
  }, [log, actor, desde, hasta]);

  const exportar = () => {
    // export what is filtered (order: chronological, as stored)
    const rows = filtrarLog(log, { aula, severidad: sev, texto: texto || undefined });
    const csv = exportarCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivoCsv(aula);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <ScrollTextIcon className="size-6 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold">Log de eventos</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          Retención: {RETENCION_DIAS} días · {log.length} filas
        </span>
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
              placeholder="Buscar (tipo, fuente, actor…)"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setPagina(0);
              }}
              className="w-56"
            />
            <Button variant="outline" size="sm" className="ml-auto" onClick={exportar}>
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
              disabled={paginaActual >= totalPaginas - 1}
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
