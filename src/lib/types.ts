// Core domain types. Field names follow the SysML model (SYS-09.2, SYS-10.1):
// the wire format is fixed in Spanish, so domain fields stay in Spanish too.

export type AulaCodigo = "L-419" | "A-1001";

export type Magnitud =
  | "temperatura"
  | "humedad"
  | "co2"
  | "pm25"
  | "voc"
  | "lux"
  | "ruido"
  | "presencia"
  | "ocupacion"
  | "puerta"
  | "proximidad_ventana"
  | "bateria"
  | "latido";

export type NodoId =
  | "nodoAmbiental"
  | "nodoPuerta"
  | "nodoVentana1"
  | "nodoVentana2"
  | "procesadorAula";

export type EstadoPuerta = "abierta" | "cerrada" | "asegurada";

/** SYS-09.2 measurement format. `valor` is numeric except for `puerta`. */
export interface Medicion {
  ts: string; // ISO-8601 with offset, e.g. 2026-09-03T14:05:00-05:00
  aula: AulaCodigo;
  nodo: NodoId;
  magnitud: Magnitud;
  valor: number | EstadoPuerta;
  unidad: string;
}

export type Severidad = "info" | "alerta" | "critico";

export type TipoEvento =
  // nominal (info)
  | "inicio_clase"
  | "fin_clase"
  | "ingreso"
  | "egreso"
  | "luz_encendida"
  | "luz_apagada"
  | "puerta_asegurada"
  // out of nominal
  | "temperatura_fuera_confort"
  | "hr_fuera_confort"
  | "co2_aviso"
  | "co2_alerta"
  | "pm25_alto"
  | "ruido_excesivo"
  | "iluminacion_insuficiente"
  | "aforo_excedido"
  | "puerta_abierta"
  | "proximidad_ventana"
  | "bateria_baja"
  | "nodo_sin_datos"
  | "procesador_offline";

export type EstadoAula = "Cerrada" | "Libre" | "EnClase" | "Alerta";

/** SYS-10.1 event log row (exact CSV column order). */
export interface Evento {
  ts: string;
  aula: AulaCodigo;
  id_evento: string;
  tipo: TipoEvento;
  severidad: Severidad;
  fuente: string; // node / rule / actor that originated it
  valor: string; // measured value that triggered it ("" if n/a)
  umbral: string; // threshold applied ("" if n/a)
  actor: string; // who originated / acknowledged
  estado_resultante: EstadoAula;
  /** open alerts can be acknowledged (not part of the CSV columns) */
  acuse?: { actor: string; ts: string } | null;
  cerrado?: boolean;
}

/** Editable comfort parameters (defaults in src/data/umbrales.json). */
export interface Umbrales {
  umbralTemp: number; // degC
  umbralTempHisteresis: number; // degC
  umbralTempPersistenciaMin: number; // minutes
  hrMin: number; // %
  hrMax: number; // %
  hrPersistenciaMin: number;
  umbralLux: number; // lx (with class in session)
  luxObjetivo: number; // lx
  luxPersistenciaMin: number;
  co2Aviso: number; // ppm
  co2Alerta: number; // ppm
  co2PersistenciaMin: number;
  pm25Max: number; // ug/m3
  pm25PersistenciaMin: number;
  umbralRuido: number; // dBA (LAeq 1 min)
  distVentana: number; // m
  distVentanaHisteresis: number; // m
  distVentanaPersistenciaSeg: number; // seconds
  puertaAbiertaMaxFueraHorarioMin: number;
  puertaAbiertaMaxEnClaseMin: number;
  aforoMaximo: number;
  bateriaBaja: number; // %
  latidoMin: number; // heartbeat period, minutes
  nodoSinDatosMin: number; // minutes without heartbeat -> nodo_sin_datos
  procesadorOfflineSeg: number; // seconds
}

export interface SensorSpec {
  id: string;
  nombre: string;
  modelo: string;
  magnitudes: Magnitud[];
  rango: string;
  exactitud: string;
  interfaz: string;
  alimentacion: string;
  costoAproxUSD: number;
}

export interface NodoSpec {
  id: NodoId;
  nombre: string;
  mcu: string;
  conectividad: string;
  alimentacion: string;
  sensores: string[]; // SensorSpec ids
}

export interface PosicionPlano {
  x: number; // meters from left wall
  y: number; // meters from top wall
}

export interface Aula {
  codigo: AulaCodigo;
  nombre: string;
  largo: number; // m
  ancho: number; // m
  alto: number; // m
  aforo: number;
  puertas: number;
  ventanas: number;
  aireAcondicionado: boolean;
  nodos: NodoId[];
  posiciones: Record<string, PosicionPlano>; // nodo/element id -> position
  componentes: { id: string; nombre: string; cantidad: number; pos?: PosicionPlano }[];
}

export interface BloqueHorario {
  dia: number; // 0 = Sunday ... 6 = Saturday (JS Date.getDay)
  inicio: string; // "08:00"
  fin: string; // "10:00"
  curso: string;
}

export type Horario = Record<AulaCodigo, BloqueHorario[]>;

export type Rol = "administrador" | "visualizador";

export type Escenario =
  | "clase_normal"
  | "aula_libre"
  | "aforo_excedido"
  | "puerta_trabada"
  | "co2_alto"
  | "intruso_ventana"
  | "nodo_caido";

export type Velocidad = 1 | 10 | 60;

export interface EstadoSimulacion {
  escenarios: Record<AulaCodigo, Escenario>;
  velocidad: Velocidad;
  /** wall-clock ms at which the sim clock was anchored */
  anclaRealMs: number;
  /** sim-clock ms at the anchor */
  anclaSimMs: number;
  corriendo: boolean;
}

/** Dashboard module domains (F1). */
export type ModuloId =
  | "confort"
  | "iluminacion"
  | "aire"
  | "ruido"
  | "aforo"
  | "accesos"
  | "perimetro"
  | "nodos";

export interface Anomalia {
  ts: string;
  aula: AulaCodigo;
  magnitud: Magnitud;
  valor: number;
  score: number;
  metodo: "zscore" | "salto" | "iforest";
  explicacion: string;
}
