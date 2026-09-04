import { create } from "zustand";
import type { Magnitud } from "@/domain/enums";
import type { Alerta, AulaId, ConfiguracionAula, Lectura } from "@/domain/types";
import { createInitialState, tick, type SimulationState } from "@/data/mock/simulation-engine";

interface SimulationStore extends SimulationState {
  runTick: () => void;
  pause: () => void;
  resume: () => void;
  setSpeed: (multiplier: number) => void;
  ackAlerta: (id: string, atendidaPor: string) => void;
  updateConfiguracion: (aulaId: AulaId, patch: Partial<ConfiguracionAula>) => void;
  setPlanoImportado: (aulaId: AulaId, plano: NonNullable<ConfiguracionAula["planoImportado"]>) => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  ...createInitialState(),

  runTick: () => {
    const current = get();
    if (!current.controls.running) return;
    const clone = structuredClone({
      aulas: current.aulas,
      configuraciones: current.configuraciones,
      lecturas: current.lecturas,
      series: current.series,
      eventos: current.eventos,
      alertas: current.alertas,
      vulnerabilidades: current.vulnerabilidades,
      outOfRangeSince: current.outOfRangeSince,
      nodoSinSenalDesde: current.nodoSinSenalDesde,
      procesadorOfflineDesde: current.procesadorOfflineDesde,
      controls: current.controls,
    }) as SimulationState;
    const next = tick(clone, Date.now());
    set(next);
  },

  pause: () => set((s) => ({ controls: { ...s.controls, running: false } })),
  resume: () => set((s) => ({ controls: { ...s.controls, running: true } })),
  setSpeed: (multiplier: number) => set((s) => ({ controls: { ...s.controls, speedMultiplier: multiplier } })),

  ackAlerta: (id: string, atendidaPor: string) =>
    set((s) => ({
      alertas: s.alertas.map((a) =>
        a.id === id ? { ...a, estadoAcuse: "atendida", atendidaPor, atendidaEn: new Date().toISOString() } : a,
      ),
    })),

  updateConfiguracion: (aulaId: AulaId, patch: Partial<ConfiguracionAula>) =>
    set((s) => ({
      configuraciones: {
        ...s.configuraciones,
        [aulaId]: { ...s.configuraciones[aulaId], ...patch },
      },
    })),

  setPlanoImportado: (aulaId: AulaId, plano: NonNullable<ConfiguracionAula["planoImportado"]>) =>
    set((s) => ({
      configuraciones: {
        ...s.configuraciones,
        [aulaId]: { ...s.configuraciones[aulaId], planoImportado: plano },
      },
    })),
}));

// --- Selectores granulares ---

export function useAulas() {
  return useSimulationStore((s) => s.aulas);
}

export function useAula(aulaId: AulaId) {
  return useSimulationStore((s) => s.aulas[aulaId]);
}

export function useLecturaActual(aulaId: AulaId, magnitud: Magnitud): number {
  return useSimulationStore((s) => s.lecturas[aulaId][magnitud]);
}

export function useSerieHistorica(aulaId: AulaId, magnitud: Magnitud): Lectura[] {
  return useSimulationStore((s) => s.series[aulaId]?.[magnitud] ?? []);
}

export function useAlertas(): Alerta[] {
  return useSimulationStore((s) => s.alertas);
}

export function useConfiguracion(aulaId: AulaId): ConfiguracionAula {
  return useSimulationStore((s) => s.configuraciones[aulaId]);
}

export function useSimulationControls() {
  return useSimulationStore((s) => s.controls);
}
