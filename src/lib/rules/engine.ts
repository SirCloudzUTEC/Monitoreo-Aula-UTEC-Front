// Rule engine + classroom state machine (SysML: motor de reglas del
// Procesador de Aula). Consumes SYS-09.2 measurements, applies thresholds with
// persistence and hysteresis, and emits catalog events. Simulated and real
// (MQTT) data go through this exact same code path.

import type {
  Aula,
  AulaCodigo,
  EstadoAula,
  EstadoPuerta,
  Evento,
  Horario,
  Medicion,
  NodoId,
  TipoEvento,
  Umbrales,
} from "@/lib/types";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import { claseEnCurso, enHorarioOperacion } from "@/lib/schedule";
import { isoLima } from "@/lib/simulator/generator";

export type Accion = "abrir" | "cerrar" | "info";

export interface EngineEmit {
  accion: Accion;
  evento: Evento;
}

interface Condicion {
  /** first ms the predicate held continuously (null = not holding) */
  desde: number | null;
  /** currently open event for this condition */
  abierto: Evento | null;
}

interface EstadoInterno {
  condiciones: Map<string, Condicion>;
  ultimoValor: Map<string, number | EstadoPuerta>;
  ultimoLatido: Map<NodoId, number>;
  puertaAbiertaDesde: number | null;
  ocupacionPrev: number | null;
  luzPrev: boolean | null;
  puertaPrev: EstadoPuerta | null;
  enClasePrev: boolean | null;
  abiertos: Evento[]; // open out-of-nominal events
}

export interface EngineSnapshot {
  version: 1;
  sessionId: string;
  seq: number;
  states: [
    AulaCodigo,
    Omit<EstadoInterno, "condiciones" | "ultimoValor" | "ultimoLatido"> & {
      condiciones: [string, Condicion][];
      ultimoValor: [string, number | EstadoPuerta][];
      ultimoLatido: [NodoId, number][];
    },
  ][];
}

const MIN = 60_000;

function parseTs(ts: string): number {
  return new Date(ts).getTime();
}

export class RuleEngine {
  private umbrales: Umbrales;
  private horario: Horario;
  private aulas: Aula[];
  private estados = new Map<AulaCodigo, EstadoInterno>();
  private seq = 0;
  private sessionId: string = crypto.randomUUID();

  constructor(opts: { umbrales: Umbrales; horario: Horario; aulas: Aula[] }) {
    this.umbrales = opts.umbrales;
    this.horario = opts.horario;
    this.aulas = opts.aulas;
    for (const a of opts.aulas) {
      this.estados.set(a.codigo, {
        condiciones: new Map(),
        ultimoValor: new Map(),
        ultimoLatido: new Map(),
        puertaAbiertaDesde: null,
        ocupacionPrev: null,
        luzPrev: null,
        puertaPrev: null,
        enClasePrev: null,
        abiertos: [],
      });
    }
  }

  snapshot(): EngineSnapshot {
    return structuredClone({
      version: 1,
      sessionId: this.sessionId,
      seq: this.seq,
      states: [...this.estados.entries()].map(([code, state]) => [
        code,
        {
          ...state,
          condiciones: [...state.condiciones],
          ultimoValor: [...state.ultimoValor],
          ultimoLatido: [...state.ultimoLatido],
        },
      ]),
    } as EngineSnapshot);
  }

  restore(snapshot: EngineSnapshot): void {
    if (
      snapshot.version !== 1 ||
      !snapshot.sessionId ||
      !Array.isArray(snapshot.states)
    )
      throw new Error("Estado de simulación inválido.");
    const restored = new Map<AulaCodigo, EstadoInterno>();
    for (const [code, stored] of snapshot.states) {
      if (!this.estados.has(code))
        throw new Error("Aula no válida en el estado guardado.");
      const state = structuredClone(stored);
      const open = new Map(
        state.abiertos.map((event) => [event.id_evento, event]),
      );
      restored.set(code, {
        ...state,
        condiciones: new Map(
          state.condiciones.map(([key, condition]) => [
            key,
            {
              ...condition,
              abierto: condition.abierto
                ? (open.get(condition.abierto.id_evento) ?? null)
                : null,
            },
          ]),
        ),
        ultimoValor: new Map(state.ultimoValor),
        ultimoLatido: new Map(state.ultimoLatido),
      });
    }
    if (restored.size !== this.estados.size)
      throw new Error("Faltan aulas en el estado guardado.");
    this.sessionId = snapshot.sessionId;
    this.seq = snapshot.seq;
    this.estados = restored;
  }

  setUmbrales(u: Umbrales) {
    this.umbrales = u;
  }

  setHorario(h: Horario) {
    this.horario = h;
  }

  getUmbrales(): Umbrales {
    return this.umbrales;
  }

  eventosAbiertos(aula?: AulaCodigo): Evento[] {
    if (aula) return [...(this.estados.get(aula)?.abiertos ?? [])];
    return [...this.estados.values()].flatMap((s) => s.abiertos);
  }

  /** Base state from schedule; Alerta overrides while an open event lacks acknowledgement. */
  getEstado(aula: AulaCodigo, fecha: Date): EstadoAula {
    const st = this.estados.get(aula);
    if (st && st.abiertos.some((e) => !e.acuse)) return "Alerta";
    return this.estadoBase(aula, fecha);
  }

  private estadoBase(aula: AulaCodigo, fecha: Date): EstadoAula {
    if (!enHorarioOperacion(fecha)) return "Cerrada";
    return claseEnCurso(this.horario, aula, fecha) ? "EnClase" : "Libre";
  }

  private nuevoEvento(
    aula: AulaCodigo,
    tipo: TipoEvento,
    fechaMs: number,
    fuente: string,
    valor: string,
    umbral: string,
    actor: string,
  ): Evento {
    const cat = CATALOGO_EVENTOS[tipo];
    this.seq += 1;
    const ev: Evento = {
      ts: isoLima(new Date(fechaMs)),
      aula,
      id_evento: `EV-${this.sessionId}-${String(this.seq).padStart(5, "0")}`,
      tipo,
      severidad: cat.severidad,
      fuente,
      valor,
      umbral,
      actor,
      estado_resultante: "Libre", // fixed below
      acuse: null,
      cerrado: false,
    };
    return ev;
  }

  private abrir(
    st: EstadoInterno,
    aula: AulaCodigo,
    key: string,
    tipo: TipoEvento,
    fechaMs: number,
    fuente: string,
    valor: string,
    umbral: string,
  ): EngineEmit {
    const ev = this.nuevoEvento(
      aula,
      tipo,
      fechaMs,
      fuente,
      valor,
      umbral,
      "motorReglas",
    );
    const cond = st.condiciones.get(key)!;
    cond.abierto = ev;
    st.abiertos.push(ev);
    ev.estado_resultante = this.getEstado(aula, new Date(fechaMs));
    return { accion: "abrir", evento: ev };
  }

  private cerrarCond(
    st: EstadoInterno,
    aula: AulaCodigo,
    key: string,
    fechaMs: number,
  ): EngineEmit | null {
    const cond = st.condiciones.get(key);
    if (!cond?.abierto) return null;
    const ev = cond.abierto;
    ev.cerrado = true;
    cond.abierto = null;
    cond.desde = null;
    st.abiertos = st.abiertos.filter((e) => e.id_evento !== ev.id_evento);
    const copia = {
      ...ev,
      estado_resultante: this.getEstado(aula, new Date(fechaMs)),
    };
    return { accion: "cerrar", evento: copia };
  }

  /**
   * Threshold with persistence + hysteresis:
   * opens after `predicado` holds `persistenciaMs`; closes when `liberado` holds.
   */
  private evaluar(
    st: EstadoInterno,
    aula: AulaCodigo,
    key: string,
    tipo: TipoEvento,
    fechaMs: number,
    predicado: boolean,
    liberado: boolean,
    persistenciaMs: number,
    fuente: string,
    valor: string,
    umbral: string,
    emits: EngineEmit[],
  ) {
    let cond = st.condiciones.get(key);
    if (!cond) {
      cond = { desde: null, abierto: null };
      st.condiciones.set(key, cond);
    }
    if (cond.abierto) {
      if (liberado) {
        const e = this.cerrarCond(st, aula, key, fechaMs);
        if (e) emits.push(e);
      }
      return;
    }
    if (predicado) {
      if (cond.desde === null) cond.desde = fechaMs;
      if (fechaMs - cond.desde >= persistenciaMs) {
        emits.push(
          this.abrir(st, aula, key, tipo, fechaMs, fuente, valor, umbral),
        );
      }
    } else {
      cond.desde = null;
    }
  }

  private info(
    aula: AulaCodigo,
    tipo: TipoEvento,
    fechaMs: number,
    fuente: string,
    valor: string,
    actor = "sistema",
  ): EngineEmit {
    const ev = this.nuevoEvento(aula, tipo, fechaMs, fuente, valor, "", actor);
    ev.estado_resultante = this.getEstado(aula, new Date(fechaMs));
    return { accion: "info", evento: ev };
  }

  /** Feed one measurement. Returns emitted events (opened / closed / info). */
  process(m: Medicion): EngineEmit[] {
    const st = this.estados.get(m.aula);
    if (!st) return [];
    const u = this.umbrales;
    const tMs = parseTs(m.ts);
    const fecha = new Date(tMs);
    const emits: EngineEmit[] = [];
    st.ultimoValor.set(
      m.magnitud === "proximidad_ventana"
        ? `${m.magnitud}:${m.nodo}`
        : m.magnitud,
      m.valor,
    );

    switch (m.magnitud) {
      case "temperatura": {
        const v = m.valor as number;
        this.evaluar(
          st,
          m.aula,
          "temp",
          "temperatura_fuera_confort",
          tMs,
          v > u.umbralTemp,
          v <= u.umbralTemp - u.umbralTempHisteresis,
          u.umbralTempPersistenciaMin * MIN,
          m.nodo,
          `${v} °C`,
          `> ${u.umbralTemp} °C por ${u.umbralTempPersistenciaMin} min`,
          emits,
        );
        break;
      }
      case "humedad": {
        const v = m.valor as number;
        this.evaluar(
          st,
          m.aula,
          "hr",
          "hr_fuera_confort",
          tMs,
          v < u.hrMin || v > u.hrMax,
          v >= u.hrMin + 2 && v <= u.hrMax - 2,
          u.hrPersistenciaMin * MIN,
          m.nodo,
          `${v} %`,
          `fuera de ${u.hrMin}-${u.hrMax} % por ${u.hrPersistenciaMin} min`,
          emits,
        );
        break;
      }
      case "co2": {
        const v = m.valor as number;
        this.evaluar(
          st,
          m.aula,
          "co2_aviso",
          "co2_aviso",
          tMs,
          v >= u.co2Aviso,
          v < u.co2Aviso - 50,
          u.co2PersistenciaMin * MIN,
          m.nodo,
          `${v} ppm`,
          `>= ${u.co2Aviso} ppm por ${u.co2PersistenciaMin} min`,
          emits,
        );
        this.evaluar(
          st,
          m.aula,
          "co2_alerta",
          "co2_alerta",
          tMs,
          v >= u.co2Alerta,
          v < u.co2Alerta - 50,
          u.co2PersistenciaMin * MIN,
          m.nodo,
          `${v} ppm`,
          `>= ${u.co2Alerta} ppm por ${u.co2PersistenciaMin} min`,
          emits,
        );
        break;
      }
      case "pm25": {
        const v = m.valor as number;
        this.evaluar(
          st,
          m.aula,
          "pm25",
          "pm25_alto",
          tMs,
          v > u.pm25Max,
          v <= u.pm25Max - 3,
          u.pm25PersistenciaMin * MIN,
          m.nodo,
          `${v} µg/m³`,
          `> ${u.pm25Max} µg/m³ por ${u.pm25PersistenciaMin} min`,
          emits,
        );
        break;
      }
      case "ruido": {
        const v = m.valor as number;
        this.evaluar(
          st,
          m.aula,
          "ruido",
          "ruido_excesivo",
          tMs,
          v > u.umbralRuido,
          v <= u.umbralRuido - 3,
          1 * MIN, // LAeq window of 1 minute
          m.nodo,
          `${v} dBA`,
          `> ${u.umbralRuido} dBA (LAeq 1 min)`,
          emits,
        );
        break;
      }
      case "lux": {
        const v = m.valor as number;
        const enClase = claseEnCurso(this.horario, m.aula, fecha);
        this.evaluar(
          st,
          m.aula,
          "lux",
          "iluminacion_insuficiente",
          tMs,
          enClase && v < u.umbralLux,
          !enClase || v >= u.umbralLux + 30,
          u.luxPersistenciaMin * MIN,
          m.nodo,
          `${v} lx`,
          `< ${u.umbralLux} lx en clase por ${u.luxPersistenciaMin} min (objetivo ${u.luxObjetivo} lx)`,
          emits,
        );
        // nominal light on/off transitions
        const luzOn = v >= 150;
        if (st.luzPrev !== null && luzOn !== st.luzPrev) {
          emits.push(
            this.info(
              m.aula,
              luzOn ? "luz_encendida" : "luz_apagada",
              tMs,
              m.nodo,
              `${v} lx`,
            ),
          );
        }
        st.luzPrev = luzOn;
        break;
      }
      case "ocupacion": {
        const v = m.valor as number;
        const cfg = this.aulas.find((a) => a.codigo === m.aula)!;
        const aforo = Math.min(u.aforoMaximo, cfg.aforo);
        this.evaluar(
          st,
          m.aula,
          "aforo",
          "aforo_excedido",
          tMs,
          v > aforo,
          v <= aforo,
          0, // capacity violations open immediately
          m.nodo,
          `${v} personas`,
          `> ${aforo} personas`,
          emits,
        );
        if (st.ocupacionPrev !== null && v !== st.ocupacionPrev) {
          const tipo: TipoEvento = v > st.ocupacionPrev ? "ingreso" : "egreso";
          emits.push(
            this.info(
              m.aula,
              tipo,
              tMs,
              "nodoPuerta",
              `${st.ocupacionPrev} -> ${v}`,
            ),
          );
        }
        st.ocupacionPrev = v;
        break;
      }
      case "puerta": {
        const v = m.valor as EstadoPuerta;
        if (v === "abierta") {
          if (st.puertaAbiertaDesde === null) st.puertaAbiertaDesde = tMs;
        } else {
          st.puertaAbiertaDesde = null;
          const e = this.cerrarCond(st, m.aula, "puerta", tMs);
          if (e) emits.push(e);
        }
        const enClase = claseEnCurso(this.horario, m.aula, fecha);
        const maxMin = enClase
          ? u.puertaAbiertaMaxEnClaseMin
          : u.puertaAbiertaMaxFueraHorarioMin;
        this.evaluar(
          st,
          m.aula,
          "puerta",
          "puerta_abierta",
          tMs,
          v === "abierta",
          v !== "abierta",
          maxMin * MIN,
          m.nodo,
          v,
          `abierta > ${maxMin} min ${enClase ? "en clase" : "fuera de horario"}`,
          emits,
        );
        if (
          st.puertaPrev !== null &&
          v === "asegurada" &&
          st.puertaPrev !== "asegurada"
        ) {
          emits.push(this.info(m.aula, "puerta_asegurada", tMs, m.nodo, v));
        }
        st.puertaPrev = v;
        break;
      }
      case "proximidad_ventana": {
        const v = m.valor as number;
        const enClase = claseEnCurso(this.horario, m.aula, fecha);
        const ocup =
          (st.ultimoValor.get("ocupacion") as number | undefined) ?? 0;
        const vigilancia =
          !enHorarioOperacion(fecha) || (!enClase && ocup === 0);
        this.evaluar(
          st,
          m.aula,
          `prox:${m.nodo}`,
          "proximidad_ventana",
          tMs,
          vigilancia && v < u.distVentana,
          v >= u.distVentanaHisteresis || !vigilancia,
          u.distVentanaPersistenciaSeg * 1000,
          m.nodo,
          `${v} m`,
          `< ${u.distVentana} m por ${u.distVentanaPersistenciaSeg} s (libera a ${u.distVentanaHisteresis} m)`,
          emits,
        );
        break;
      }
      case "bateria": {
        const v = m.valor as number;
        this.evaluar(
          st,
          m.aula,
          `bat:${m.nodo}`,
          "bateria_baja",
          tMs,
          v < u.bateriaBaja,
          v >= u.bateriaBaja + 5,
          0,
          m.nodo,
          `${v} %`,
          `< ${u.bateriaBaja} %`,
          emits,
        );
        break;
      }
      case "latido": {
        st.ultimoLatido.set(m.nodo, tMs);
        // node back online closes its nodo_sin_datos / procesador_offline
        const key =
          m.nodo === "procesadorAula" ? "procesador" : `latido:${m.nodo}`;
        const e = this.cerrarCond(st, m.aula, key, tMs);
        if (e) emits.push(e);
        break;
      }
      default:
        break;
    }
    return emits;
  }

  /**
   * Time-based rules, called once per tick with the sim-clock time:
   * schedule transitions (inicio/fin de clase) and watchdogs (heartbeats).
   */
  tick(fechaMs: number): EngineEmit[] {
    const emits: EngineEmit[] = [];
    const fecha = new Date(fechaMs);
    const u = this.umbrales;
    for (const aulaCfg of this.aulas) {
      const aula = aulaCfg.codigo;
      const st = this.estados.get(aula)!;

      const enClase = claseEnCurso(this.horario, aula, fecha);
      if (st.enClasePrev !== null && enClase !== st.enClasePrev) {
        emits.push(
          this.info(
            aula,
            enClase ? "inicio_clase" : "fin_clase",
            fechaMs,
            "horario",
            "",
          ),
        );
      }
      st.enClasePrev = enClase;

      // watchdogs only make sense once we have seen at least one heartbeat
      for (const nodo of aulaCfg.nodos) {
        const ultimo = st.ultimoLatido.get(nodo);
        if (ultimo === undefined) continue;
        if (nodo === "procesadorAula") {
          this.evaluar(
            st,
            aula,
            "procesador",
            "procesador_offline",
            fechaMs,
            fechaMs - ultimo > u.procesadorOfflineSeg * 1000,
            false,
            0,
            "servidorGemelo",
            `${Math.round((fechaMs - ultimo) / 1000)} s sin latido`,
            `> ${u.procesadorOfflineSeg} s`,
            emits,
          );
        } else {
          this.evaluar(
            st,
            aula,
            `latido:${nodo}`,
            "nodo_sin_datos",
            fechaMs,
            fechaMs - ultimo > u.nodoSinDatosMin * MIN,
            false,
            0,
            nodo,
            `${Math.round((fechaMs - ultimo) / MIN)} min sin latido`,
            `> ${u.nodoSinDatosMin} min (latido cada ${u.latidoMin} min)`,
            emits,
          );
        }
      }
    }
    return emits;
  }

  /** Acknowledge an open event. Returns the updated event, or null if not found. */
  acusar(
    aula: AulaCodigo,
    idEvento: string,
    actor: string,
    fechaMs: number,
  ): Evento | null {
    const st = this.estados.get(aula);
    if (!st) return null;
    const ev = st.abiertos.find((e) => e.id_evento === idEvento);
    if (!ev || ev.acuse) return null;
    ev.acuse = { actor, ts: isoLima(new Date(fechaMs)) };
    // manually injected events have no clearing condition: acknowledging closes them
    if (ev.fuente === "inyeccionManual") {
      ev.cerrado = true;
      st.abiertos = st.abiertos.filter((e) => e.id_evento !== ev.id_evento);
    }
    return ev;
  }

  /** Manually inject a catalog event (simulator UI, admin only). */
  inyectar(
    aula: AulaCodigo,
    tipo: TipoEvento,
    fechaMs: number,
    actor: string,
  ): EngineEmit {
    const st = this.estados.get(aula)!;
    const cat = CATALOGO_EVENTOS[tipo];
    if (cat.severidad === "info")
      return this.info(aula, tipo, fechaMs, "inyeccionManual", "", actor);
    const ev = this.nuevoEvento(
      aula,
      tipo,
      fechaMs,
      "inyeccionManual",
      "inyectado",
      "",
      actor,
    );
    st.abiertos.push(ev);
    ev.estado_resultante = this.getEstado(aula, new Date(fechaMs));
    return { accion: "abrir", evento: ev };
  }
}
