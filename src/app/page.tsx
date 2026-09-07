"use client";

// F1 — general dashboard: per-classroom summary + the 8 domain modules.

import { AulaSummaryCard } from "@/components/modules/aula-summary-card";
import { ModuleCard } from "@/components/modules/module-card";
import { ORDEN_MODULOS } from "@/lib/modules";
import { CODIGOS_AULA } from "@/lib/store";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Panel general</h1>
      <section className="grid gap-4 sm:grid-cols-2" aria-label="Resumen por aula">
        {CODIGOS_AULA.map((a) => (
          <AulaSummaryCard key={a} aula={a} />
        ))}
      </section>
      <section aria-label="Módulos de dominio">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Módulos</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ORDEN_MODULOS.map((m) => (
            <ModuleCard key={m} modulo={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
