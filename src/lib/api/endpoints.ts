// One typed function per backend endpoint (docs/BACKEND_SPRINGBOOT.md §6).
// Wire DTOs are camelCase; the rest of the app keeps the SysML-style domain
// types from src/lib/types.ts (snake_case event rows, per-aula records), so
// the translation lives here and nowhere else.

import { api, setAccessToken } from "@/lib/api/client";
import type { CuentaUsuario, Rol } from "@/lib/auth/identity";
import type {
  AulaCodigo,
  BloqueHorario,
  EstadoAula,
  EstadoPuerta,
  Evento,
  Horario,
  Magnitud,
  Medicion,
  Severidad,
  TipoEvento,
  Umbrales,
} from "@/lib/types";
import type {
  CategoriaIncidente,
  EstadoIncidente,
  PrioridadIncidente,
} from "@/lib/incidents/catalog";
import type { Ambito } from "@/lib/auth/identity";

export interface Pagina<T> {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
}

// ---------------------------------------------------------------------------
// auth

export async function login(email: string, password: string): Promise<CuentaUsuario> {
  const r = await api<{ accessToken: string; cuenta: CuentaUsuario }>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    publico: true,
  });
  setAccessToken(r.accessToken);
  return r.cuenta;
}

export async function logout(): Promise<void> {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}

export const yo = () => api<CuentaUsuario>("/api/auth/me");

export const cambiarPassword = (actual: string, nueva: string) =>
  api("/api/auth/password", { method: "POST", body: { actual, nueva } });

// ---------------------------------------------------------------------------
// usuarios (superadmin)

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  ambitos: Ambito[];
  estado: CuentaUsuario["estado"];
  creadoEn: string;
}

export const listarUsuarios = () => api<Usuario[]>("/api/usuarios");

export const crearUsuario = (body: {
  email: string;
  nombre: string;
  rol: Rol;
  /** required (at least one) for admin_operativo, ignored otherwise */
  ambitos?: Ambito[];
}) =>
  api<{ email: string; password: string }>("/api/usuarios", { method: "POST", body });

export const suspenderUsuario = (id: number) =>
  api<Usuario>(`/api/usuarios/${id}/suspender`, { method: "POST" });

export const reactivarUsuario = (id: number) =>
  api<Usuario>(`/api/usuarios/${id}/reactivar`, { method: "POST" });

export const restablecerPassword = (id: number) =>
  api<{ email: string; password: string }>(`/api/usuarios/${id}/restablecer-password`, {
    method: "POST",
  });

export const cambiarRol = (id: number, rol: Rol, ambitos: Ambito[] = []) =>
  api<Usuario>(`/api/usuarios/${id}/rol`, { method: "PUT", body: { rol, ambitos } });

// ---------------------------------------------------------------------------
// aulas: estado, lecturas, serie

type Valores = Partial<Record<Magnitud, number | EstadoPuerta>>;

export interface EstadoAulaVivo {
  aula: AulaCodigo;
  estado: EstadoAula;
  /** Server clock at the moment of the reading (the app's "now"). */
  tsMs: number;
  valores: Valores;
  /** Timestamp of the newest reading of any node; 0 if the room never reported. */
  ultimaLecturaMs: number;
}

/** Magnitudes reported by several nodes of one classroom, where the worst case is the minimum. */
const PEOR_CASO_MINIMO: readonly Magnitud[] = ["bateria", "proximidad_ventana"];

/**
 * Collapses the per-node readings into one value per magnitude. Battery and
 * window proximity come from several nodes, so the lowest one is kept (it is
 * the one that can trip a threshold); anything else keeps the newest reading.
 */
export function valoresDeLecturas(lecturas: Medicion[]): Valores {
  const v: Valores = {};
  const ts: Partial<Record<Magnitud, string>> = {};
  for (const m of lecturas) {
    const actual = v[m.magnitud];
    const reemplaza =
      actual === undefined ||
      (PEOR_CASO_MINIMO.includes(m.magnitud) &&
        typeof actual === "number" &&
        typeof m.valor === "number"
        ? m.valor < actual
        : m.ts > (ts[m.magnitud] ?? ""));
    if (reemplaza) {
      v[m.magnitud] = m.valor;
      ts[m.magnitud] = m.ts;
    }
  }
  return v;
}

export async function estadoAula(codigo: AulaCodigo): Promise<EstadoAulaVivo> {
  const r = await api<{
    aula: AulaCodigo;
    estado: EstadoAula;
    ts: string;
    ultimaLectura?: Medicion[];
  }>(`/api/aulas/${encodeURIComponent(codigo)}/estado`);
  return {
    aula: r.aula,
    estado: r.estado,
    tsMs: new Date(r.ts).getTime(),
    valores: valoresDeLecturas(r.ultimaLectura ?? []),
    ultimaLecturaMs: Math.max(0, ...(r.ultimaLectura ?? []).map((m) => new Date(m.ts).getTime())),
  };
}

export interface PuntoSerieApi {
  ts: string;
  /** epoch ms of `ts`, precomputed for the charts */
  t: number;
  valor: number;
}

export async function serieAula(
  codigo: AulaCodigo,
  magnitud: Magnitud,
  desde: Date,
  hasta: Date,
  pasoMs: number,
): Promise<PuntoSerieApi[]> {
  const r = await api<{ puntos?: { ts: string; valor: number }[] }>(
    `/api/aulas/${encodeURIComponent(codigo)}/serie`,
    {
      query: {
        magnitud,
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        pasoMs,
      },
    },
  );
  return (r.puntos ?? []).map((p) => ({ ts: p.ts, t: new Date(p.ts).getTime(), valor: p.valor }));
}

// ---------------------------------------------------------------------------
// horario y umbrales

export async function obtenerHorario(codigos: readonly AulaCodigo[]): Promise<Horario> {
  const r = await api<Record<string, { dia: number; inicio: string; fin: string; curso: string }[]>>(
    "/api/horario",
  );
  const horario = {} as Horario;
  for (const a of codigos) {
    horario[a] = (r[a] ?? []).map<BloqueHorario>((b) => ({
      dia: b.dia,
      inicio: b.inicio.slice(0, 5), // backend may send HH:mm:ss
      fin: b.fin.slice(0, 5),
      curso: b.curso,
    }));
  }
  return horario;
}

export const guardarHorarioAula = (aula: AulaCodigo, bloques: BloqueHorario[]) =>
  api("/api/horario", { method: "PUT", body: { aula, bloques } });

export const obtenerUmbrales = () => api<Umbrales>("/api/umbrales");

export const guardarUmbrales = (u: Umbrales) =>
  api<Umbrales>("/api/umbrales", { method: "PUT", body: u });

// ---------------------------------------------------------------------------
// eventos

interface EventoWire {
  ts: string;
  aula: AulaCodigo;
  idEvento: string;
  tipo: TipoEvento;
  severidad: Severidad;
  fuente?: string;
  valor?: string;
  umbral?: string;
  actor?: string;
  estadoResultante: EstadoAula;
  acuse?: { actor: string; ts: string } | null;
  cerrado: boolean;
}

export function eventoDeWire(e: EventoWire): Evento {
  return {
    ts: e.ts,
    aula: e.aula,
    id_evento: e.idEvento,
    tipo: e.tipo,
    severidad: e.severidad,
    fuente: e.fuente ?? "",
    valor: e.valor ?? "",
    umbral: e.umbral ?? "",
    actor: e.actor ?? "",
    estado_resultante: e.estadoResultante,
    acuse: e.acuse ?? null,
    cerrado: e.cerrado,
  };
}

export interface FiltroEventos {
  aula?: AulaCodigo;
  desde?: Date;
  hasta?: Date;
  severidad?: Severidad;
  abierto?: boolean;
  page?: number;
  size?: number;
}

export async function listarEventos(f: FiltroEventos = {}): Promise<Pagina<Evento>> {
  const r = await api<Pagina<EventoWire>>("/api/eventos", {
    query: {
      aula: f.aula,
      desde: f.desde?.toISOString(),
      hasta: f.hasta?.toISOString(),
      severidad: f.severidad,
      abierto: f.abierto,
      page: f.page,
      size: f.size,
    },
  });
  return { ...r, content: r.content.map(eventoDeWire) };
}

export async function acusarEvento(idEvento: string): Promise<Evento> {
  return eventoDeWire(
    await api<EventoWire>(`/api/eventos/${encodeURIComponent(idEvento)}/acuse`, {
      method: "POST",
    }),
  );
}

// ---------------------------------------------------------------------------
// incidentes y notificaciones

export interface Incidente {
  id: number;
  categoria: CategoriaIncidente;
  prioridad: PrioridadIncidente;
  ubicacion: string;
  descripcion: string;
  reportadoPor: number;
  estado: EstadoIncidente;
  creadoEn: string;
  atendidoPor?: number;
  atendidoEn?: string;
  resueltoEn?: string;
  /** Only present in the operational list (staff), never in a member's own reports. */
  reportadoPorEmail?: string;
}

export const crearIncidente = (body: {
  categoria: CategoriaIncidente;
  ubicacion: string;
  descripcion: string;
}) => api<Incidente>("/api/incidentes", { method: "POST", body });

export const listarIncidentes = (q: {
  propios?: boolean;
  estado?: EstadoIncidente;
  ambito?: Ambito;
  page?: number;
  size?: number;
}) => api<Pagina<Incidente>>("/api/incidentes", { query: q });

export const atenderIncidente = (id: number) =>
  api<Incidente>(`/api/incidentes/${id}/atender`, { method: "POST" });

export const resolverIncidente = (id: number, estado: "resuelto" | "descartado") =>
  api<Incidente>(`/api/incidentes/${id}/resolver`, { method: "POST", body: { estado } });

// ---------------------------------------------------------------------------
// dispositivos (nodos MQTT)

export interface Dispositivo {
  id: number;
  aula: AulaCodigo;
  nodo: string;
  mqttUsername: string;
  activo: boolean;
  ultimoLatidoEn?: string;
}

/** Returned once by register/rotate: the password is never retrievable again. */
export interface CredencialDispositivo {
  id: number;
  aula: AulaCodigo;
  nodo: string;
  mqttUsername: string;
  mqttPassword: string;
}

export const listarDispositivos = () => api<Dispositivo[]>("/api/dispositivos");

export const registrarDispositivo = (body: { aula: AulaCodigo; nodo: string }) =>
  api<CredencialDispositivo>("/api/dispositivos", { method: "POST", body });

export const rotarCredencial = (id: number) =>
  api<CredencialDispositivo>(`/api/dispositivos/${id}/rotar-credencial`, { method: "POST" });

export const actualizarDispositivo = (id: number, activo: boolean) =>
  api<Dispositivo>(`/api/dispositivos/${id}`, { method: "PUT", body: { activo } });

// ---------------------------------------------------------------------------
// push

export const registrarPush = (sub: PushSubscriptionJSON) =>
  api<{ id: number }>("/api/push/subscripciones", {
    method: "POST",
    body: { endpoint: sub.endpoint, keys: sub.keys },
  });

export const eliminarPush = (id: number) =>
  api(`/api/push/subscripciones/${id}`, { method: "DELETE" });

export const enviarPush = (body: {
  usuarioId?: number;
  titulo: string;
  cuerpo: string;
  path?: string;
}) => api<{ enviados: number }>("/api/push/enviar", { method: "POST", body });

// ---------------------------------------------------------------------------
// contrato

export const enumsDelBackend = () =>
  api<Record<string, string[]>>("/api/meta/enums", { publico: true });
