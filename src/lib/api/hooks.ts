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
  listarEventos,
  logout,
  obtenerHorario,
  obtenerUmbrales,
  type EstadoAulaVivo,
  type FiltroEventos,
} from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
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

export interface EstadosVivos {
  estados: Record<AulaCodigo, EstadoAula>;
  valores: Record<AulaCodigo, Valores>;
  /** Backend clock (ms) at the last reading; 0 until the first response. */
  nowMs: number;
  listo: boolean;
}

function combinarEstados(results: { data?: EstadoAulaVivo }[]): EstadosVivos {
  const estados = { ...ESTADOS_VACIOS };
  const valores = { ...VALORES_VACIOS };
  let nowMs = 0;
  for (const r of results) {
    if (!r.data) continue;
    estados[r.data.aula] = r.data.estado;
    valores[r.data.aula] = r.data.valores;
    nowMs = Math.max(nowMs, r.data.tsMs);
  }
  return { estados, valores, nowMs, listo: results.every((r) => r.data) };
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
function combinarAbiertos(results: { data?: { content: Evento[] } }[]) {
  return {
    abiertos: results.flatMap((r) => r.data?.content ?? []).filter((e) => !e.cerrado),
    listo: results.every((r) => r.data),
  };
}

export function useEventosAbiertos() {
  const habilitado = useHabilitado();
  return useQueries({
    queries: (["critico", "alerta"] as const).map((severidad) => ({
      queryKey: ["eventos", "abiertos", severidad],
      queryFn: () => listarEventos({ abierto: true, severidad, size: 200 }),
      enabled: habilitado,
      refetchInterval: INTERVALO_EVENTOS_MS,
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

/** Recent window of the log, used to build the actor footprint. */
export function useEventosVentana(desde?: Date, hasta?: Date) {
  const habilitado = useHabilitado();
  return useQuery({
    queryKey: ["eventos", "ventana", desde?.getTime(), hasta?.getTime()],
    queryFn: () => listarEventos({ desde, hasta, size: 500 }),
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
    // the backend replaces the full block set per classroom
    mutationFn: (h: Horario) =>
      Promise.all(CODIGOS_AULA.map((a) => guardarHorarioAula(a, h[a]))),
    onSuccess: (_r, h) => qc.setQueryData(["horario"], h),
  });
}

// ---------------------------------------------------------------------------
// session

/** Ends the session on the server, drops every cached query and returns to /acceso. */
export function useCerrarSesion() {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
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
