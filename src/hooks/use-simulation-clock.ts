"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/data/store/simulation-store";

const TICK_MS = 1800;

/**
 * Arranca el reloj del motor de simulacion. Debe montarse una sola vez
 * (en el layout protegido). Se pausa automaticamente cuando la pestaña
 * queda oculta para no consumir CPU en segundo plano.
 */
export function useSimulationClock() {
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const arrancar = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        useSimulationStore.getState().runTick();
      }, TICK_MS);
    };

    const detener = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        detener();
      } else {
        arrancar();
      }
    };

    if (!document.hidden) arrancar();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      detener();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
