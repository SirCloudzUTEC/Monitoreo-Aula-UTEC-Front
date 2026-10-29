"use client";

// F6 — event log (SYS-10.1): paginated table with filters, exact-format CSV
// export and the actor "footprint" tab (retention: 90 days).

import { useMemo, useState } from "react";
import { DownloadIcon, ScrollTextIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Vacio } from "@/components/common/layout";
import {
  FiltroAulaSelect,
  FiltroSeveridadSelect,
  SelectSimple,
  opcionesDe,
  sinTodas,
  type FiltroAula,
  type FiltroSeveridad,
} from "@/components/common/form";
import { DataTable, Paginador, totalPaginas, type Columna } from "@/components/common/data-table";
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
import { ETIQUETA_SEVERIDAD, fechaHoraDeIso } from "@/lib/format";

const POR_PAGINA = 50;

const COLUMNAS: Columna<LogRow>[] = [
  { titulo: "Fecha/hora", className: "whitespace-nowrap tabular-nums", celda: (r) => fechaHoraDeIso(r.ts) },
  { titulo: "Aula", celda: (r) => r.aula },
  { titulo: "Tipo", className: "font-mono text-xs", celda: (r) => r.tipo },
  { titulo: "Severidad", celda: (r) => ETIQUETA_SEVERIDAD[r.severidad] },
  { titulo: "Fuente", className: "max-w-32 truncate text-xs", celda: (r) => r.fuente },
  { titulo: "Valor", className: "max-w-32 truncate font-mono text-xs", celda: (r) => r.valor },
  { titulo: "Umbral", className: "font-mono text-xs", celda: (r) => r.umbral },
  { titulo: "Actor", className: "text-xs", celda: (r) => r.actor },
  { titulo: "Estado", className: "text-xs", celda: (r) => r.estado_resultante },
];

function TablaLog({ rows }: { rows: LogRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <DataTable columnas={COLUMNAS} filas={rows} clave={(r) => r.id_evento} />
      {rows.length === 0 && <Vacio>Sin filas para mostrar.</Vacio>}
    </div>
  );
}

const fechaLima = (dia: string, hora: string) => (dia ? new Date(`${dia}T${hora}-05:00`) : undefined);

/** CSV export walks every server page of the current filter, up to this many rows. */
const MAX_FILAS_CSV = 10_000;
/** The backend clamps `size` to 200 (EventoController); asking for more silently returns 200. */
const TAMANO_PAGINA_CSV = 200;

export default function LogPage() {
  const [aula, setAula] = useState<FiltroAula>("todas");
  const [sev, setSev] = useState<FiltroSeveridad>("todas");
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(0);
  const [actor, setActor] = useState<string>("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const filtro = { aula: sinTodas(aula), severidad: sinTodas(sev) };

  // Registro tab: aula/severidad are filtered and paginated by the server; the
  // free-text box narrows the page that is already loaded.
  const consulta = useEventosPagina({ ...filtro, page: pagina, size: POR_PAGINA });
  const total = consulta.data?.totalElements ?? 0;
  const paginas = totalPaginas(total, POR_PAGINA);
  const paginaActual = Math.min(pagina, paginas - 1);
  const visibles = useMemo(
    () => filtrarLog(consulta.data?.content ?? [], { texto: texto || undefined }),
    [consulta.data, texto],
  );

  // Huella tab: a window of the log (the range inputs narrow it server-side).
  const ventana = useEventosVentana(fechaLima(desde, "00:00:00"), fechaLima(hasta, "23:59:59"));
  const filasVentana = useMemo(() => ventana.data?.content ?? [], [ventana.data]);
  const opcionesActor = useMemo(
    () => ({ ninguno: "Elige un actor…", ...opcionesDe(actoresEnLog(filasVentana)) }),
    [filasVentana],
  );
  const huella = useMemo(
    () => (actor ? footprint(filasVentana, actor, 0, Number.MAX_SAFE_INTEGER) : []),
    [filasVentana, actor],
  );

  const exportar = async () => {
    try {
      const filas: LogRow[] = [];
      for (let p = 0; filas.length < MAX_FILAS_CSV; p++) {
        const r = await listarEventos({ ...filtro, page: p, size: TAMANO_PAGINA_CSV });
        filas.push(...r.content);
        // use the size the server really applied, not the one requested
        if (r.content.length === 0 || (p + 1) * r.size >= r.totalElements) break;
      }
      // the server returns newest first; the CSV is chronological
      const csv = exportarCsv(filas.reverse());
      descargarArchivo(nombreArchivoCsv(aula), csv, "text/csv;charset=utf-8");
    } catch (e) {
      toast.error(mensajeDeError(e, "No se pudo exportar el log."));
    }
  };

  // a filter change goes back to the first page
  const conReinicio =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPagina(0);
    };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        icon={ScrollTextIcon}
        title="Log de eventos"
        subtitle={`${total} filas en el registro · retención de ${RETENCION_DIAS} días`}
      />

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Registro</TabsTrigger>
          <TabsTrigger value="huella">Huella por actor</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FiltroAulaSelect value={aula} onChange={conReinicio(setAula)} />
            <FiltroSeveridadSelect value={sev} onChange={conReinicio(setSev)} />
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

          <Paginador
            pagina={paginaActual}
            total={paginas}
            onChange={setPagina}
            bloquearSiguiente={consulta.isPlaceholderData}
          />
        </TabsContent>

        <TabsContent value="huella" className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            La huella es la secuencia ordenada de eventos que originó un actor en un rango de
            fechas.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SelectSimple
              value={actor || "ninguno"}
              onChange={(v) => setActor(v === "ninguno" ? "" : v)}
              opciones={opcionesActor}
              className="w-48"
              ariaLabel="Actor"
              placeholder="Elige un actor"
            />
            {(
              [
                ["Desde", desde, setDesde],
                ["Hasta", hasta, setHasta],
              ] as const
            ).map(([etiqueta, valor, set]) => (
              <label key={etiqueta} className="flex items-center gap-1 text-sm">
                {etiqueta}
                <Input type="date" value={valor} onChange={(e) => set(e.target.value)} className="w-40" />
              </label>
            ))}
          </div>
          {actor ? <TablaLog rows={huella} /> : <Vacio>Elige un actor para ver su huella.</Vacio>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
