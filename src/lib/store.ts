"use client";

// Global app state (Zustand). Owns the simulated clock, feeds the rule engine
// tick by tick, accumulates the event log and fires notifications. The engine
// itself lives outside React state: it is mutable and never rendered directly.

import { create } from "zustand";
import { toast } from "sonner";
import type {
  Aula,
  AulaCodigo,
  Escenario,
  EstadoAula,
  EstadoPuerta,
  Evento,
  Horario,
  Magnitud,
  Rol,
  TipoEvento,
  Umbrales,
  Velocidad,
} from "@/lib/types";
import {
  RuleEngine,
  type EngineEmit,
  type EngineSnapshot,
} from "@/lib/rules/engine";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import {
  SimulatedDataSource,
  TICK_MS,
  type DataSource,
  type ScenarioTransition,
} from "@/lib/data/data-source";
import { aplicarRetencion, type LogRow } from "@/lib/events/log";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import {
  cargarLogRows,
  guardarLogRows,
  loadLocal,
  saveLocal,
} from "@/lib/data/storage";
import { notificarTodos } from "@/lib/notify/channels";
import { isoLima } from "@/lib/simulator/generator";
import aulasSeed from "@/data/aulas.json";
import umbralesSeed from "@/data/umbrales.json";

export const AULAS = aulasSeed as Aula[];
export const CODIGOS_AULA = AULAS.map((a) => a.codigo);

/** Admin PIN for the simulated role selector (phase 1; real auth hook in phase 2). */
// Demo PIN is validated server-side; never ship it in the client bundle.

const WARMUP_MIN = 30; // simulate the last 30 min on load so the app never opens empty
const MAX_BUCKETS_POR_TICK = 1000; // safety valve at 60x

type Valores = Partial<Record<Magnitud, number | EstadoPuerta>>;

interface SessionCheckpoint {
  version: 1;
  engine: EngineSnapshot;
  simNowMs: number;
  valores: Record<AulaCodigo, Valores>;
  escenarios: Record<AulaCodigo, Escenario>;
  velocidad: Velocidad;
  corriendo: boolean;
  recentLog: LogRow[];
  scenarioTimeline?: Record<AulaCodigo, ScenarioTransition[]>;
}

interface AppState {
  inicializado: boolean;
  rol: Rol;
  connected: boolean;
  refreshSession: () => Promise<boolean>;
  authorizeWrite: () => Promise<boolean>;
  sonido: boolean;
  umbrales: Umbrales;
  horario: Horario;
  escenarios: Record<AulaCodigo, Escenario>;
  velocidad: Velocidad;
  corriendo: boolean;
  simNowMs: number;
  valores: Record<AulaCodigo, Valores>;
  estados: Record<AulaCodigo, EstadoAula>;
  abiertos: Evento[];
  log: LogRow[];

  iniciar: () => void;
  setRol: (rol: Rol) => Promise<void>;
  login: (pin: string) => Promise<string | null>;
  setSonido: (v: boolean) => void;
  setUmbrales: (u: Umbrales, actor: string) => Promise<boolean>;
  setHorario: (h: Horario, actor: string) => Promise<boolean>;
  setEscenario: (aula: AulaCodigo, e: Escenario) => Promise<boolean>;
  setVelocidad: (v: Velocidad) => Promise<boolean>;
  setCorriendo: (v: boolean) => Promise<boolean>;
  acusar: (aula: AulaCodigo, idEvento: string) => Promise<boolean>;
  inyectarEvento: (aula: AulaCodigo, tipo: TipoEvento) => Promise<boolean>;
  agregarLog: (row: LogRow) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// module-level simulation machinery (not React state)

let engine: RuleEngine | null = null;
let dataSource: DataSource | null = null;
let intervalo: ReturnType<typeof setInterval> | null = null;
let anclaRealMs = 0;
let anclaSimMs = 0;
let ultimoBucketMs = 0;
let pendientesGuardar: LogRow[] = [];
let scenarioTimeline: Record<AulaCodigo, ScenarioTransition[]> = {
  "L-419": [{ at: 0, scenario: "clase_normal" }],
  "A-1001": [{ at: 0, scenario: "clase_normal" }],
};

export function getDataSource(): DataSource {
  if (!dataSource) throw new Error("store no inicializado");
  return dataSource;
}

function simNow(velocidad: number): number {
  return anclaSimMs + (Date.now() - anclaRealMs) * velocidad;
}

export const useApp = create<AppState>((set, get) => {
  let sessionVersion = 0;
  let authPending = false;
  const persistSession = () => {
    if (!engine || !get().inicializado) return;
    const state = get();
    saveLocal<SessionCheckpoint>("session:v2", {
      version: 1,
      engine: engine.snapshot(),
      simNowMs: state.simNowMs,
      valores: state.valores,
      escenarios: state.escenarios,
      velocidad: state.velocidad,
      corriendo: state.corriendo,
      recentLog: state.log.slice(-500),
      scenarioTimeline,
    });
    if (pendientesGuardar.length > 0) {
      const rows = pendientesGuardar;
      pendientesGuardar = [];
      void guardarLogRows(rows);
    }
  };

  const aplicarEmits = (emits: EngineEmit[], fechaMs: number) => {
    if (emits.length === 0) return;
    const nuevas: LogRow[] = [];
    for (const e of emits) {
      if (e.accion === "cerrar") {
        const closed = { ...e.evento };
        pendientesGuardar.push(closed);
        set((s) => ({
          log: s.log.map((row) =>
            row.id_evento === closed.id_evento
              ? { ...row, cerrado: true, acuse: closed.acuse }
              : row,
          ),
        }));
        continue;
      }
      nuevas.push({ ...e.evento });
      if (e.accion === "abrir") {
        const cat = CATALOGO_EVENTOS[e.evento.tipo];
        const titulo = `${cat.nombre} · ${e.evento.aula}`;
        if (e.evento.severidad === "critico") {
          toast.error(titulo, { description: cat.accion, duration: 10_000 });
          if (get().rol === "administrador")
            void notificarTodos({
              titulo,
              cuerpo: cat.accion,
              evento: e.evento,
              url: "/alertas",
            });
          if (get().sonido) reproducirAlerta();
        } else {
          toast.warning(titulo, { description: cat.accion, duration: 6_000 });
        }
      }
    }
    if (nuevas.length > 0) {
      pendientesGuardar.push(...nuevas);
      set((s) => ({ log: aplicarRetencion([...s.log, ...nuevas], fechaMs) }));
    }
  };

  const procesarBucket = (bucketMs: number, silencioso = false) => {
    const eng = engine!;
    const ds = dataSource!;
    const fecha = new Date(bucketMs);
    const emits: EngineEmit[] = [];
    const valores: Record<AulaCodigo, Valores> = { ...get().valores };
    for (const aula of CODIGOS_AULA) {
      const ms = ds.medicionesActuales(aula, fecha);
      const v: Valores = { ...valores[aula] };
      for (const m of ms) {
        v[m.magnitud] = m.valor;
        emits.push(...eng.process(m));
      }
      valores[aula] = v;
    }
    emits.push(...eng.tick(bucketMs));
    if (silencioso) {
      // warm-up: keep log rows, skip toasts/push
      const nuevas = emits
        .filter((e) => e.accion !== "cerrar")
        .map((e) => ({ ...e.evento }));
      pendientesGuardar.push(...nuevas);
      set((s) => ({ log: aplicarRetencion([...s.log, ...nuevas], bucketMs) }));
    } else {
      aplicarEmits(emits, bucketMs);
    }
    set({
      valores,
      abiertos: eng.eventosAbiertos(),
      estados: Object.fromEntries(
        CODIGOS_AULA.map((a) => [a, eng.getEstado(a, fecha)]),
      ) as Record<AulaCodigo, EstadoAula>,
      simNowMs: bucketMs,
    });
  };

  const tickReal = () => {
    const s = get();
    if (!s.corriendo || !engine) return;
    if (
      !s.connected ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      anclaRealMs = Date.now();
      anclaSimMs = s.simNowMs;
      return;
    }
    const objetivo = simNow(s.velocidad);
    let bucket = ultimoBucketMs + TICK_MS;
    let n = 0;
    while (bucket <= objetivo && n < MAX_BUCKETS_POR_TICK) {
      procesarBucket(bucket);
      ultimoBucketMs = bucket;
      bucket += TICK_MS;
      n++;
    }
    if (n > 0) persistSession();
  };

  return {
    inicializado: false,
    rol: "visualizador",
    connected: false,
    sonido: false,
    umbrales: umbralesSeed as Umbrales,
    horario: HORARIO_DEFAULT,
    escenarios: { "L-419": "clase_normal", "A-1001": "clase_normal" },
    velocidad: 1,
    corriendo: true,
    simNowMs: 0,
    valores: { "L-419": {}, "A-1001": {} },
    estados: { "L-419": "Libre", "A-1001": "Libre" },
    abiertos: [],
    log: [],

    iniciar: () => {
      if (get().inicializado || typeof window === "undefined") return;
      const umbrales = loadLocal<Umbrales>(
        "umbrales",
        umbralesSeed as Umbrales,
      );
      const horario = loadLocal<Horario>("horario", HORARIO_DEFAULT);
      const rol: Rol = "visualizador";
      const sonido = loadLocal<boolean>("sonido", false);
      const escenarios = loadLocal<Record<AulaCodigo, Escenario>>(
        "escenarios",
        {
          "L-419": "clase_normal",
          "A-1001": "clase_normal",
        },
      );
      engine = new RuleEngine({ umbrales, horario, aulas: AULAS });
      for (const aula of CODIGOS_AULA) {
        scenarioTimeline[aula] = [
          { at: 0, scenario: "clase_normal" },
          { at: Date.now(), scenario: escenarios[aula] },
        ];
      }
      dataSource = new SimulatedDataSource({
        horario: () => get().horario,
        escenario: (aula) => get().escenarios[aula],
        timeline: (aula) => scenarioTimeline[aula],
      });
      anclaRealMs = Date.now();
      anclaSimMs = Date.now();
      ultimoBucketMs =
        Math.floor((anclaSimMs - WARMUP_MIN * 60_000) / TICK_MS) * TICK_MS;
      set({
        inicializado: true,
        umbrales,
        horario,
        rol,
        sonido,
        escenarios,
        simNowMs: anclaSimMs,
      });
      void get().refreshSession();

      void cargarLogRows().then((rows) => {
        if (rows.length > 0) {
          set((s) => {
            const ids = new Set(s.log.map((r) => r.id_evento));
            const restauradas = rows.filter((r) => !ids.has(r.id_evento));
            return {
              log: aplicarRetencion(
                [...restauradas, ...s.log],
                s.simNowMs || Date.now(),
              ).sort((a, b) => a.ts.localeCompare(b.ts)),
            };
          });
        }
      });

      const checkpoint = loadLocal<SessionCheckpoint | null>(
        "session:v2",
        null,
      );
      let restored = false;
      if (
        checkpoint?.version === 1 &&
        Number.isFinite(checkpoint.simNowMs) &&
        checkpoint.simNowMs > 0 &&
        Array.isArray(checkpoint.recentLog) &&
        checkpoint.valores?.["L-419"] &&
        checkpoint.valores?.["A-1001"] &&
        checkpoint.escenarios?.["L-419"] &&
        checkpoint.escenarios?.["A-1001"] &&
        [1, 10, 60].includes(checkpoint.velocidad)
      ) {
        try {
          engine.restore(checkpoint.engine);
          if (
            checkpoint.scenarioTimeline?.["L-419"] &&
            checkpoint.scenarioTimeline?.["A-1001"]
          )
            scenarioTimeline = checkpoint.scenarioTimeline;
          ultimoBucketMs = checkpoint.simNowMs;
          anclaSimMs = ultimoBucketMs;
          anclaRealMs = Date.now();
          set({
            simNowMs: ultimoBucketMs,
            valores: checkpoint.valores,
            escenarios: checkpoint.escenarios,
            velocidad: checkpoint.velocidad,
            corriendo: checkpoint.corriendo,
            log: aplicarRetencion(checkpoint.recentLog, ultimoBucketMs),
            abiertos: engine.eventosAbiertos(),
            estados: Object.fromEntries(
              CODIGOS_AULA.map((code) => [
                code,
                engine!.getEstado(code, new Date(ultimoBucketMs)),
              ]),
            ) as Record<AulaCodigo, EstadoAula>,
          });
          pendientesGuardar.push(...checkpoint.recentLog);
          restored = true;
        } catch {
          /* Ignore a corrupt checkpoint; IndexedDB history is still restored. */
        }
      }
      if (!restored) {
        // Warm up only a new session. Reloading must not recreate old alerts.
        let bucket = ultimoBucketMs + TICK_MS;
        const ahora = Date.now();
        while (bucket <= ahora) {
          procesarBucket(bucket, true);
          ultimoBucketMs = bucket;
          bucket += TICK_MS;
        }
      }
      persistSession();
      if (intervalo) clearInterval(intervalo);
      intervalo = setInterval(tickReal, 1000);
    },

    refreshSession: async () => {
      if (authPending) return false;
      const version = ++sessionVersion;
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine)
          throw new Error("offline");
        const response = await fetch("/api/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error("Session unavailable");
        const body = await response.json();
        if (body?.rol !== "administrador" && body?.rol !== "visualizador")
          throw new Error("Invalid session response");
        if (version !== sessionVersion) return false;
        set({ rol: body.rol, connected: true });
        return true;
      } catch {
        if (version === sessionVersion)
          set({ rol: "visualizador", connected: false });
        return false;
      }
    },

    authorizeWrite: async () => {
      if (get().rol !== "administrador") return false;
      if (!(await get().refreshSession()) || get().rol !== "administrador") {
        toast.error(
          "No se guardó el cambio. Verifica la conexión e inicia sesión nuevamente.",
        );
        return false;
      }
      return true;
    },

    setRol: async (rol) => {
      if (rol !== "visualizador") return;
      const version = ++sessionVersion;
      authPending = true;
      set({ rol: "visualizador" });
      try {
        const response = await fetch("/api/session", {
          method: "DELETE",
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error("Logout failed");
      } catch {
        toast.error(
          "No se pudo cerrar la sesión del servidor. Reconecta y vuelve a intentarlo antes de salir.",
        );
      } finally {
        if (version === sessionVersion) authPending = false;
      }
    },

    login: async (pin) => {
      const version = ++sessionVersion;
      authPending = true;
      try {
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({ pin }),
        });
        const body = await response.json();
        if (version !== sessionVersion)
          return "La sesión cambió; vuelve a intentarlo.";
        if (!response.ok) return body.error ?? "No se pudo validar el PIN.";
        set({ rol: "administrador", connected: true });
        return null;
      } catch {
        if (version === sessionVersion)
          set({ connected: false, rol: "visualizador" });
        return "Sin conexión: solo lectura. No se pudo validar el PIN.";
      } finally {
        if (version === sessionVersion) authPending = false;
      }
    },

    setSonido: (v) => {
      saveLocal("sonido", v);
      set({ sonido: v });
    },

    setUmbrales: async (u, actor) => {
      if (!(await get().authorizeWrite())) return false;
      saveLocal("umbrales", u);
      engine?.setUmbrales(u);
      const row: LogRow = {
        ts: isoLima(new Date(get().simNowMs || Date.now())),
        aula: "L-419",
        id_evento: `CFG-${Date.now()}`,
        tipo: "cambio_configuracion",
        severidad: "info",
        fuente: "ajustes",
        valor: "umbrales actualizados",
        umbral: "",
        actor,
        estado_resultante: get().estados["L-419"],
      };
      pendientesGuardar.push(row);
      set((s) => ({ umbrales: u, log: [...s.log, row] }));
      persistSession();
      return true;
    },

    setHorario: async (h, actor) => {
      if (!(await get().authorizeWrite())) return false;
      saveLocal("horario", h);
      engine?.setHorario(h);
      const row: LogRow = {
        ts: isoLima(new Date(get().simNowMs || Date.now())),
        aula: "L-419",
        id_evento: `CFG-${Date.now()}-h`,
        tipo: "cambio_configuracion",
        severidad: "info",
        fuente: "ajustes",
        valor: "horario actualizado",
        umbral: "",
        actor,
        estado_resultante: get().estados["L-419"],
      };
      pendientesGuardar.push(row);
      set((s) => ({ horario: h, log: [...s.log, row] }));
      persistSession();
      return true;
    },

    setEscenario: async (aula, e) => {
      if (!(await get().authorizeWrite())) return false;
      if (
        e === "intruso_ventana" &&
        AULAS.find((item) => item.codigo === aula)!.ventanas === 0
      )
        return false;
      scenarioTimeline[aula].push({
        at: get().simNowMs + TICK_MS,
        scenario: e,
      });
      set((s) => {
        const escenarios = { ...s.escenarios, [aula]: e };
        saveLocal("escenarios", escenarios);
        return { escenarios };
      });
      persistSession();
      return true;
    },

    setVelocidad: async (v) => {
      if (!(await get().authorizeWrite())) return false;
      // re-anchor so the sim clock is continuous across speed changes
      anclaSimMs = get().corriendo ? simNow(get().velocidad) : get().simNowMs;
      anclaRealMs = Date.now();
      set({ velocidad: v });
      persistSession();
      return true;
    },

    setCorriendo: async (v) => {
      if (!(await get().authorizeWrite())) return false;
      if (v) {
        anclaSimMs = get().simNowMs || Date.now();
        anclaRealMs = Date.now();
      }
      set({ corriendo: v });
      persistSession();
      return true;
    },

    acusar: async (aula, idEvento) => {
      if (!(await get().authorizeWrite())) return false;
      if (!engine) return false;
      const actor =
        get().rol === "administrador" ? "administrador" : "visualizador";
      const fechaMs = get().simNowMs || Date.now();
      const ev = engine.acusar(aula, idEvento, actor, fechaMs);
      if (!ev) return false;
      const row: LogRow = {
        ts: isoLima(new Date(fechaMs)),
        aula,
        id_evento: `ACK-${idEvento}`,
        tipo: "acuse",
        severidad: "info",
        fuente: idEvento,
        valor: `acuse de ${ev.tipo}`,
        umbral: "",
        actor,
        estado_resultante: engine.getEstado(aula, new Date(fechaMs)),
      };
      pendientesGuardar.push({ ...ev }, row);
      set((s) => ({
        abiertos: engine!.eventosAbiertos(),
        estados: {
          ...s.estados,
          [aula]: engine!.getEstado(aula, new Date(fechaMs)),
        },
        log: [
          ...s.log.map((item) =>
            item.id_evento === ev.id_evento ? { ...ev } : item,
          ),
          row,
        ],
      }));
      persistSession();
      toast.success(`Acuse registrado (${ev.tipo})`);
      return true;
    },

    inyectarEvento: async (aula, tipo) => {
      if (!(await get().authorizeWrite())) return false;
      if (!engine) return false;
      const fechaMs = get().simNowMs || Date.now();
      const emit = engine.inyectar(aula, tipo, fechaMs, "administrador");
      aplicarEmits([emit], fechaMs);
      set((s) => ({
        abiertos: engine!.eventosAbiertos(),
        estados: {
          ...s.estados,
          [aula]: engine!.getEstado(aula, new Date(fechaMs)),
        },
      }));
      persistSession();
      return true;
    },

    agregarLog: async (row) => {
      if (!(await get().authorizeWrite())) return false;
      pendientesGuardar.push(row);
      set((s) => ({ log: [...s.log, row] }));
      persistSession();
      return true;
    },
  };
});

function reproducirAlerta() {
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

/** Escalation: a critical event without acknowledgement for 10+ minutes. */
export function estaEscalado(ev: Evento, simNowMs: number): boolean {
  if (ev.acuse || ev.severidad !== "critico") return false;
  return simNowMs - new Date(ev.ts).getTime() > 10 * 60_000;
}
