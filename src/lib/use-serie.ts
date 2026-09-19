"use client";

// Hook: historical series for the charts, straight from
// `GET /api/aulas/{codigo}/serie`. The backend buckets in SQL, so a 7-day
// range costs the same as one hour.

import { useQuery } from "@tanstack/react-query";
import { serieAula } from "@/lib/api/endpoints";
import { useHabilitado } from "@/lib/api/hooks";
import type { AulaCodigo, Magnitud } from "@/lib/types";

export interface PuntoSerie {
  ts: string;
  t: number;
  valor: number;
}

/** `puerta` is textual: the backend has no numeric series for it. */
export const SIN_SERIE: readonly Magnitud[] = ["puerta"];

export function useSerie(
  aula: AulaCodigo,
  magnitud: Magnitud,
  minutos: number,
  pasoMin = 1,
  /** false defers the request (e.g. until the chart scrolls into view) */
  activa = true,
): PuntoSerie[] {
  const habilitado = useHabilitado();
  const pasoMs = pasoMin * 60_000;
  const { data } = useQuery({
    queryKey: ["serie", aula, magnitud, minutos, pasoMin],
    queryFn: () => {
      const hasta = new Date();
      return serieAula(aula, magnitud, new Date(hasta.getTime() - minutos * 60_000), hasta, pasoMs);
    },
    enabled: habilitado && activa && !SIN_SERIE.includes(magnitud),
    refetchInterval: Math.max(30_000, Math.min(pasoMs, 60_000)),
    // a series only changes at bucket cadence: coming back to the tab must not refetch every chart
    staleTime: 25_000,
    // switching the range keeps the previous chart on screen until the new one arrives, but never
    // another room's or another magnitude's chart
    placeholderData: (previa, consultaPrevia) =>
      consultaPrevia?.queryKey[1] === aula && consultaPrevia.queryKey[2] === magnitud ? previa : undefined,
  });
  return data ?? EMPTY;
}

const EMPTY: PuntoSerie[] = [];
