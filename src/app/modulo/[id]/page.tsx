"use client";

// F1 (detail) — one domain module expanded: 1h/24h/7d charts per magnitude
// and classroom, its open events, applicable thresholds and a plain-language
// explanation. Anomaly markers come from src/lib/anomaly (F9).

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventoCard } from "@/components/events/evento-card";
import { ModuleIcon } from "@/components/modules/module-icon";
import { SectionCard } from "@/components/common/layout";
import { MODULOS, esModuloId, eventosDeModulo } from "@/lib/modules";
import { CODIGOS_AULA, getAula } from "@/lib/aulas";
import { useEstados, useEventosAbiertos, useUmbrales } from "@/lib/api/hooks";
import { SIN_SERIE, useSerie } from "@/lib/use-serie";
import { useVisible } from "@/lib/use-visible";
import { plural } from "@/lib/format";
import { lineasUmbral } from "@/lib/umbrales";
import { ETIQUETA_MAGNITUD } from "@/lib/units";
import type { AulaCodigo, Magnitud, ModuloId, Umbrales } from "@/lib/types";

// recharts is the heaviest dependency of this page: load it after the first paint
const SerieChart = dynamic(() => import("@/components/charts/serie-chart").then((m) => m.SerieChart), {
  ssr: false,
  loading: () => <Skeleton className="h-60 w-full rounded-lg" />,
});

const RANGOS = {
  "1h": { minutos: 60, pasoMin: 1, etiqueta: "1 hora" },
  "24h": { minutos: 24 * 60, pasoMin: 15, etiqueta: "24 horas" },
  "7d": { minutos: 7 * 24 * 60, pasoMin: 60, etiqueta: "7 días" },
} as const;

type RangoId = keyof typeof RANGOS;

/** Classrooms that host this module's sensors (the window perimeter needs windows). */
const tieneSensores = (modulo: ModuloId, a: AulaCodigo) => modulo !== "perimetro" || getAula(a).ventanas > 0;

function ChartAula({
  aula,
  magnitud,
  rango,
  umbrales,
}: {
  aula: AulaCodigo;
  magnitud: Magnitud;
  rango: RangoId;
  umbrales: Umbrales;
}) {
  const r = RANGOS[rango];
  // off-screen charts neither fetch nor poll until scrolled into view
  const [ref, visible] = useVisible<HTMLDivElement>();
  const serie = useSerie(aula, magnitud, r.minutos, r.pasoMin, visible);
  return (
    <div ref={ref}>
      {SIN_SERIE.includes(magnitud) ? (
        <p className="text-sm text-muted-foreground">
          La puerta es un estado (abierta/cerrada/asegurada), no una serie numérica: sus cambios
          quedan en el log de eventos.
        </p>
      ) : (
        <SerieChart data={serie} magnitud={magnitud} umbrales={umbrales} />
      )}
    </div>
  );
}

export default function ModuloPage() {
  // useSearchParams needs a Suspense boundary, or the whole route bails out of prerendering
  return (
    <Suspense>
      <Modulo />
    </Suspense>
  );
}

function Modulo() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { abiertos } = useEventosAbiertos();
  const { nowMs } = useEstados();
  const { umbrales } = useUmbrales();
  const [rango, setRango] = useState<RangoId>("1h");

  if (!esModuloId(params.id)) notFound();
  const modulo = params.id;
  const info = MODULOS[modulo];
  const evs = eventosDeModulo(abiertos, modulo);

  const aulasFiltradas = CODIGOS_AULA.filter((a) => tieneSensores(modulo, a));
  const sinSensores = CODIGOS_AULA.filter((a) => !tieneSensores(modulo, a));
  // si venimos de un click en el panel general, esa aula va primero
  const aulaDestacada = searchParams.get("aula");
  const aulas =
    aulaDestacada && aulasFiltradas.includes(aulaDestacada as AulaCodigo)
      ? [aulaDestacada as AulaCodigo, ...aulasFiltradas.filter((a) => a !== aulaDestacada)]
      : aulasFiltradas;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <ModuleIcon modulo={modulo} className="size-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{info.titulo}</h1>
          <Tabs value={rango} onValueChange={(v) => setRango(v as RangoId)} className="ml-auto">
            <TabsList>
              {(Object.keys(RANGOS) as RangoId[]).map((r) => (
                <TabsTrigger key={r} value={r}>
                  {RANGOS[r].etiqueta}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <p className="text-base text-muted-foreground">
          {evs.length === 0
            ? "Sin alertas abiertas en este módulo."
            : `${plural(evs.length, "alerta")} ${evs.length === 1 ? "abierta" : "abiertas"} en este módulo.`}{" "}
          Viendo {RANGOS[rango].etiqueta.toLowerCase()} en {plural(aulas.length, "aula")}.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 text-base text-muted-foreground">{info.explicacion}</CardContent>
      </Card>

      {aulas.map((aula) => (
        <SectionCard
          key={aula}
          title={
            <Link href={`/aula/${aula}`} className="hover:underline">
              {getAula(aula).nombre}
            </Link>
          }
          contentClassName="flex flex-col gap-8"
        >
          {info.magnitudes.map((m) => (
            <div key={m}>
              <h3 className="mb-2 text-base font-medium">{ETIQUETA_MAGNITUD[m]}</h3>
              <ChartAula aula={aula} magnitud={m} rango={rango} umbrales={umbrales} />
            </div>
          ))}
        </SectionCard>
      ))}
      {sinSensores.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {sinSensores.length === 1 ? `El aula ${sinSensores[0]} no tiene` : `Las aulas ${sinSensores.join(", ")} no tienen`}{" "}
          ventanas, por eso no aparece{sinSensores.length === 1 ? "" : "n"} en este módulo.
        </p>
      )}

      <SectionCard title="Umbrales aplicables" contentClassName="">
        <ul className="grid gap-2 text-base sm:grid-cols-2">
          {info.magnitudes.flatMap((m) =>
            lineasUmbral(m, umbrales).map((l) => (
              <li key={`${m}-${l.etiqueta}`} className="text-muted-foreground">
                {ETIQUETA_MAGNITUD[m]}: <span className="font-mono text-foreground">{l.etiqueta}</span>
              </li>
            )),
          )}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Los umbrales se editan en{" "}
          <Link href="/ajustes" className="underline">
            Ajustes
          </Link>{" "}
          (cuenta administradora o superusuaria).
        </p>
      </SectionCard>

      <section aria-label="Alertas abiertas del módulo">
        <h2 className="mb-3 text-lg font-semibold">Alertas abiertas ({evs.length})</h2>
        {evs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin alertas abiertas en este módulo. ✓</p>
        ) : (
          <div className="flex flex-col gap-2">
            {evs.map((e) => (
              <EventoCard key={e.id_evento} evento={e} abierta nowMs={nowMs} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
