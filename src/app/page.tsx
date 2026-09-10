"use client";

// F1 — general dashboard: per-classroom summary + the 8 domain modules.

import { AulaSummaryCard } from "@/components/modules/aula-summary-card";
import { ModuleCard } from "@/components/modules/module-card";
import { ORDEN_MODULOS } from "@/lib/modules";
import { useApp, CODIGOS_AULA } from "@/lib/store";
import { horaLarga } from "@/lib/format";

export default function DashboardPage() {
  const abiertos = useApp((s) => s.abiertos);
  const estados = useApp((s) => s.estados);
  const simNowMs = useApp((s) => s.simNowMs);
  const sinAcuse = abiertos.filter((e) => !e.acuse).length;
  const aulasLibres = CODIGOS_AULA.filter((a) => estados[a] === "Libre").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Panel general</h1>
        <p className="text-base text-muted-foreground">
          {simNowMs ? `Estado en vivo a las ${horaLarga(simNowMs)}` : "Cargando estado en vivo…"} ·{" "}
          {aulasLibres} de {CODIGOS_AULA.length} aulas libres ·{" "}
          {sinAcuse > 0 ? (
            <span className="font-medium text-red-600">
              {sinAcuse} alerta{sinAcuse === 1 ? "" : "s"} sin acuse
            </span>
          ) : (
            <span className="font-medium text-emerald-600">sin alertas pendientes</span>
          )}
        </p>
      </div>
      <section className="grid gap-5 xl:grid-cols-2" aria-label="Resumen por aula">
        {CODIGOS_AULA.map((a) => (
          <AulaSummaryCard key={a} aula={a} />
        ))}
      </section>
      <section aria-label="Módulos de dominio">
        <h2 className="mb-4 text-lg font-semibold">Módulos de monitoreo</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {ORDEN_MODULOS.map((m) => (
            <ModuleCard key={m} modulo={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
