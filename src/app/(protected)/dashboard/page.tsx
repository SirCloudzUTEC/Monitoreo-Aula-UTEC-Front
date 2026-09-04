"use client";

import { AulaSummaryCard } from "@/components/dashboard/aula-summary-card";
import { VulnerabilidadesList } from "@/components/dashboard/vulnerabilidades-list";
import { AULA_IDS } from "@/domain/constants";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Resumen de aulas</h2>
        <p className="text-sm text-muted-foreground">Haz click en un aula para ver el detalle de cada modulo.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {AULA_IDS.map((id) => (
          <AulaSummaryCard key={id} aulaId={id} />
        ))}
      </div>
      <VulnerabilidadesList />
    </div>
  );
}
