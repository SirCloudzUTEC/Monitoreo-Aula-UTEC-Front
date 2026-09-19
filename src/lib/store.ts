"use client";

// Global client state (Zustand). Since the backend owns the data, this store
// only keeps what has no server-side home: the signed-in account (filled by
// the auth bootstrap in src/components/providers.tsx) and pure UI preferences.
// Live readings, events, thresholds and schedule are react-query hooks in
// src/lib/api/hooks.ts.

import { create } from "zustand";
import { API_BASE_URL } from "@/lib/api/client";
import { yo } from "@/lib/api/endpoints";
import { puede, type CuentaUsuario, type Permiso } from "@/lib/auth/identity";
import { loadLocal, saveLocal } from "@/lib/data/storage";
import type { AulaCodigo, Evento } from "@/lib/types";

export type ModoVisualizacionAulas = "representativas" | "manual";
export interface PrefsAulas {
  modo: ModoVisualizacionAulas;
  seleccion: AulaCodigo[];
}
const PREFS_AULAS_DEFAULT: PrefsAulas = { modo: "representativas", seleccion: [] };

interface AppState {
  /** True once the silent session restore (refresh cookie) has finished. */
  sesionLista: boolean;
  cuenta: CuentaUsuario | null;
  setCuenta: (cuenta: CuentaUsuario | null) => void;
  setSesionLista: () => void;
  /** Backend reachability, independent of authentication. */
  connected: boolean;
  probarConexion: () => Promise<boolean>;
  /** Re-reads the account from the backend before a local-only write. */
  autorizar: (permiso: Permiso) => Promise<boolean>;
  sonido: boolean;
  prefsAulas: PrefsAulas;
  /** Loads the UI preferences from localStorage (client only). */
  iniciar: () => void;
  setSonido: (v: boolean) => void;
  setPrefsAulas: (p: PrefsAulas) => void;
}

export const useApp = create<AppState>((set, get) => {
  let conexionVersion = 0;

  return {
    sesionLista: false,
    cuenta: null,
    connected: true,
    sonido: false,
    prefsAulas: PREFS_AULAS_DEFAULT,

    iniciar: () => {
      if (typeof window === "undefined") return;
      set({
        sonido: loadLocal<boolean>("sonido", false),
        prefsAulas: loadLocal<PrefsAulas>("prefsAulas", PREFS_AULAS_DEFAULT),
      });
    },

    setCuenta: (cuenta) => set({ cuenta }),
    setSesionLista: () => set({ sesionLista: true }),

    // Lightweight heartbeat against the backend's public liveness probe (it does not touch the
    // database, so a sleeping remote DB does not read as "no connection"), so
    // the UI goes read-only when the server is unreachable even while
    // navigator.onLine still reports true.
    probarConexion: async () => {
      const version = ++conexionVersion;
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine)
          throw new Error("offline");
        const response = await fetch(`${API_BASE_URL}/actuator/health/liveness`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        // read the body so the connection is released now, not when the abort timer fires
        await response.text().catch(() => "");
        if (!response.ok) throw new Error("Server unavailable");
        if (version !== conexionVersion) return false;
        set({ connected: true });
        return true;
      } catch {
        if (version === conexionVersion) set({ connected: false });
        return false;
      }
    },

    autorizar: async (permiso) => {
      const cuenta = get().cuenta;
      if (!cuenta || !puede(cuenta, permiso)) return false;
      try {
        const fresca = await yo();
        set({ cuenta: fresca });
        return puede(fresca, permiso);
      } catch {
        return false;
      }
    },

    setSonido: (v) => {
      saveLocal("sonido", v);
      set({ sonido: v });
    },

    setPrefsAulas: (p) => {
      saveLocal("prefsAulas", p);
      set({ prefsAulas: p });
    },
  };
});

/** Escalation: a critical event without acknowledgement for 10+ minutes. */
export function estaEscalado(ev: Evento, ahoraMs: number): boolean {
  if (ev.acuse || ev.severidad !== "critico") return false;
  return ahoraMs - new Date(ev.ts).getTime() > 10 * 60_000;
}

/** Short beep for new critical alerts (browsers may block it until a user gesture). */
export function reproducirAlerta() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // audio blocked until user interaction: fine
  }
}
