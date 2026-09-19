"use client";

// react-query hooks over the backend (docs/MIGRACION_FRONTEND_BACKEND.md §3).
// They replace the old client-side simulation loop: polling with caching and
// revalidation instead of a hand-rolled tick. Every read is gated on a signed-in
// account holding `ver_datos_autorizados` (pending/suspended accounts get 403s).

import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
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
  logout,
  obtenerHorario,
  obtenerUmbrales,
  type EstadoAulaVivo,
  type FiltroEventos,
} from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
import { liberarPushAlSalir } from "@/lib/notify/push-client";
import { CODIGOS_AULA } from "@/lib/aulas";
import { puede, type Permiso } from "@/lib/auth/identity";
import { useApp } from "@/lib/store";
import type {
  AulaCodigo,
  EstadoAula,
  EstadoPuerta,
  Evento,
  Horario,
  Magnitud,
  Umbrales,
} from "@/lib/types";
import umbralesSeed from "@/data/umbrales.json";

/** Same cadence as the sensors (SYS latency budget: telemetry every 5 s). */
export const INTERVALO_ESTADO_MS = 5_000;
/** Alert list: less latency-sensitive than live readings. */
export const INTERVALO_EVENTOS_MS = 15_000;
/** Critical alerts are the ones an admin must not learn about late: poll them as fast as readings. */
export const INTERVALO_CRITICOS_MS = INTERVALO_ESTADO_MS;
const INTERVALO_LOG_MS = 30_000;

type Valores = Partial<Record<Magnitud, number | EstadoPuerta>>;

export function useHabilitado(permiso: Permiso = "ver_datos_autorizados"): boolean {
  const cuenta = useApp((s) => s.cuenta);
  return cuenta !== null && puede(cuenta, permiso);
}

// ---------------------------------------------------------------------------
// live state

const ESTADOS_VACIOS = Object.fromEntries(
  CODIGOS_AULA.map((a) => [a, "Cerrada" as EstadoAula]),
) as Record<AulaCodigo, EstadoAula>;
const VALORES_VACIOS = Object.fromEntries(
  CODIGOS_AULA.map((a) => [a, {} as Valores]),
) as Record<AulaCodigo, Valores>;

/**
 * `/estado` returns the newest reading ever stored, however old. Past this age without any new
 * reading the room is not really being monitored (nodes publish every ~5 s), so the UI says so
 * instead of presenting stale numbers as live.
 */
export const LECTURA_OBSOLETA_MS = 5 * 60_000;

export interface EstadosVivos {
  estados: Record<AulaCodigo, EstadoAula>;
  valores: Record<AulaCodigo, Valores>;
  /** Age (ms, against the server clock) of each room's newest reading; null before the first response. */
  antiguedadMs: Record<AulaCodigo, number | null>;
  /** Backend clock (ms) at the last reading; 0 until the first response. */
  nowMs: number;
  listo: boolean;
}

function combinarEstados(results: { data?: EstadoAulaVivo }[]): EstadosVivos {
  const estados = { ...ESTADOS_VACIOS };
  const valores = { ...VALORES_VACIOS };
  const antiguedadMs = Object.fromEntries(CODIGOS_AULA.map((a) => [a, null])) as Record<
    AulaCodigo,
    number | null
  >;
  let nowMs = 0;
  for (const r of results) {
    if (!r.data) continue;
    estados[r.data.aula] = r.data.estado;
    valores[r.data.aula] = r.data.valores;
    antiguedadMs[r.data.aula] =
      r.data.ultimaLecturaMs > 0 ? Math.max(0, r.data.tsMs - r.data.ultimaLecturaMs) : Number.POSITIVE_INFINITY;
    nowMs = Math.max(nowMs, r.data.tsMs);
  }
  return { estados, valores, antiguedadMs, nowMs, listo: results.every((r) => r.data) };
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

// ---------------------------------------------------------------------------
// events

/**
 * Open alerts (severity alerta/critico). `info` rows (ingreso, inicio_clase…)
 * are never "open" in the UI, so they are not requested at all.
 */
function combinarAbiertos(
  results: { data?: { content: Evento[] }; isError: boolean; refetch: () => unknown }[],
) {
  return {
    abiertos: results.flatMap((r) => r.data?.content ?? []).filter((e) => !e.cerrado),
    listo: results.every((r) => r.data),
    /** a request failed and has no data yet: "no alerts" must not be claimed */
    error: results.some((r) => r.isError && !r.data),
    reintentar: () => results.forEach((r) => void r.refetch()),
  };
}

export function useEventosAbiertos() {
  const habilitado = useHabilitado();
  return useQueries({
    queries: (["critico", "alerta"] as const).map((severidad) => ({
      queryKey: ["eventos", "abiertos", severidad],
      queryFn: () => listarEventos({ abierto: true, severidad, size: 200 }),
      enabled: habilitado,
      refetchInterval: severidad === "critico" ? INTERVALO_CRITICOS_MS : INTERVALO_EVENTOS_MS,
    })),
    combine: combinarAbiertos,
  });
}

/** Closed alerts (history tab of /alertas). */
export function useEventosCerrados() {
  const habilitado = useHabilitado();
  return useQueries({
    queries: (["critico", "alerta"] as const).map((severidad) => ({
      queryKey: ["eventos", "cerrados", severidad],
      queryFn: () => listarEventos({ abierto: false, severidad, size: 100 }),
      enabled: habilitado,
      refetchInterval: INTERVALO_LOG_MS,
    })),
    combine: (results) =>
      results
        .flatMap((r) => r.data?.content ?? [])
        .sort((a, b) => b.ts.localeCompare(a.ts)),
  });
}

/** One server-side page of the event log (aula / severity / range filters). */
export function useEventosPagina(filtro: FiltroEventos) {
  const habilitado = useHabilitado();
  return useQuery({
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
    enabled: habilitado,
    placeholderData: keepPreviousData,
    refetchInterval: INTERVALO_LOG_MS,
  });
}

/** Most recent 200 events of the range (the backend page cap), used to build the actor footprint. */
export function useEventosVentana(desde?: Date, hasta?: Date) {
  const habilitado = useHabilitado();
  return useQuery({
    queryKey: ["eventos", "ventana", desde?.getTime(), hasta?.getTime()],
    queryFn: () => listarEventos({ desde, hasta, size: 200 }), // backend max page size
    enabled: habilitado,
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
// admin summary (dashboard "Salud operativa"): counts only, so the same cache keys as the full
// pages are reused where possible and a mutation there refreshes the dashboard too.

/** Incidents waiting for someone to take them (`abierto`); needs `atender_incidentes`. */
export function useIncidentesSinAtender() {
  const habilitado = useHabilitado("atender_incidentes");
  return useQuery({
    queryKey: ["incidentes", "resumen", "abierto"],
    queryFn: () => listarIncidentes({ estado: "abierto", size: 1 }),
    enabled: habilitado,
    refetchInterval: INTERVALO_LOG_MS,
    select: (p) => p.totalElements,
  });
}

/** Registered MQTT nodes (same cache as /dispositivos); needs `gestionar_dispositivos`. */
export function useDispositivos() {
  const habilitado = useHabilitado("gestionar_dispositivos");
  return useQuery({
    queryKey: ["dispositivos"],
    queryFn: listarDispositivos,
    enabled: habilitado,
    refetchInterval: INTERVALO_LOG_MS,
  });
}

// ---------------------------------------------------------------------------
// settings

const HORARIO_VACIO = Object.fromEntries(
  CODIGOS_AULA.map((a) => [a, []]),
) as unknown as Horario;

export function useUmbrales(): { umbrales: Umbrales; listo: boolean } {
  const habilitado = useHabilitado();
  const q = useQuery({
    queryKey: ["umbrales"],
    queryFn: obtenerUmbrales,
    enabled: habilitado,
    staleTime: 60_000,
  });
  return { umbrales: q.data ?? (umbralesSeed as Umbrales), listo: q.isSuccess };
}

export function useHorario(): { horario: Horario; listo: boolean } {
  const habilitado = useHabilitado();
  const q = useQuery({
    queryKey: ["horario"],
    queryFn: () => obtenerHorario(CODIGOS_AULA),
    enabled: habilitado,
    staleTime: 60_000,
  });
  return { horario: q.data ?? HORARIO_VACIO, listo: q.isSuccess };
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
