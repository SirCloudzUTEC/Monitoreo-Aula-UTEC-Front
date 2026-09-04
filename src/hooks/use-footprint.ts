"use client";

import { useMemo } from "react";
import { useSimulationStore } from "@/data/store/simulation-store";
import type { Severidad, TipoEvento } from "@/domain/enums";
import type { AulaId, Evento } from "@/domain/types";

export interface FootprintFiltro {
  aulaId?: AulaId | "todas";
  desde?: string; // ISO
  hasta?: string; // ISO
  actor?: string;
  severidad?: Severidad | "todas";
  tipo?: TipoEvento | "todos";
}

export function useFootprint(filtro: FootprintFiltro): Evento[] {
  const eventos = useSimulationStore((s) => s.eventos);

  return useMemo(() => {
    return eventos
      .filter((e) => !filtro.aulaId || filtro.aulaId === "todas" || e.aulaId === filtro.aulaId)
      .filter((e) => !filtro.desde || e.timestamp >= filtro.desde!)
      .filter((e) => !filtro.hasta || e.timestamp <= filtro.hasta!)
      .filter(
        (e) =>
          !filtro.actor ||
          e.actor.nombre.toLowerCase().includes(filtro.actor.toLowerCase()) ||
          e.actor.tipo.toLowerCase().includes(filtro.actor.toLowerCase()),
      )
      .filter((e) => !filtro.severidad || filtro.severidad === "todas" || e.severidad === filtro.severidad)
      .filter((e) => !filtro.tipo || filtro.tipo === "todos" || e.tipo === filtro.tipo)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [eventos, filtro.aulaId, filtro.desde, filtro.hasta, filtro.actor, filtro.severidad, filtro.tipo]);
}
