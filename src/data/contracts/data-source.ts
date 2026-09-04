import type { Severidad, TipoEvento } from "@/domain/enums";
import type {
  Alerta,
  AulaId,
  Aula,
  ConfiguracionAula,
  Evento,
  Lectura,
  Vulnerabilidad,
} from "@/domain/types";

export interface EventoFiltro {
  aulaId?: AulaId;
  desde?: string; // ISO timestamp
  hasta?: string; // ISO timestamp
  actor?: string;
  severidad?: Severidad;
  tipo?: TipoEvento;
}

export interface AlertaFiltro {
  aulaId?: AulaId;
  estadoAcuse?: Alerta["estadoAcuse"];
}

export interface ImportPlanoResultado {
  ok: boolean;
  sensoresDetectados?: number;
  mensaje: string;
}

/**
 * Contrato único que consume toda la UI para leer/escribir datos del sistema.
 * Hoy lo implementa `mock-data-source.ts` contra el motor de simulación local;
 * el día que exista un backend real, se implementa esta misma interfaz contra
 * HTTP/WebSocket (p.ej. `http-data-source.ts`) y solo cambia `src/data/index.ts`.
 */
export interface DataSource {
  listAulas(): Promise<Aula[]>;
  getAula(id: AulaId): Promise<Aula | null>;

  /** Se invoca `cb` con cada nueva lectura del aula. Devuelve función para desuscribirse. */
  subscribeLecturas(aulaId: AulaId, cb: (l: Lectura) => void): () => void;
  getSerieHistorica(aulaId: AulaId, magnitud: Lectura["magnitud"]): Promise<Lectura[]>;

  listAlertas(filtro?: AlertaFiltro): Promise<Alerta[]>;
  ackAlerta(id: string, atendidaPor: string): Promise<void>;
  /** Se invoca `cb` con cada alerta nueva generada por el motor de simulación. */
  subscribeAlertas(cb: (a: Alerta) => void): () => void;

  listEventos(filtro: EventoFiltro): Promise<Evento[]>;

  listVulnerabilidades(aulaId?: AulaId): Promise<Vulnerabilidad[]>;

  getConfiguracion(aulaId: AulaId): Promise<ConfiguracionAula>;
  updateConfiguracion(aulaId: AulaId, patch: Partial<ConfiguracionAula>): Promise<ConfiguracionAula>;
  importPlano(aulaId: AulaId, file: File): Promise<ImportPlanoResultado>;
}
