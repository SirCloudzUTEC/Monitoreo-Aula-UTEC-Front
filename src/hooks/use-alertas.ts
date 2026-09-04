"use client";

import { useCallback, useMemo } from "react";
import { dataSource } from "@/data";
import { useAlertas as useAlertasStore } from "@/data/store/simulation-store";
import type { AulaId } from "@/domain/types";
import { useMockAuth } from "@/hooks/use-mock-auth";

export function useAlertas(filtro?: { aulaId?: AulaId }) {
  const todas = useAlertasStore();
  const { sesion } = useMockAuth();
  const aulaId = filtro?.aulaId;

  const activas = useMemo(
    () =>
      todas
        .filter((a) => a.estadoAcuse === "pendiente")
        .filter((a) => !aulaId || a.aulaId === aulaId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [todas, aulaId],
  );

  const historial = useMemo(
    () =>
      todas
        .filter((a) => a.estadoAcuse === "atendida")
        .filter((a) => !aulaId || a.aulaId === aulaId)
        .sort((a, b) => (b.atendidaEn ?? b.timestamp).localeCompare(a.atendidaEn ?? a.timestamp)),
    [todas, aulaId],
  );

  const ack = useCallback(
    (id: string) => dataSource.ackAlerta(id, sesion?.nombre ?? "Administrador"),
    [sesion?.nombre],
  );

  return { activas, historial, ack };
}
