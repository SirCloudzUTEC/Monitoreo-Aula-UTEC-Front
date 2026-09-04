"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { EstadoAulaBadge } from "@/components/common/estado-badge";
import { ModuleTile } from "@/components/dashboard/module-tile";
import { useAula } from "@/data/store/simulation-store";
import { AULA_IDS } from "@/domain/constants";
import type { Magnitud } from "@/domain/enums";
import type { AulaId } from "@/domain/types";
import { ESTADO_PUERTA_META } from "@/lib/colors";

const MAGNITUDES_DETALLE: Magnitud[] = [
  "temperatura",
  "humedad",
  "co2",
  "pm25",
  "ruido",
  "iluminancia",
  "aforo",
  "proximidad_ventana",
  "bateria",
];

export default function AulaDetallePage({ params }: PageProps<"/aulas/[aulaId]">) {
  const { aulaId } = use(params);

  if (!AULA_IDS.includes(aulaId as AulaId)) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState icon={SearchX} title="Aula no encontrada" description={`No existe un aula con el identificador "${aulaId}".`} />
        <Button
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          render={
            <Link href="/dashboard">
              <ArrowLeft className="size-3.5" />
              Volver al dashboard
            </Link>
          }
        />
      </div>
    );
  }

  return <AulaDetalleContenido aulaId={aulaId as AulaId} />;
}

function AulaDetalleContenido({ aulaId }: { aulaId: AulaId }) {
  const aula = useAula(aulaId);
  const [expandido, setExpandido] = useState<Magnitud | null>(null);
  const puertaMeta = ESTADO_PUERTA_META[aula.puerta];
  const PuertaIcon = puertaMeta.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5 px-2"
          render={
            <Link href="/dashboard">
              <ArrowLeft className="size-3.5" />
              Volver al dashboard
            </Link>
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{aula.edificio} · {aula.piso}</p>
            <h2 className="text-xl font-semibold">{aula.nombre}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-sm font-medium ${puertaMeta.className}`}>
              <PuertaIcon className="size-4" />
              Puerta {puertaMeta.label.toLowerCase()}
            </span>
            <EstadoAulaBadge estado={aula.estado} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MAGNITUDES_DETALLE.map((magnitud) => (
          <ModuleTile
            key={magnitud}
            aulaId={aulaId}
            magnitud={magnitud}
            expanded={expandido === magnitud}
            onToggle={() => setExpandido((prev) => (prev === magnitud ? null : magnitud))}
          />
        ))}
      </div>
    </div>
  );
}
