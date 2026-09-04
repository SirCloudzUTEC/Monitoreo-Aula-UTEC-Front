"use client";

import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/common/severity-badge";
import { EmptyState } from "@/components/common/empty-state";
import { useVulnerabilidades } from "@/hooks/use-vulnerabilidades";

export function VulnerabilidadesList() {
  const vulnerabilidades = useVulnerabilidades();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />
          Vulnerabilidades detectadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vulnerabilidades.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Sin vulnerabilidades activas" description="No se detectaron condiciones de riesgo en las aulas monitoreadas." />
        ) : (
          <ul className="flex flex-col gap-3">
            {vulnerabilidades.map((v) => (
              <li key={v.id} className="flex flex-col gap-1 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {v.aulaId} — {v.titulo}
                  </span>
                  <SeverityBadge severidad={v.severidad} />
                </div>
                <p className="text-sm text-muted-foreground">{v.explicacion}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
