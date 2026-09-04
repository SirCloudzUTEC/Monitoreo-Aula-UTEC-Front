"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { dataSource } from "@/data";

const TOAST_ESTILO: Record<string, "warning" | "error" | "info"> = {
  info: "info",
  alerta: "warning",
  critico: "error",
};

/** Muestra un toast cada vez que el motor de simulacion genera una alerta nueva. Montar una sola vez. */
export function AlertToastWatcher() {
  useEffect(() => {
    const unsubscribe = dataSource.subscribeAlertas((alerta) => {
      const tipo = TOAST_ESTILO[alerta.severidad] ?? "info";
      toast[tipo](`${alerta.aulaId} · ${alerta.mensaje}`, {
        description: "Nueva alerta generada. Revisa el centro de alertas.",
      });
    });
    return unsubscribe;
  }, []);

  return null;
}
