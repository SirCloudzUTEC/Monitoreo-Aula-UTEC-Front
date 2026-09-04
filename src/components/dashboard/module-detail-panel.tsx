"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SensorLineChart } from "@/components/charts/sensor-line-chart";
import { SeverityBadge } from "@/components/common/severity-badge";
import { Button } from "@/components/ui/button";
import { useSimulationStore } from "@/data/store/simulation-store";
import { RANGO_MAGNITUD } from "@/domain/constants";
import type { Magnitud } from "@/domain/enums";
import type { AulaId, ConfiguracionAula } from "@/domain/types";
import { formatHora } from "@/lib/format";
import { evaluarMagnitud } from "@/lib/umbral-status";

export function ModuleDetailPanel({
  aulaId,
  magnitud,
  configuracion,
}: {
  aulaId: AulaId;
  magnitud: Magnitud;
  configuracion: ConfiguracionAula;
}) {
  const valor = useSimulationStore((s) => s.lecturas[aulaId][magnitud]);
  const eventos = useSimulationStore((s) => s.eventos)
    .filter((e) => e.aulaId === aulaId && e.magnitud === magnitud)
    .slice(-5)
    .reverse();
  const { umbralMin, umbralMax } = evaluarMagnitud(magnitud, valor, configuracion);
  const rango = RANGO_MAGNITUD[magnitud];

  return (
    <div className="flex flex-col gap-4">
      <SensorLineChart aulaId={aulaId} magnitud={magnitud} unidad={rango.unidad} umbralMax={umbralMax} umbralMin={magnitud === "temperatura" || magnitud === "humedad" ? umbralMin : undefined} />
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Eventos recientes</p>
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin eventos registrados todavia para este modulo.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {eventos.map((evento) => (
              <li key={evento.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{evento.mensaje}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <SeverityBadge severidad={evento.severidad} />
                  <span className="text-xs text-muted-foreground">{formatHora(evento.timestamp)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        render={
          <Link href={`/configuracion?aula=${aulaId}`}>
            Configurar umbral de este modulo
            <ArrowRight className="size-3.5" />
          </Link>
        }
      />
    </div>
  );
}
