"use client";

// F1 (detail) — one domain module expanded: 1h/24h/7d charts per magnitude
// and classroom, its open events, applicable thresholds and a plain-language
// explanation. Anomaly markers come from src/lib/anomaly (F9).

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SerieChart, lineasUmbral } from "@/components/charts/serie-chart";
import { EventoCard } from "@/components/events/evento-card";
import { ModuleIcon } from "@/components/modules/module-icon";
import { MODULOS, esModuloId, eventosDeModulo } from "@/lib/modules";
import { useApp, CODIGOS_AULA } from "@/lib/store";
import { useSerie } from "@/lib/use-serie";
import { getAula } from "@/lib/simulator/profiles";
import { ETIQUETA_MAGNITUD } from "@/lib/format";
import type { AulaCodigo, Magnitud, ModuloId } from "@/lib/types";

const RANGOS = {
  "1h": { minutos: 60, pasoMin: 1, etiqueta: "1 hora" },
  "24h": { minutos: 24 * 60, pasoMin: 15, etiqueta: "24 horas" },
  "7d": { minutos: 7 * 24 * 60, pasoMin: 60, etiqueta: "7 días" },
} as const;

type RangoId = keyof typeof RANGOS;

function ChartAula({
  aula,
  magnitud,
  rango,
}: {
  aula: AulaCodigo;
  magnitud: Magnitud;
  rango: RangoId;
}) {
  const umbrales = useApp((s) => s.umbrales);
  const r = RANGOS[rango];
  const serie = useSerie(aula, magnitud, r.minutos, r.pasoMin);
  return <SerieChart data={serie} magnitud={magnitud} umbrales={umbrales} />;
}

export default function ModuloPage() {
  const params = useParams<{ id: string }>();
  const abiertos = useApp((s) => s.abiertos);
  const umbrales = useApp((s) => s.umbrales);
  const [rango, setRango] = useState<RangoId>("1h");

  if (!esModuloId(params.id)) notFound();
  const modulo = params.id as ModuloId;
  const info = MODULOS[modulo];
  const evs = eventosDeModulo(abiertos, modulo);

  // classrooms that actually have this module's sensors
  const aulas = CODIGOS_AULA.filter(
    (a) => modulo !== "perimetro" || getAula(a).ventanas > 0,
  );

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
            : `${evs.length} alerta${evs.length === 1 ? "" : "s"} abierta${evs.length === 1 ? "" : "s"} en este módulo.`}{" "}
          Viendo {RANGOS[rango].etiqueta.toLowerCase()} en {aulas.length} aula{aulas.length === 1 ? "" : "s"}.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 text-base text-muted-foreground">
          {info.explicacion}
        </CardContent>
      </Card>

      {aulas.map((aula) => (
        <Card key={aula}>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">
              <Link href={`/aula/${aula}`} className="hover:underline">
                {getAula(aula).nombre}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            {info.magnitudes.map((m) => (
              <div key={m}>
                <h3 className="mb-2 text-base font-medium">{ETIQUETA_MAGNITUD[m]}</h3>
                <ChartAula aula={aula} magnitud={m} rango={rango} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {modulo === "perimetro" && aulas.length < CODIGOS_AULA.length && (
        <p className="text-sm text-muted-foreground">
          El aula A-1001 no tiene ventanas, por eso no aparece en este módulo.
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Umbrales aplicables</CardTitle>
        </CardHeader>
        <CardContent>
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
            (rol administrador).
          </p>
        </CardContent>
      </Card>

      <section aria-label="Alertas abiertas del módulo">
        <h2 className="mb-3 text-lg font-semibold">
          Alertas abiertas ({evs.length})
        </h2>
        {evs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin alertas abiertas en este módulo. ✓</p>
        ) : (
          <div className="flex flex-col gap-2">
            {evs.map((e) => (
              <EventoCard key={e.id_evento} evento={e} abierta />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
