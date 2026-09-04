"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EstadoAulaBadge } from "@/components/common/estado-badge";
import { MiniIndicators } from "@/components/dashboard/mini-indicators";
import { useAlertas, useAula, useConfiguracion } from "@/data/store/simulation-store";
import type { AulaId } from "@/domain/types";
import { ESTADO_PUERTA_META } from "@/lib/colors";

export function AulaSummaryCard({ aulaId }: { aulaId: AulaId }) {
  const aula = useAula(aulaId);
  const configuracion = useConfiguracion(aulaId);
  const alertas = useAlertas().filter((a) => a.aulaId === aulaId && a.estadoAcuse === "pendiente");
  const puertaMeta = ESTADO_PUERTA_META[aula.puerta];
  const PuertaIcon = puertaMeta.icon;
  const pctOcupacion = Math.min(100, Math.round((aula.ocupacionActual / configuracion.aforoMaximo) * 100));

  return (
    <Link href={`/aulas/${aula.id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">{aula.edificio} · {aula.piso}</p>
            <h2 className="text-lg font-semibold">{aula.nombre}</h2>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <EstadoAulaBadge estado={aula.estado} />
            {alertas.length > 0 ? (
              <Badge variant="destructive" className="text-[11px]">
                {alertas.length} alerta{alertas.length > 1 ? "s" : ""} activa{alertas.length > 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="size-4" />
                Aforo
              </span>
              <span className="tabular-nums text-muted-foreground">
                {aula.ocupacionActual} / {configuracion.aforoMaximo}
              </span>
            </div>
            <Progress value={pctOcupacion} className={pctOcupacion >= 100 ? "[&>div]:bg-red-600" : undefined} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className={`flex items-center gap-1.5 font-medium ${puertaMeta.className}`}>
              <PuertaIcon className="size-4" />
              Puerta {puertaMeta.label.toLowerCase()}
            </span>
          </div>

          <MiniIndicators aulaId={aulaId} />

          <div className="flex items-center justify-end gap-1 text-sm font-medium text-primary">
            Ver detalle
            <ArrowRight className="size-3.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
