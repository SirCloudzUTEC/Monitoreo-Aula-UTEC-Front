"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/common/stat-tile";
import { ModuleDetailPanel } from "@/components/dashboard/module-detail-panel";
import { useConfiguracion, useLecturaActual } from "@/data/store/simulation-store";
import { RANGO_MAGNITUD } from "@/domain/constants";
import type { Magnitud } from "@/domain/enums";
import type { AulaId } from "@/domain/types";
import { MAGNITUD_META } from "@/lib/magnitud-meta";
import { formatValor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { evaluarMagnitud } from "@/lib/umbral-status";

export function ModuleTile({
  aulaId,
  magnitud,
  expanded,
  onToggle,
}: {
  aulaId: AulaId;
  magnitud: Magnitud;
  expanded: boolean;
  onToggle: () => void;
}) {
  const valor = useLecturaActual(aulaId, magnitud);
  const configuracion = useConfiguracion(aulaId);
  const rango = RANGO_MAGNITUD[magnitud];
  const meta = MAGNITUD_META[magnitud];
  const { tono } = evaluarMagnitud(magnitud, valor, configuracion);

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 transition-all",
        expanded && "sm:col-span-2 sm:row-span-2",
        tono === "alerta" && "border-red-300 dark:border-red-900",
        tono === "aviso" && "border-amber-300 dark:border-amber-900",
      )}
    >
      <button type="button" onClick={onToggle} className="flex items-start justify-between gap-2 text-left">
        <StatTile icon={meta.icon} label={meta.label} value={formatValor(valor, rango.decimales)} unit={rango.unidad} tono={tono} />
        <Button variant="ghost" size="icon" className="size-7 shrink-0" tabIndex={-1}>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </button>
      {expanded ? <ModuleDetailPanel aulaId={aulaId} magnitud={magnitud} configuracion={configuracion} /> : null}
    </Card>
  );
}
