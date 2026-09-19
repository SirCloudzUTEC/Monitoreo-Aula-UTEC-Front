"use client";

// Dashboard card for one domain module (F1): per-classroom current value,
// 60-minute sparkline, traffic light and open-alert count. Links to /modulo/[id].

import { memo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModuleIcon } from "@/components/modules/module-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { SIN_SERIE, useSerie } from "@/lib/use-serie";
import { useVisible } from "@/lib/use-visible";
import { CODIGOS_AULA } from "@/lib/aulas";
import { useEstados, useEventosAbiertos, useHorario, useUmbrales } from "@/lib/api/hooks";
import {
  CLASE_SEMAFORO,
  ETIQUETA_SEMAFORO,
  MODULOS,
  eventosDeModulo,
  peorSemaforo,
  semaforoModulo,
  type Semaforo,
} from "@/lib/modules";
import { formatearValor } from "@/lib/format";
import { claseEnCurso } from "@/lib/schedule";
import type { AulaCodigo, ModuloId } from "@/lib/types";
import { cn } from "@/lib/utils";

// recharts is heavy and only draws tiny trend lines here: load it after the first paint
const Sparkline = dynamic(() => import("@/components/charts/sparkline").then((m) => m.Sparkline), {
  ssr: false,
  loading: () => <Skeleton className="h-9 w-full" />,
});

function FilaAula({
  aula,
  modulo,
  semaforo,
}: {
  aula: AulaCodigo;
  modulo: ModuloId;
  semaforo: Semaforo;
}) {
  const info = MODULOS[modulo];
  const { valores, antiguedadMs } = useEstados();
  const cargado = antiguedadMs[aula] !== null;
  const valor = valores[aula][info.principal];
  // the series request waits until the row is on screen
  const [ref, visible] = useVisible<HTMLDivElement>();
  const serie = useSerie(aula, info.principal, 60, 1, visible);
  return (
    <div ref={ref} className="flex items-center gap-3">
      <span
        className={cn(
          "size-3 shrink-0 rounded-full",
          cargado ? CLASE_SEMAFORO[semaforo] : "animate-pulse bg-muted",
        )}
        title={cargado ? ETIQUETA_SEMAFORO[semaforo] : "Cargando"}
        aria-label={`${aula}: ${cargado ? ETIQUETA_SEMAFORO[semaforo] : "cargando"}`}
      />
      <div className="w-16 shrink-0 text-sm text-muted-foreground">{aula}</div>
      <div className="w-24 shrink-0 font-mono text-base font-semibold tabular-nums">
        {cargado ? formatearValor(info.principal, valor) : <Skeleton className="h-5 w-16" />}
      </div>
      <div className="min-w-0 flex-1">
        {SIN_SERIE.includes(info.principal) ? (
          <span className="text-xs text-muted-foreground">sin serie numérica</span>
        ) : (
          <Sparkline data={serie} height={36} />
        )}
      </div>
    </div>
  );
}

export const ModuleCard = memo(function ModuleCard({ modulo }: { modulo: ModuloId }) {
  const info = MODULOS[modulo];
  const { abiertos } = useEventosAbiertos();
  const { valores, antiguedadMs, nowMs: simNowMs } = useEstados();
  // don't claim "within range" for a room whose data has not arrived yet
  const cargado = CODIGOS_AULA.every((a) => antiguedadMs[a] !== null);
  const { umbrales } = useUmbrales();
  const { horario } = useHorario();

  const fecha = new Date(simNowMs); // 0 before init: values are empty then anyway
  const semaforos = Object.fromEntries(
    CODIGOS_AULA.map((a) => [
      a,
      semaforoModulo(modulo, valores[a], umbrales, abiertos, a, claseEnCurso(horario, a, fecha)),
    ]),
  ) as Record<AulaCodigo, Semaforo>;
  const agregado = CODIGOS_AULA.map((a) => semaforos[a]).reduce(peorSemaforo, "verde");
  const nAlertas = eventosDeModulo(abiertos, modulo).length;

  return (
    <Link href={`/modulo/${modulo}`} className="block">
      <Card className="glow-hover h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ModuleIcon modulo={modulo} className="size-5 text-muted-foreground" />
            {info.titulo}
            <span
              className={cn(
                "ml-auto size-3 rounded-full",
                cargado ? CLASE_SEMAFORO[agregado] : "animate-pulse bg-muted",
              )}
              title={cargado ? ETIQUETA_SEMAFORO[agregado] : "Cargando"}
            />
            {nAlertas > 0 && (
              <Badge variant="destructive" className="tabular-nums">
                {nAlertas}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {!cargado
              ? "Cargando estado…"
              : agregado === "verde"
                ? "Dentro de rango en ambas aulas"
                : `Estado: ${ETIQUETA_SEMAFORO[agregado].toLowerCase()}`}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {CODIGOS_AULA.map((a) => (
            <FilaAula key={a} aula={a} modulo={modulo} semaforo={semaforos[a]} />
          ))}
        </CardContent>
      </Card>
    </Link>
  );
});
