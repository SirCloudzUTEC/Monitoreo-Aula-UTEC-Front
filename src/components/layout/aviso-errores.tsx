"use client";

// Surfaces failed data loads. Without it a 403/500 from the backend leaves a page with skeletons or
// empty lists and no explanation. Connection loss is reported by the app shell's own banner.

import { useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import { ApiError } from "@/lib/api/client";

function textoDe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "tu cuenta no tiene permiso para estos datos";
    if (error.sinConexion) return "sin conexión con el servidor";
    return error.message;
  }
  return "error inesperado";
}

/** "<count>\u0000<first message>" — a primitive, so useSyncExternalStore compares it by value. */
function instantanea(qc: QueryClient): string {
  const fallidas = qc
    .getQueryCache()
    .getAll()
    .filter((q) => q.state.status === "error" && q.state.fetchStatus === "idle");
  if (fallidas.length === 0) return "";
  // one failing endpoint queried per room/magnitude counts once, not once per query
  const conjuntos = new Set(fallidas.map((q) => String(q.queryKey[0])));
  return `${conjuntos.size}\u0000${textoDe(fallidas[0].state.error)}`;
}

export function AvisoErrores({ conectado }: { conectado: boolean }) {
  const qc = useQueryClient();
  const estado = useSyncExternalStore(
    (cb) => qc.getQueryCache().subscribe(cb),
    () => instantanea(qc),
    () => "",
  );
  if (!estado || !conectado) return null;
  const [n, mensaje] = estado.split("\u0000");
  return (
    <div
      role="alert"
      className="flex items-center gap-2 border-b border-red-300 bg-red-50 px-4 py-2 text-xs text-red-900 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200"
    >
      <AlertCircleIcon className="size-4 shrink-0" aria-hidden />
      No se pudieron cargar {n === "1" ? "unos datos" : `${n} conjuntos de datos`}: {mensaje}. Se reintentará
      automáticamente.
    </div>
  );
}
