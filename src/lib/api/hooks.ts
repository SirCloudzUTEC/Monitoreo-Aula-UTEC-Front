"use client";

// react-query hooks over the backend (docs/MIGRACION_FRONTEND_BACKEND.md §3).
// They replace the old client-side simulation loop: polling with caching and
// revalidation instead of a hand-rolled tick. Every read is gated on a signed-in
// account holding the permission it needs (pending/suspended accounts get 403s).

import { useMemo } from "react";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  acusarEvento,
  estadoAula,
  guardarHorarioAula,
  guardarUmbrales,
  listarDispositivos,
  listarEventos,
  listarIncidentes,
  listarUsuarios,
  logout,
  obtenerHorario,
  obtenerUmbrales,
  type EstadoAulaVivo,
  type FiltroEventos,
  type Pagina,
} from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
import { liberarPushAlSalir } from "@/lib/notify/push-client";
import { CODIGOS_AULA, porAula } from "@/lib/aulas";
import { puede, type Permiso } from "@/lib/auth/identity";
import { ORDEN_MODULOS, semaforoModulo, type Semaforo } from "@/lib/modules";
import { claseEnCurso } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import type { AulaCodigo, EstadoAula, Evento, Horario, ModuloId, Severidad, Umbrales, Valores } from "@/lib/types";
import umbralesSeed from "@/data/umbrales.json";

/**
 * Same cadence as the sensors (SYS latency budget: telemetry every 5 s). NEXT_PUBLIC_INTERVALO_ESTADO_MS
 * lowers it for local testing against a fast-reporting node (never below 1 s).
 */
const INTERVALO_ESTADO_MS = Math.max(1_000, Number(process.env.NEXT_PUBLIC_INTERVALO_ESTADO_MS) || 5_000);
/** Alert list: less latency-sensitive than live readings. */
const INTERVALO_EVENTOS_MS = 15_000;
/** Critical alerts are the ones an admin must not learn about late: poll them as fast as readings. */
const INTERVALO_CRITICOS_MS = INTERVALO_ESTADO_MS;
const INTERVALO_LOG_MS = 30_000;

export function useHabilitado(permiso: Permiso = "ver_datos_autorizados"): boolean {
  const cuenta = useApp((s) => s.cuenta);
  return cuenta !== null && puede(cuenta, permiso);
}

/** `useQuery` that only runs for an account holding `permiso`. */
function useQueryHabilitada<T, R = T>(
  permiso: Permiso,
  opciones: Omit<UseQueryOptions<T, Error, R, QueryKey>, "enabled">,
) {
  return useQuery({ ...opciones, enabled: useHabilitado(permiso) });
}

// ---------------------------------------------------------------------------
// live state

/**
 * `/estado` returns the newest reading ever stored, however old. Past this age without any new
 * reading the room is not really being monitored (nodes publish every ~5 s), so the UI says so
 * instead of presenting stale numbers as live.
 */
export const LECTURA_OBSOLETA_MS = 5 * 60_000;

interface EstadosVivos {
  estados: Record<AulaCodigo, EstadoAula>;
  valores: Record<AulaCodigo, Valores>;
  /** Age (ms, against the server clock) of each room's newest reading; null before the first response. */
  antiguedadMs: Record<AulaCodigo, number | null>;
  /** Backend clock (ms) at the last reading; 0 until the first response. */
  nowMs: number;
  listo: boolean;
}

function combinarEstados(results: { data?: EstadoAulaVivo }[]): EstadosVivos {
  const r = porAula((a) => results.find((x) => x.data?.aula === a)?.data);
  return {
    estados: porAula((a) => r[a]?.estado ?? "Cerrada"),
    valores: porAula((a) => r[a]?.valores ?? {}),
    antiguedadMs: porAula((a) => {
      const d = r[a];
      if (!d) return null;
      return d.ultimaLecturaMs > 0 ? Math.max(0, d.tsMs - d.ultimaLecturaMs) : Number.POSITIVE_INFINITY;
    }),
    nowMs: Math.max(0, ...results.map((x) => x.data?.tsMs ?? 0)),
    listo: results.every((x) => x.data),
  };
}

/** State + latest readings of every classroom, refreshed every 5 s. */
export function useEstados(): EstadosVivos {
  const habilitado = useHabilitado();
  return useQueries({
    queries: CODIGOS_AULA.map((codigo) => ({
      queryKey: ["estado", codigo],
      queryFn: () => estadoAula(codigo),
      enabled: habilitado,
      refetchInterval: INTERVALO_ESTADO_MS,
    })),
    combine: combinarEstados,
  });
}

export interface Semaforos {
  /** whether each classroom has a class in session right now (backend clock) */
  enClase: Record<AulaCodigo, boolean>;
  semaforos: Record<AulaCodigo, Record<ModuloId, Semaforo>>;
}

/** Traffic light of every module in every classroom, computed once per data change. */
export function useSemaforos(): Semaforos {
  const { valores, nowMs } = useEstados();
  const { abiertos } = useEventosAbiertos();
  const { umbrales } = useUmbrales();
  const { horario } = useHorario();
  return useMemo(() => {
    const fecha = new Date(nowMs); // 0 before init: values are empty then anyway
    const enClase = porAula((a) => claseEnCurso(horario, a, fecha));
    const semaforos = porAula(
      (a) =>
        Object.fromEntries(
          ORDEN_MODULOS.map((m) => [m, semaforoModulo(m, valores[a], umbrales, abiertos, a, enClase[a])]),
        ) as Record<ModuloId, Semaforo>,
    );
    return { enClase, semaforos };
  }, [valores, nowMs, abiertos, umbrales, horario]);
}

// ---------------------------------------------------------------------------
// events

type ResultadoPagina = { data?: Pagina<Evento>; isError: boolean; refetch: () => unknown };
const SEVERIDADES_ALERTA = ["critico", "alerta"] as const satisfies readonly Severidad[];

/**
 * Open alerts (severity alerta/critico). `info` rows (ingreso, inicio_clase…)
 * are never "open" in the UI, so they are not requested at all.
 */
function combinarAbiertos(results: ResultadoPagina[]) {
  return {
    abiertos: results.flatMap((r) => r.data?.content ?? []).filter((e) => !e.cerrado),
    listo: results.every((r) => r.data),
    /** a request failed and has no data yet: "no alerts" must not be claimed */
    error: results.some((r) => r.isError && !r.data),
    reintentar: () => results.forEach((r) => void r.refetch()),
  };
}

function combinarCerrados(results: ResultadoPagina[]): Evento[] {
  return results.flatMap((r) => r.data?.content ?? []).sort((a, b) => b.ts.localeCompare(a.ts));
}

/** One request per alert severity, merged by `combine`. */
function useAlertasPorSeveridad<R>(
  abierto: boolean,
  size: number,
  intervalo: (s: Severidad) => number,
  combine: (results: ResultadoPagina[]) => R,
): R {
  const habilitado = useHabilitado();
  return useQueries({
    queries: SEVERIDADES_ALERTA.map((severidad) => ({
      queryKey: ["eventos", abierto ? "abiertos" : "cerrados", severidad],
      queryFn: () => listarEventos({ abierto, severidad, size }),
      enabled: habilitado,
      refetchInterval: intervalo(severidad),
    })),
    combine,
  });
}

const intervaloAbiertos = (s: Severidad) => (s === "critico" ? INTERVALO_CRITICOS_MS : INTERVALO_EVENTOS_MS);
const intervaloLog = () => INTERVALO_LOG_MS;

export const useEventosAbiertos = () => useAlertasPorSeveridad(true, 200, intervaloAbiertos, combinarAbiertos);

/** Closed alerts (history tab of /alertas). */
export const useEventosCerrados = () => useAlertasPorSeveridad(false, 100, intervaloLog, combinarCerrados);

/** One server-side page of the event log (aula / severity / range filters). */
export function useEventosPagina(filtro: FiltroEventos) {
  return useQueryHabilitada("ver_datos_autorizados", {
    queryKey: [
      "eventos",
      "pagina",
      filtro.aula,
      filtro.severidad,
      filtro.desde?.getTime(),
      filtro.hasta?.getTime(),
      filtro.page,
      filtro.size,
    ],
    queryFn: () => listarEventos(filtro),
    placeholderData: keepPreviousData,
    refetchInterval: INTERVALO_LOG_MS,
  });
}

/** Most recent 200 events of the range (the backend page cap), used to build the actor footprint. */
export function useEventosVentana(desde?: Date, hasta?: Date) {
  return useQueryHabilitada("ver_datos_autorizados", {
    queryKey: ["eventos", "ventana", desde?.getTime(), hasta?.getTime()],
    queryFn: () => listarEventos({ desde, hasta, size: 200 }), // backend max page size
    placeholderData: keepPreviousData,
  });
}

/** Acknowledge an event on the server; refreshes the alert lists and states. */
export function useAcusar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idEvento: string) => acusarEvento(idEvento),
    onSuccess: (ev) => {
      toast.success(`Acuse registrado (${ev.tipo})`);
      void qc.invalidateQueries({ queryKey: ["eventos"] });
      void qc.invalidateQueries({ queryKey: ["estado"] });
    },
    onError: (e) => toast.error(mensajeDeError(e, "No se pudo registrar el acuse.")),
  });
}

// ---------------------------------------------------------------------------
// admin lists. The dashboard "Salud operativa" reuses the same cache keys as
// the full pages, so a mutation there refreshes the dashboard too.

/** Incidents waiting for someone to take them (`abierto`); needs `atender_incidentes`. */
export const useIncidentesSinAtender = () =>
  useQueryHabilitada("atender_incidentes", {
    queryKey: ["incidentes", "resumen", "abierto"],
    queryFn: () => listarIncidentes({ estado: "abierto", size: 1 }),
    refetchInterval: INTERVALO_LOG_MS,
    select: (p) => p.totalElements,
  });

/** One page of incident reports: the operational list, or only the account's own. */
export const useIncidentes = (verTodos: boolean, page: number, size: number) =>
  useQueryHabilitada("reportar_incidente", {
    queryKey: ["incidentes", verTodos, page],
    queryFn: () => listarIncidentes({ propios: !verTodos, page, size }),
    refetchInterval: INTERVALO_LOG_MS,
    // paging keeps the current list on screen until the next page arrives
    placeholderData: keepPreviousData,
  });

/** Registered MQTT nodes; needs `gestionar_dispositivos`. */
export const useDispositivos = () =>
  useQueryHabilitada("gestionar_dispositivos", {
    queryKey: ["dispositivos"],
    queryFn: listarDispositivos,
    refetchInterval: INTERVALO_LOG_MS,
  });

export const useUsuarios = () =>
  useQueryHabilitada("gestionar_usuarios", { queryKey: ["usuarios"], queryFn: listarUsuarios });

/**
 * Admin action: toasts the backend's reason on failure and, on success, shows `ok` (if any) and
 * refreshes the `invalidar` list.
 */
export function useMutacionAdmin<V, R>({
  fn,
  invalidar,
  ok,
  alTerminar,
  error = "No se pudo completar la acción.",
}: {
  fn: (v: V) => Promise<R>;
  invalidar: string;
  ok?: string | ((r: R) => string);
  alTerminar?: (r: R) => void;
  error?: string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      if (ok) toast.success(typeof ok === "function" ? ok(r) : ok);
      alTerminar?.(r);
      void qc.invalidateQueries({ queryKey: [invalidar] });
    },
    onError: (e) => toast.error(mensajeDeError(e, error)),
  });
}

// ---------------------------------------------------------------------------
// settings

/** Server config with a local fallback until it loads. */
function useConfig<T>(key: string, queryFn: () => Promise<T>, fallback: T): { data: T; listo: boolean } {
  const q = useQueryHabilitada("ver_datos_autorizados", { queryKey: [key], queryFn, staleTime: 60_000 });
  return { data: q.data ?? fallback, listo: q.isSuccess };
}

const HORARIO_VACIO = porAula(() => []) as Horario;
const cargarHorario = () => obtenerHorario(CODIGOS_AULA);

export function useUmbrales(): { umbrales: Umbrales; listo: boolean } {
  const { data, listo } = useConfig("umbrales", obtenerUmbrales, umbralesSeed as Umbrales);
  return { umbrales: data, listo };
}

export function useHorario(): { horario: Horario; listo: boolean } {
  const { data, listo } = useConfig("horario", cargarHorario, HORARIO_VACIO);
  return { horario: data, listo };
}

export function useGuardarUmbrales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (u: Umbrales) => guardarUmbrales(u),
    onSuccess: (u) => qc.setQueryData(["umbrales"], u),
  });
}

export function useGuardarHorario() {
  const qc = useQueryClient();
  return useMutation({
    // The backend replaces the whole block set of ONE classroom per call, so only the classrooms
    // that actually changed are sent; if some fail, the error names which ones.
    mutationFn: async ({ nuevo, actual }: { nuevo: Horario; actual: Horario }) => {
      const cambiadas = CODIGOS_AULA.filter((a) => JSON.stringify(nuevo[a]) !== JSON.stringify(actual[a]));
      const resultados = await Promise.allSettled(cambiadas.map((a) => guardarHorarioAula(a, nuevo[a])));
      const fallidas = cambiadas.filter((_, i) => resultados[i].status === "rejected");
      // whatever was accepted is already live: refresh from the server either way
      await qc.invalidateQueries({ queryKey: ["horario"] });
      if (fallidas.length > 0) {
        const primero = resultados.find((r) => r.status === "rejected") as PromiseRejectedResult;
        throw new Error(
          `No se guardó el horario de ${fallidas.join(", ")}: ${mensajeDeError(primero.reason, "error del servidor")}`,
        );
      }
    },
  });
}

// ---------------------------------------------------------------------------
// session

/** Ends the session on the server, drops every cached query and returns to /acceso. */
export function useCerrarSesion() {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    // needs the token, so it goes first
    await liberarPushAlSalir();
    try {
      await logout();
    } catch {
      // the token is already cleared locally; a failed revoke must not trap the user
    }
    useApp.getState().setCuenta(null);
    qc.clear();
    router.replace("/acceso");
  };
}
