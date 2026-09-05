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
import { RuleEngine, type EngineEmit } from "@/lib/rules/engine";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import { SimulatedDataSource, TICK_MS, type DataSource } from "@/lib/data/data-source";
import { aplicarRetencion, type LogRow } from "@/lib/events/log";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import { cargarLogRows, guardarLogRows, loadLocal, saveLocal } from "@/lib/data/storage";
import { notificarTodos } from "@/lib/notify/channels";
import { isoLima } from "@/lib/simulator/generator";
import aulasSeed from "@/data/aulas.json";
import umbralesSeed from "@/data/umbrales.json";

export const AULAS = aulasSeed as Aula[];
export const CODIGOS_AULA = AULAS.map((a) => a.codigo);

/** Admin PIN for the simulated role selector (phase 1; real auth hook in phase 2). */
export const PIN_ADMIN = "2026";

const WARMUP_MIN = 30; // simulate the last 30 min on load so the app never opens empty
const MAX_BUCKETS_POR_TICK = 1000; // safety valve at 60x

type Valores = Partial<Record<Magnitud, number | EstadoPuerta>>;

interface AppState {
  inicializado: boolean;
  rol: Rol;
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
  setRol: (rol: Rol) => void;
  setSonido: (v: boolean) => void;
  setUmbrales: (u: Umbrales, actor: string) => void;
  setHorario: (h: Horario, actor: string) => void;
  setEscenario: (aula: AulaCodigo, e: Escenario) => void;
  setVelocidad: (v: Velocidad) => void;
  setCorriendo: (v: boolean) => void;
  acusar: (aula: AulaCodigo, idEvento: string) => void;
  inyectarEvento: (aula: AulaCodigo, tipo: TipoEvento) => void;
  agregarLog: (row: LogRow) => void;
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

export function getDataSource(): DataSource {
  if (!dataSource) throw new Error("store no inicializado");
  return dataSource;
}

function simNow(velocidad: number): number {
  return anclaSimMs + (Date.now() - anclaRealMs) * velocidad;
}

export const useApp = create<AppState>((set, get) => {
  const aplicarEmits = (emits: EngineEmit[], fechaMs: number) => {
    if (emits.length === 0) return;
    const nuevas: LogRow[] = [];
    for (const e of emits) {
      if (e.accion === "cerrar") continue; // closures update the open list, not the log
      nuevas.push({ ...e.evento });
      if (e.accion === "abrir") {
        const cat = CATALOGO_EVENTOS[e.evento.tipo];
        const titulo = `${cat.nombre} · ${e.evento.aula}`;
        if (e.evento.severidad === "critico") {
          toast.error(titulo, { description: cat.accion, duration: 10_000 });
          void notificarTodos({ titulo, cuerpo: cat.accion, evento: e.evento, url: "/alertas" });
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
      const nuevas = emits.filter((e) => e.accion !== "cerrar").map((e) => ({ ...e.evento }));
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
    const objetivo = simNow(s.velocidad);
    let bucket = ultimoBucketMs + TICK_MS;
    let n = 0;
    while (bucket <= objetivo && n < MAX_BUCKETS_POR_TICK) {
      procesarBucket(bucket);
      ultimoBucketMs = bucket;
      bucket += TICK_MS;
      n++;
    }
    if (pendientesGuardar.length > 0) {
      void guardarLogRows(pendientesGuardar);
      pendientesGuardar = [];
    }
  };

  return {
    inicializado: false,
    rol: "visualizador",
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
      const umbrales = loadLocal<Umbrales>("umbrales", umbralesSeed as Umbrales);
      const horario = loadLocal<Horario>("horario", HORARIO_DEFAULT);
      const rol = loadLocal<Rol>("rol", "visualizador");
      const sonido = loadLocal<boolean>("sonido", false);
      const escenarios = loadLocal<Record<AulaCodigo, Escenario>>("escenarios", {
        "L-419": "clase_normal",
        "A-1001": "clase_normal",
      });
      engine = new RuleEngine({ umbrales, horario, aulas: AULAS });
      dataSource = new SimulatedDataSource({
        horario,
        escenario: (aula) => get().escenarios[aula],
      });
      anclaRealMs = Date.now();
      anclaSimMs = Date.now();
      ultimoBucketMs = Math.floor((anclaSimMs - WARMUP_MIN * 60_000) / TICK_MS) * TICK_MS;
      set({ inicializado: true, umbrales, horario, rol, sonido, escenarios, simNowMs: anclaSimMs });

      void cargarLogRows().then((rows) => {
        if (rows.length > 0) {
          set((s) => {
            const ids = new Set(s.log.map((r) => r.id_evento));
            const restauradas = rows.filter((r) => !ids.has(r.id_evento));
            return { log: aplicarRetencion([...restauradas, ...s.log], Date.now()) };
          });
        }
      });

      // warm-up: replay the last 30 sim-minutes without notifications
      let bucket = ultimoBucketMs + TICK_MS;
      const ahora = Date.now();
      while (bucket <= ahora) {
        procesarBucket(bucket, true);
        ultimoBucketMs = bucket;
        bucket += TICK_MS;
      }
      if (pendientesGuardar.length > 0) {
        void guardarLogRows(pendientesGuardar);
        pendientesGuardar = [];
      }
      if (intervalo) clearInterval(intervalo);
      intervalo = setInterval(tickReal, 1000);
    },

    setRol: (rol) => {
      saveLocal("rol", rol);
      set({ rol });
    },

    setSonido: (v) => {
      saveLocal("sonido", v);
      set({ sonido: v });
    },

    setUmbrales: (u, actor) => {
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
    },

    setHorario: (h, actor) => {
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
    },

    setEscenario: (aula, e) => {
      set((s) => {
        const escenarios = { ...s.escenarios, [aula]: e };
        saveLocal("escenarios", escenarios);
        return { escenarios };
      });
    },

    setVelocidad: (v) => {
      // re-anchor so the sim clock is continuous across speed changes
      anclaSimMs = simNow(get().velocidad);
      anclaRealMs = Date.now();
      set({ velocidad: v });
    },

    setCorriendo: (v) => {
      if (v) {
        anclaSimMs = get().simNowMs || Date.now();
        anclaRealMs = Date.now();
      }
      set({ corriendo: v });
    },

    acusar: (aula, idEvento) => {
      if (!engine) return;
      const actor = get().rol === "administrador" ? "administrador" : "visualizador";
      const fechaMs = get().simNowMs || Date.now();
      const ev = engine.acusar(aula, idEvento, actor, fechaMs);
      if (!ev) return;
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
      pendientesGuardar.push(row);
      set((s) => ({
        abiertos: engine!.eventosAbiertos(),
        estados: { ...s.estados, [aula]: engine!.getEstado(aula, new Date(fechaMs)) },
        log: [...s.log, row],
      }));
      toast.success(`Acuse registrado (${ev.tipo})`);
    },

    inyectarEvento: (aula, tipo) => {
      if (!engine) return;
      const fechaMs = get().simNowMs || Date.now();
      const emit = engine.inyectar(aula, tipo, fechaMs, "administrador");
      aplicarEmits([emit], fechaMs);
      set((s) => ({
        abiertos: engine!.eventosAbiertos(),
        estados: { ...s.estados, [aula]: engine!.getEstado(aula, new Date(fechaMs)) },
      }));
    },

    agregarLog: (row) => {
      pendientesGuardar.push(row);
      set((s) => ({ log: [...s.log, row] }));
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
