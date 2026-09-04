"use client";

import { useState } from "react";
import { FootprintFilters } from "@/components/footprint/footprint-filters";
import { FootprintTable } from "@/components/footprint/footprint-table";
import { useFootprint, type FootprintFiltro } from "@/hooks/use-footprint";

export default function FootprintPage() {
  const [filtro, setFiltro] = useState<FootprintFiltro>({ aulaId: "todas" });
  const eventos = useFootprint(filtro);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Footprint y log de eventos</h2>
        <p className="text-sm text-muted-foreground">
          Reconstruye la secuencia de eventos originados por un actor (persona, rol o sistema) en un rango de fechas.
        </p>
      </div>
      <FootprintFilters filtro={filtro} onChange={(patch) => setFiltro((prev) => ({ ...prev, ...patch }))} />
      <p className="text-sm text-muted-foreground">{eventos.length} evento{eventos.length !== 1 ? "s" : ""} encontrado{eventos.length !== 1 ? "s" : ""}.</p>
      <FootprintTable eventos={eventos} />
    </div>
  );
}
