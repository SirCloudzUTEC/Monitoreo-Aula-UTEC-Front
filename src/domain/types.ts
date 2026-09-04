import type {
  CodigoEvento,
  EstadoAcuse,
  EstadoAula,
  EstadoNodo,
  EstadoPuerta,
  Magnitud,
  Severidad,
  TipoEvento,
} from "@/domain/enums";

export type AulaId = "L-419" | "A-1001";

export interface Nodo {
  id: string;
  aulaId: AulaId;
  nombre: string;
  tipo: "ambiental" | "puerta" | "ventana";
  bateriaPct: number;
  ultimaSenal: string; // ISO timestamp
  estado: EstadoNodo;
}

export interface Lectura {
  aulaId: AulaId;
  magnitud: Magnitud;
  valor: number;
  unidad: string;
  timestamp: string; // ISO timestamp
}

export interface EventoActor {
  tipo: "docente" | "estudiante" | "sistema" | "operador";
  nombre: string;
}

export interface Evento {
  id: string;
  aulaId: AulaId;
  codigo: CodigoEvento;
  tipo: TipoEvento;
  severidad: Severidad;
  timestamp: string; // ISO timestamp
  actor: EventoActor;
  magnitud?: Magnitud;
  valorObservado?: number;
  mensaje: string;
}

export interface Alerta {
  id: string;
  aulaId: AulaId;
  eventoId: string;
  codigo: CodigoEvento;
  severidad: Severidad;
  timestamp: string; // ISO timestamp
  mensaje: string;
  estadoAcuse: EstadoAcuse;
  atendidaPor?: string;
  atendidaEn?: string; // ISO timestamp
}

export interface Umbrales {
  temperaturaConfortMin: number;
  temperaturaConfortMax: number;
  hrConfortMin: number;
  hrConfortMax: number;
  co2AvisoPpm: number;
  co2AlertaPpm: number;
  pm25AlertaUgM3: number;
  ruidoAlertaDba: number;
  iluminanciaMinLux: number;
  puertaAbiertaMinFueraHorarioMin: number;
  puertaAbiertaMinEnClaseMin: number;
  bateriaBajaPct: number;
}

export interface BloqueHorario {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo ... 6 = sábado
  inicio: string; // "HH:mm"
  fin: string; // "HH:mm"
}

export interface PlanoImportado {
  nombreArchivo: string;
  tipo: "dxf" | "csv";
  importadoEn: string; // ISO timestamp
  sensoresDetectados?: number;
}

export interface ConfiguracionAula {
  aulaId: AulaId;
  aforoMaximo: number;
  umbrales: Umbrales;
  horario: BloqueHorario[];
  planoImportado?: PlanoImportado;
}

export interface Aula {
  id: AulaId;
  nombre: string;
  edificio: string;
  piso: string;
  estado: EstadoAula;
  puerta: EstadoPuerta;
  ocupacionActual: number;
  nodos: Nodo[];
}

export interface Vulnerabilidad {
  id: string;
  aulaId: AulaId;
  titulo: string;
  explicacion: string;
  severidad: Severidad;
  detectadaEn: string; // ISO timestamp
}
