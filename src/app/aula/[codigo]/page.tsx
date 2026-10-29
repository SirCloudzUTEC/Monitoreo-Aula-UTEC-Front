"use client";

// F4 — classroom digital twin: 2D SVG floor plan (spec positions or the
// outline imported in F5) plus component, node and sensor tables (blocks.json).

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PlanoSvg, type PlanoImportado } from "@/components/plano/plano-svg";
import { AvisoObsoleto } from "@/components/modules/aviso-obsoleto";
import { Chip, SectionCard } from "@/components/common/layout";
import { DataTable, type Columna } from "@/components/common/data-table";
import { getAula, porAula } from "@/lib/aulas";
import { useEstados } from "@/lib/api/hooks";
import { CLASE_ESTADO, ETIQUETA_ESTADO, formatearValor, plural } from "@/lib/format";
import { MAGNITUDES } from "@/lib/units";
import { useAulaParam } from "@/lib/use-aula-param";
import { useLocal } from "@/lib/use-local";
import blocks from "@/data/blocks.json";
import type { Aula, Magnitud, NodoSpec, SensorSpec } from "@/lib/types";

const SENSORES = blocks.sensores as SensorSpec[];
const NODOS = blocks.nodos as NodoSpec[];

/** Static equipment of each classroom (nodes it hosts and their sensors). */
const EQUIPO = porAula((a) => {
  const nodos = NODOS.filter((n) => getAula(a).nodos.includes(n.id));
  const ids = new Set(nodos.flatMap((n) => n.sensores));
  return { nodos, sensores: SENSORES.filter((s) => ids.has(s.id)) };
});

const LECTURAS: Magnitud[] = ["temperatura", "humedad", "co2", "pm25", "lux", "ruido", "ocupacion", "puerta"];

const datosAula = (a: Aula) => [
  `${a.largo} × ${a.ancho} × ${a.alto} m`,
  `Aforo: ${a.aforo} personas`,
  `${plural(a.ventanas, "ventana")} · ${a.puertas} puerta`,
  a.aireAcondicionado ? "Con aire acondicionado" : "Sin aire acondicionado",
];

const COLUMNAS_NODOS: Columna<NodoSpec>[] = [
  { titulo: "Nodo", className: "font-medium", celda: (n) => n.nombre },
  { titulo: "MCU", celda: (n) => n.mcu },
  { titulo: "Conectividad", celda: (n) => n.conectividad },
  { titulo: "Alimentación", celda: (n) => n.alimentacion },
  { titulo: "Sensores", className: "text-xs", celda: (n) => n.sensores.join(", ") || "—" },
];

const COLUMNAS_SENSORES: Columna<SensorSpec>[] = [
  { titulo: "Sensor", className: "font-medium", celda: (s) => s.nombre },
  { titulo: "Modelo", celda: (s) => s.modelo },
  { titulo: "Magnitudes", className: "text-xs", celda: (s) => s.magnitudes.join(", ") },
  { titulo: "Rango", className: "text-xs", celda: (s) => s.rango },
  { titulo: "Exactitud", className: "text-xs", celda: (s) => s.exactitud },
  { titulo: "Interfaz", celda: (s) => s.interfaz },
  { titulo: "Costo (USD)", claseTitulo: "text-right", className: "text-right tabular-nums", celda: (s) => s.costoAproxUSD },
];

const Cuenta = ({ n }: { n: number }) => <span className="font-normal text-muted-foreground">({n})</span>;

export default function AulaPage() {
  const codigo = useAulaParam("codigo");
  const { estados, valores: todos, antiguedadMs } = useEstados();
  // localStorage is client-only: SSR and the first render show the spec outline
  const plano = useLocal<PlanoImportado | null>(`plano:${codigo}`, null);

  if (!codigo) notFound();
  const aula = getAula(codigo);
  const estado = estados[codigo];
  const valores = todos[codigo];
  const { nodos, sensores } = EQUIPO[codigo];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{aula.nombre}</h1>
          <Chip clase={CLASE_ESTADO[estado]} className="px-3 text-sm">
            {ETIQUETA_ESTADO[estado]}
          </Chip>
          <Link
            href={`/aula/${codigo}/3d`}
            className="ml-auto rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Vista 3D
          </Link>
          <a
            href={`/pantalla/${codigo}`}
            target="_blank"
            rel="noopener"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Ver pantalla TV ↗
          </a>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-4">
          {datosAula(aula).map((d) => (
            <Badge key={d} variant="secondary" className="justify-center py-1.5 text-sm">
              {d}
            </Badge>
          ))}
        </div>
      </div>

      <SectionCard title="Plano 2D" contentClassName="">
        <PlanoSvg aula={aula} plano={plano} className="w-full" />
        <p className="mt-3 text-sm text-muted-foreground">
          {plano
            ? `Contorno importado (${plano.origen ?? "archivo"}${plano.nombre ? `: ${plano.nombre}` : ""}). `
            : "Contorno según especificación. "}
          Puedes importar un plano CSV/DXF en{" "}
          <Link href="/importar" className="underline">
            Importar plano
          </Link>
          .
        </p>
      </SectionCard>

      <SectionCard title="Lecturas actuales" contentClassName="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AvisoObsoleto antiguedadMs={antiguedadMs[codigo]} className="col-span-2 sm:col-span-4" />
        {LECTURAS.map((m) => (
          <div key={m} className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-xs text-muted-foreground">{MAGNITUDES[m].corta}</div>
            <div className="font-mono text-base font-semibold tabular-nums">{formatearValor(m, valores[m])}</div>
          </div>
        ))}
      </SectionCard>

      <SectionCard
        title={
          <>
            Nodos del aula <Cuenta n={nodos.length} />
          </>
        }
        contentClassName="overflow-x-auto"
      >
        <DataTable columnas={COLUMNAS_NODOS} filas={nodos} clave={(n) => n.id} />
      </SectionCard>

      <SectionCard
        title={
          <>
            Sensores instalados <Cuenta n={sensores.length} />
          </>
        }
        contentClassName="overflow-x-auto"
      >
        <DataTable columnas={COLUMNAS_SENSORES} filas={sensores} clave={(s) => s.id} />
        <p className="mt-2 text-xs text-muted-foreground">
          El lector de credenciales guarda solo un hash: nunca identidades ni imágenes.
        </p>
      </SectionCard>

      <SectionCard title="Componentes" contentClassName="">
        <ul className="grid gap-2 text-base sm:grid-cols-2">
          {aula.componentes.map((c) => (
            <li key={c.id} className="text-muted-foreground">
              {c.nombre}: <span className="font-mono text-foreground">{c.cantidad}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
