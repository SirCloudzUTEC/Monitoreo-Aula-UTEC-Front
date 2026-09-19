"use client";

import { AlertTriangleIcon } from "lucide-react";
import { LECTURA_OBSOLETA_MS } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/** "hace 7 min", "hace 3 h", "hace 2 d" */
export function haceCuanto(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

/**
 * Warns when a room's newest reading is old (or it never reported): the values shown next to it
 * are the last ones ever received, not live data. Renders nothing while the data is fresh.
 */
export function AvisoObsoleto({
  antiguedadMs,
  oscuro = false,
  className,
}: {
  /** null = still loading, Infinity = never reported */
  antiguedadMs: number | null;
  /** for the dark TV screen */
  oscuro?: boolean;
  className?: string;
}) {
  if (antiguedadMs === null || antiguedadMs <= LECTURA_OBSOLETA_MS) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        oscuro
          ? "border-amber-500/60 bg-amber-950 text-amber-200"
          : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200",
        className,
      )}
    >
      <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
      {Number.isFinite(antiguedadMs)
        ? `Sin datos recientes: la última lectura llegó ${haceCuanto(antiguedadMs)}. Los valores mostrados no son actuales.`
        : "Este ambiente todavía no ha enviado lecturas."}
    </div>
  );
}
