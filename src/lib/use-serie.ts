"use client";

// Hook: sampled series for charts, recomputed only when the simulated clock
// crosses a sampling step (the simulator is deterministic, so sampling the
// same window twice yields identical data).

import { useMemo } from "react";
import type { AulaCodigo, Magnitud } from "@/lib/types";
import { getDataSource, useApp } from "@/lib/store";

export interface PuntoSerie {
  ts: string;
  t: number;
  valor: number;
}

export function useSerie(
  aula: AulaCodigo,
  magnitud: Magnitud,
  minutos: number,
  pasoMin = 1,
): PuntoSerie[] {
  const inicializado = useApp((s) => s.inicializado);
  const simNowMs = useApp((s) => s.simNowMs);
  const escenario = useApp((s) => s.escenarios[aula]);
  const pasoMs = pasoMin * 60_000;
  // quantize so the memo only invalidates once per sampling step
  const bucket = Math.floor(simNowMs / pasoMs);

  return useMemo(() => {
    if (!inicializado || !bucket) return [];
    const hasta = new Date(bucket * pasoMs);
    const desde = new Date(hasta.getTime() - minutos * 60_000);
    return getDataSource().serie(aula, magnitud, { desde, hasta, pasoMs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicializado, bucket, pasoMs, minutos, aula, magnitud, escenario]);
}
