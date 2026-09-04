"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConfiguracion, useSimulationStore } from "@/data/store/simulation-store";
import type { Magnitud } from "@/domain/enums";
import type { AulaId } from "@/domain/types";
import { MAGNITUD_META } from "@/lib/magnitud-meta";
import { RANGO_MAGNITUD } from "@/domain/constants";
import { formatValor } from "@/lib/format";
import { evaluarMagnitud } from "@/lib/umbral-status";
import { cn } from "@/lib/utils";

const MAGNITUDES: Magnitud[] = ["temperatura", "humedad", "co2", "iluminancia", "ruido"];

const TONO_CLASS: Record<string, string> = {
  normal: "text-muted-foreground",
  aviso: "text-amber-600 dark:text-amber-400",
  alerta: "text-red-600 dark:text-red-400",
};

export function MiniIndicators({ aulaId }: { aulaId: AulaId }) {
  const lecturas = useSimulationStore((s) => s.lecturas[aulaId]);
  const configuracion = useConfiguracion(aulaId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {MAGNITUDES.map((magnitud) => {
        const meta = MAGNITUD_META[magnitud];
        const rango = RANGO_MAGNITUD[magnitud];
        const valor = lecturas[magnitud];
        const { tono } = evaluarMagnitud(magnitud, valor, configuracion);
        const Icon = meta.icon;
        return (
          <Tooltip key={magnitud}>
            <TooltipTrigger
              render={
                <div className={cn("flex items-center gap-1 text-xs tabular-nums", TONO_CLASS[tono])}>
                  <Icon className="size-3.5" />
                  {formatValor(valor, rango.decimales)}
                  <span className="text-[10px] text-muted-foreground">{rango.unidad}</span>
                </div>
              }
            />
            <TooltipContent>{meta.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
