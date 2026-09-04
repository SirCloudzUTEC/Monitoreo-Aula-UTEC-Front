import { getEventoInfo } from "@/domain/catalogo-eventos";
import { DURACION_SOSTENIDO, RANGO_MAGNITUD, demoSecondsFromMinutes } from "@/domain/constants";
import type { CodigoEvento, EstadoAula, Magnitud } from "@/domain/enums";
import type { Alerta, Aula, AulaId, ConfiguracionAula, Evento, Lectura, Vulnerabilidad } from "@/domain/types";
import { chance, meanRevertingStep, uid } from "@/data/mock/random";
import { MAGNITUDES_AMBIENTALES, seedAulas, seedConfiguraciones, seedLecturaInicial } from "@/data/mock/aulas.seed";

const SERIE_MAX_PUNTOS = 120;
const EVENTOS_MAX = 500;
const ALERTAS_MAX = 200;

export interface SimulationState {
  aulas: Record<AulaId, Aula>;
  configuraciones: Record<AulaId, ConfiguracionAula>;
  lecturas: Record<AulaId, Record<Magnitud, number>>;
  series: Record<AulaId, Partial<Record<Magnitud, Lectura[]>>>;
  eventos: Evento[];
  alertas: Alerta[];
  vulnerabilidades: Vulnerabilidad[];
  /** Marca de tiempo (ms) desde que una condicion esta fuera de rango, por clave `aulaId:codigo`. */
  outOfRangeSince: Record<string, number>;
  /** Marca de tiempo (ms) desde que un nodo dejo de reportar, por id de nodo. */
  nodoSinSenalDesde: Record<string, number>;
  /** Marca de tiempo (ms) desde que el procesador de aula esta caido, por aula. */
  procesadorOfflineDesde: Partial<Record<AulaId, number>>;
  controls: { running: boolean; speedMultiplier: number };
}

export function createInitialState(): SimulationState {
  return {
    aulas: seedAulas(),
    configuraciones: seedConfiguraciones(),
    lecturas: seedLecturaInicial(),
    series: {} as SimulationState["series"],
    eventos: [],
    alertas: [],
    vulnerabilidades: [],
    outOfRangeSince: {},
    nodoSinSenalDesde: {},
    procesadorOfflineDesde: {},
    controls: { running: true, speedMultiplier: 1 },
  };
}

function keyFor(aulaId: AulaId, codigo: string): string {
  return `${aulaId}:${codigo}`;
}

function minutosDelDia(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function estaEnHorario(config: ConfiguracionAula, now: Date): boolean {
  const dia = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const minutos = minutosDelDia(now);
  return config.horario.some((bloque) => {
    if (bloque.dia !== dia) return false;
    const [hIni, mIni] = bloque.inicio.split(":").map(Number);
    const [hFin, mFin] = bloque.fin.split(":").map(Number);
    return minutos >= hIni * 60 + mIni && minutos < hFin * 60 + mFin;
  });
}

function pushSerie(state: SimulationState, aulaId: AulaId, magnitud: Magnitud, lectura: Lectura) {
  const porAula = (state.series[aulaId] ??= {});
  const serie = (porAula[magnitud] ??= []);
  serie.push(lectura);
  if (serie.length > SERIE_MAX_PUNTOS) serie.shift();
}

function hayAlertaPendiente(state: SimulationState, aulaId: AulaId, codigo: CodigoEvento): boolean {
  return state.alertas.some((a) => a.aulaId === aulaId && a.codigo === codigo && a.estadoAcuse === "pendiente");
}

function emitirEvento(
  state: SimulationState,
  aulaId: AulaId,
  codigo: CodigoEvento,
  nowIso: string,
  overrides: Partial<Pick<Evento, "magnitud" | "valorObservado" | "actor" | "mensaje" | "severidad">> = {},
) {
  const info = getEventoInfo(codigo);
  const evento: Evento = {
    id: uid("evt"),
    aulaId,
    codigo,
    tipo: info.tipo,
    severidad: overrides.severidad ?? info.severidadDefault,
    timestamp: nowIso,
    actor: overrides.actor ?? { tipo: "sistema", nombre: "Motor de simulacion" },
    magnitud: overrides.magnitud ?? info.magnitud,
    valorObservado: overrides.valorObservado,
    mensaje: overrides.mensaje ?? info.descripcionOperador,
  };
  state.eventos.push(evento);
  if (state.eventos.length > EVENTOS_MAX) state.eventos.shift();

  if (info.generaAlerta && !hayAlertaPendiente(state, aulaId, codigo)) {
    const alerta: Alerta = {
      id: uid("alr"),
      aulaId,
      eventoId: evento.id,
      codigo,
      severidad: evento.severidad,
      timestamp: nowIso,
      mensaje: evento.mensaje,
      estadoAcuse: "pendiente",
    };
    state.alertas.push(alerta);
    if (state.alertas.length > ALERTAS_MAX) state.alertas.shift();
  }
  return evento;
}

/**
 * Evalua una condicion "fuera de rango" que debe sostenerse `demoSegundos`
 * (ya comprimidos respecto a la duracion real) antes de disparar el evento.
 * Si la condicion deja de cumplirse, se reinicia el conteo.
 */
function evaluarSostenido(
  state: SimulationState,
  aulaId: AulaId,
  codigo: CodigoEvento,
  fueraDeRango: boolean,
  demoSegundos: number,
  nowMs: number,
) {
  const key = keyFor(aulaId, codigo);
  if (!fueraDeRango) {
    delete state.outOfRangeSince[key];
    return;
  }
  if (state.outOfRangeSince[key] === undefined) {
    state.outOfRangeSince[key] = nowMs;
    return;
  }
  const elapsedSec = (nowMs - state.outOfRangeSince[key]) / 1000;
  if (elapsedSec >= demoSegundos) {
    emitirEvento(state, aulaId, codigo, new Date(nowMs).toISOString());
    delete state.outOfRangeSince[key];
  }
}

function actualizarMagnitudesAmbientales(
  state: SimulationState,
  aulaId: AulaId,
  config: ConfiguracionAula,
  enHorario: boolean,
  ocupacion: number,
  nowMs: number,
  speedMultiplier: number,
) {
  const nowIso = new Date(nowMs).toISOString();
  const lecturasAula = state.lecturas[aulaId];

  const targets: Partial<Record<Magnitud, number>> = {
    co2: RANGO_MAGNITUD.co2.target + ocupacion * 18,
    temperatura: RANGO_MAGNITUD.temperatura.target + ocupacion * 0.06 + (enHorario ? 0.4 : 0),
    ruido: enHorario ? RANGO_MAGNITUD.ruido.target + 6 + ocupacion * 0.3 : RANGO_MAGNITUD.ruido.target - 8,
    iluminancia: enHorario ? RANGO_MAGNITUD.iluminancia.target : 60,
    humedad: RANGO_MAGNITUD.humedad.target,
    pm25: RANGO_MAGNITUD.pm25.target,
  };

  for (const magnitud of MAGNITUDES_AMBIENTALES) {
    const rango = RANGO_MAGNITUD[magnitud];
    const target = targets[magnitud] ?? rango.target;
    const prev = lecturasAula[magnitud];
    const next = meanRevertingStep(prev, target, rango.stdDev, rango.pull, rango.min, rango.max);
    lecturasAula[magnitud] = next;
    pushSerie(state, aulaId, magnitud, { aulaId, magnitud, valor: next, unidad: rango.unidad, timestamp: nowIso });
  }

  // Umbrales de confort / calidad ambiental.
  evaluarSostenido(
    state,
    aulaId,
    "temperatura_fuera_confort",
    lecturasAula.temperatura > config.umbrales.temperaturaConfortMax,
    DURACION_SOSTENIDO.temperatura_fuera_confort.demoSegundos / speedMultiplier,
    nowMs,
  );
  evaluarSostenido(
    state,
    aulaId,
    "hr_fuera_confort",
    lecturasAula.humedad < config.umbrales.hrConfortMin || lecturasAula.humedad > config.umbrales.hrConfortMax,
    DURACION_SOSTENIDO.hr_fuera_confort.demoSegundos / speedMultiplier,
    nowMs,
  );
  evaluarSostenido(
    state,
    aulaId,
    "co2_alerta",
    lecturasAula.co2 > config.umbrales.co2AlertaPpm,
    DURACION_SOSTENIDO.co2_alerta.demoSegundos / speedMultiplier,
    nowMs,
  );
  if (lecturasAula.co2 <= config.umbrales.co2AlertaPpm) {
    evaluarSostenido(
      state,
      aulaId,
      "co2_aviso",
      lecturasAula.co2 > config.umbrales.co2AvisoPpm,
      DURACION_SOSTENIDO.co2_aviso.demoSegundos / speedMultiplier,
      nowMs,
    );
  }
  evaluarSostenido(
    state,
    aulaId,
    "pm25_alto",
    lecturasAula.pm25 > config.umbrales.pm25AlertaUgM3,
    DURACION_SOSTENIDO.pm25_alto.demoSegundos / speedMultiplier,
    nowMs,
  );
  evaluarSostenido(
    state,
    aulaId,
    "ruido_excesivo",
    lecturasAula.ruido > config.umbrales.ruidoAlertaDba,
    DURACION_SOSTENIDO.ruido_excesivo.demoSegundos / speedMultiplier,
    nowMs,
  );
  evaluarSostenido(
    state,
    aulaId,
    "iluminacion_insuficiente",
    enHorario && lecturasAula.iluminancia < config.umbrales.iluminanciaMinLux,
    DURACION_SOSTENIDO.iluminacion_insuficiente.demoSegundos / speedMultiplier,
    nowMs,
  );

  // Luz encendida / apagada (umbral fijo de percepcion, no requiere sostenido).
  const luzEncendida = lecturasAula.iluminancia > 150;
  const key = keyFor(aulaId, "__luz_estado");
  const estadoPrevio = state.outOfRangeSince[key];
  const actual = luzEncendida ? 1 : 0;
  if (estadoPrevio !== actual) {
    emitirEvento(state, aulaId, luzEncendida ? "luz_encendida" : "luz_apagada", nowIso);
    state.outOfRangeSince[key] = actual;
  }
}

function actualizarOcupacionYPuerta(
  state: SimulationState,
  aula: Aula,
  config: ConfiguracionAula,
  enHorario: boolean,
  nowMs: number,
  speedMultiplier: number,
) {
  const nowIso = new Date(nowMs).toISOString();
  const rango = RANGO_MAGNITUD.aforo;
  const forzarExceso = enHorario && chance(0.01);
  const target = enHorario ? Math.min(rango.max, config.aforoMaximo * 0.65 + (forzarExceso ? config.aforoMaximo * 0.5 : 0)) : 0;
  const prevAforo = state.lecturas[aula.id].aforo;
  const nuevoAforo = meanRevertingStep(prevAforo, target, rango.stdDev, rango.pull, 0, config.aforoMaximo + 15);
  state.lecturas[aula.id].aforo = nuevoAforo;
  pushSerie(state, aula.id, "aforo", { aulaId: aula.id, magnitud: "aforo", valor: nuevoAforo, unidad: rango.unidad, timestamp: nowIso });

  const nuevaOcupacion = Math.max(0, Math.round(nuevoAforo));
  const delta = nuevaOcupacion - aula.ocupacionActual;
  if (delta > 0) {
    emitirEvento(state, aula.id, "ingreso", nowIso, { magnitud: "aforo", valorObservado: nuevaOcupacion, mensaje: `Ingreso registrado. Ocupacion actual: ${nuevaOcupacion}.` });
  } else if (delta < 0) {
    emitirEvento(state, aula.id, "egreso", nowIso, { magnitud: "aforo", valorObservado: nuevaOcupacion, mensaje: `Egreso registrado. Ocupacion actual: ${nuevaOcupacion}.` });
  }
  aula.ocupacionActual = nuevaOcupacion;

  evaluarSostenido(state, aula.id, "aforo_excedido", nuevaOcupacion > config.aforoMaximo, 1, nowMs);

  // Puerta: fuera de horario tiende a asegurarse; en horario permanece accesible.
  if (enHorario) {
    if (aula.puerta === "asegurada") aula.puerta = "cerrada";
    if (chance(0.03 * speedMultiplier)) {
      aula.puerta = aula.puerta === "abierta" ? "cerrada" : "abierta";
    }
  } else {
    if (aula.puerta !== "asegurada" && chance(0.15 * speedMultiplier)) {
      aula.puerta = "asegurada";
      emitirEvento(state, aula.id, "puerta_asegurada", nowIso);
    } else if (aula.puerta === "cerrada" && chance(0.02 * speedMultiplier)) {
      aula.puerta = "abierta";
    }
  }

  const umbralMin = enHorario ? config.umbrales.puertaAbiertaMinEnClaseMin : config.umbrales.puertaAbiertaMinFueraHorarioMin;
  evaluarSostenido(
    state,
    aula.id,
    "puerta_abierta",
    aula.puerta === "abierta",
    demoSecondsFromMinutes(umbralMin) / speedMultiplier,
    nowMs,
  );

  // Proximidad a ventana: solo vigilada fuera de horario o con aula vacia.
  const vigilada = !enHorario || aula.ocupacionActual === 0;
  const rangoProx = RANGO_MAGNITUD.proximidad_ventana;
  const targetProx = vigilada && chance(0.01) ? 0.5 : rangoProx.target;
  const prevProx = state.lecturas[aula.id].proximidad_ventana;
  const nuevaProx = vigilada
    ? meanRevertingStep(prevProx, targetProx, rangoProx.stdDev, rangoProx.pull, rangoProx.min, rangoProx.max)
    : rangoProx.max;
  state.lecturas[aula.id].proximidad_ventana = nuevaProx;
  if (vigilada) {
    pushSerie(state, aula.id, "proximidad_ventana", { aulaId: aula.id, magnitud: "proximidad_ventana", valor: nuevaProx, unidad: rangoProx.unidad, timestamp: nowIso });
  }
  evaluarSostenido(
    state,
    aula.id,
    "proximidad_ventana",
    vigilada && nuevaProx < 1,
    DURACION_SOSTENIDO.proximidad_ventana.demoSegundos / speedMultiplier,
    nowMs,
  );
}

function actualizarSaludNodos(state: SimulationState, aula: Aula, nowMs: number, speedMultiplier: number) {
  const nowIso = new Date(nowMs).toISOString();
  const config = state.configuraciones[aula.id];

  for (const nodo of aula.nodos) {
    // Bateria: decae lentamente; se "reemplaza" (reset) al agotarse para que la demo sea repetible.
    nodo.bateriaPct = Math.max(0, nodo.bateriaPct - 0.03 * speedMultiplier);
    if (nodo.bateriaPct <= 2) {
      nodo.bateriaPct = 95 + Math.random() * 5;
    } else if (nodo.bateriaPct < config.umbrales.bateriaBajaPct && !hayAlertaPendiente(state, aula.id, "bateria_baja")) {
      emitirEvento(state, aula.id, "bateria_baja", nowIso, { mensaje: `${nodo.nombre} reporta ${nodo.bateriaPct.toFixed(0)}% de bateria.` });
    }

    // Salud de senal (heartbeat).
    const outageSince = state.nodoSinSenalDesde[nodo.id];
    if (outageSince === undefined) {
      if (chance(0.003 * speedMultiplier)) {
        state.nodoSinSenalDesde[nodo.id] = nowMs;
      } else {
        nodo.ultimaSenal = nowIso;
        nodo.estado = "ok";
      }
    } else {
      const elapsedSec = (nowMs - outageSince) / 1000;
      if (elapsedSec >= DURACION_SOSTENIDO.nodo_sin_datos.demoSegundos / speedMultiplier && nodo.estado !== "sin_datos") {
        nodo.estado = "sin_datos";
        emitirEvento(state, aula.id, "nodo_sin_datos", nowIso, { mensaje: `${nodo.nombre} no reporta latido hace mas de 15 minutos.` });
      }
      if (chance(0.05 * speedMultiplier)) {
        delete state.nodoSinSenalDesde[nodo.id];
        nodo.ultimaSenal = nowIso;
        nodo.estado = "ok";
      }
    }
  }

  // Procesador de aula.
  const procesadorSince = state.procesadorOfflineDesde[aula.id];
  if (procesadorSince === undefined) {
    if (chance(0.0015 * speedMultiplier)) {
      state.procesadorOfflineDesde[aula.id] = nowMs;
    }
  } else {
    const elapsedSec = (nowMs - procesadorSince) / 1000;
    if (elapsedSec >= DURACION_SOSTENIDO.procesador_offline.demoSegundos / speedMultiplier) {
      emitirEvento(state, aula.id, "procesador_offline", nowIso);
    }
    if (chance(0.08 * speedMultiplier)) {
      delete state.procesadorOfflineDesde[aula.id];
    }
  }
}

function actualizarVulnerabilidades(state: SimulationState, aula: Aula, nowMs: number) {
  const nowIso = new Date(nowMs).toISOString();
  const vulnerabilidadesAula: Vulnerabilidad[] = [];

  const puertaTrabada = state.alertas.some((a) => a.aulaId === aula.id && a.codigo === "puerta_abierta" && a.estadoAcuse === "pendiente");
  if (puertaTrabada) {
    vulnerabilidadesAula.push({
      id: keyFor(aula.id, "vuln-puerta"),
      aulaId: aula.id,
      titulo: "Puerta abierta sin asegurar",
      explicacion: "La puerta lleva mas tiempo del permitido sin cerrarse o asegurarse; revisar el mecanismo o la cerradura electrica.",
      severidad: "alerta",
      detectadaEn: nowIso,
    });
  }

  const nodoCaido = aula.nodos.find((n) => n.estado === "sin_datos");
  if (nodoCaido) {
    vulnerabilidadesAula.push({
      id: keyFor(aula.id, "vuln-nodo"),
      aulaId: aula.id,
      titulo: `${nodoCaido.nombre} sin reportar datos`,
      explicacion: "El nodo dejo de enviar latido; revisar alimentacion o conectividad para no perder visibilidad del aula.",
      severidad: "alerta",
      detectadaEn: nowIso,
    });
  }

  const alertasAforoRecurrentes = state.eventos.filter(
    (e) => e.aulaId === aula.id && e.codigo === "aforo_excedido" && nowMs - Date.parse(e.timestamp) < 1000 * 60 * 30,
  ).length;
  if (alertasAforoRecurrentes >= 2) {
    vulnerabilidadesAula.push({
      id: keyFor(aula.id, "vuln-aforo"),
      aulaId: aula.id,
      titulo: "Aforo excedido de forma recurrente",
      explicacion: "El aforo maximo se ha superado varias veces recientemente; considerar revisar el limite configurado o reforzar el control de acceso.",
      severidad: "critico",
      detectadaEn: nowIso,
    });
  }

  state.vulnerabilidades = [
    ...state.vulnerabilidades.filter((v) => v.aulaId !== aula.id),
    ...vulnerabilidadesAula,
  ];
}

function recalcularEstadoAula(aula: Aula, enHorario: boolean, hayAlertaCriticaOAlerta: boolean) {
  if (hayAlertaCriticaOAlerta) {
    aula.estado = "Alerta" as EstadoAula;
    return;
  }
  if (enHorario) {
    aula.estado = "EnClase";
    return;
  }
  aula.estado = aula.puerta === "asegurada" ? "Cerrada" : "Libre";
}

/** Avanza la simulacion un tick. Muta y devuelve el mismo objeto de estado (uso interno del store). */
export function tick(state: SimulationState, nowMs: number): SimulationState {
  const speedMultiplier = state.controls.speedMultiplier;
  const now = new Date(nowMs);

  for (const aulaId of Object.keys(state.aulas) as AulaId[]) {
    const aula = state.aulas[aulaId];
    const config = state.configuraciones[aulaId];
    const enHorarioAhora = estaEnHorario(config, now);
    const horarioKey = keyFor(aulaId, "__en_horario");
    const enHorarioPrevio = state.outOfRangeSince[horarioKey];
    if (enHorarioPrevio === undefined || Boolean(enHorarioPrevio) !== enHorarioAhora) {
      emitirEvento(state, aulaId, enHorarioAhora ? "inicio_clase" : "fin_clase", now.toISOString());
      state.outOfRangeSince[horarioKey] = enHorarioAhora ? 1 : 0;
    }

    actualizarMagnitudesAmbientales(state, aulaId, config, enHorarioAhora, aula.ocupacionActual, nowMs, speedMultiplier);
    actualizarOcupacionYPuerta(state, aula, config, enHorarioAhora, nowMs, speedMultiplier);
    actualizarSaludNodos(state, aula, nowMs, speedMultiplier);
    actualizarVulnerabilidades(state, aula, nowMs);

    const hayAlertaActiva = state.alertas.some(
      (a) => a.aulaId === aulaId && a.estadoAcuse === "pendiente" && a.severidad !== "info",
    );
    recalcularEstadoAula(aula, enHorarioAhora, hayAlertaActiva);
  }

  return state;
}
