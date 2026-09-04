"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UmbralForm } from "@/components/config/umbral-form";
import { HorarioForm } from "@/components/config/horario-form";
import { ImportPlanoDialog } from "@/components/config/import-plano-dialog";
import { useConfigAula } from "@/hooks/use-config-aula";
import { AULA_IDS } from "@/domain/constants";
import type { AulaId } from "@/domain/types";

function ConfiguracionContenido() {
  const searchParams = useSearchParams();
  const aulaInicial = (searchParams.get("aula") as AulaId | null) ?? AULA_IDS[0];
  const [aulaId, setAulaId] = useState<AulaId>(AULA_IDS.includes(aulaInicial) ? aulaInicial : AULA_IDS[0]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Configuracion</h2>
        <p className="text-sm text-muted-foreground">Ajusta umbrales, aforo, horario e importa el plano de cada aula.</p>
      </div>

      <Tabs value={aulaId} onValueChange={(v) => setAulaId(v as AulaId)}>
        <TabsList>
          {AULA_IDS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {id}
            </TabsTrigger>
          ))}
        </TabsList>
        {AULA_IDS.map((id) => (
          <TabsContent key={id} value={id} className="flex flex-col gap-4">
            <ConfiguracionAulaPanel aulaId={id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ConfiguracionAulaPanel({ aulaId }: { aulaId: AulaId }) {
  const { configuracion, guardando, importando, guardar, importarPlano } = useConfigAula(aulaId);

  return (
    <>
      <ImportPlanoDialog configuracion={configuracion} importando={importando} onImportar={importarPlano} />
      <UmbralForm configuracion={configuracion} guardando={guardando} onGuardar={guardar} />
      <HorarioForm configuracion={configuracion} guardando={guardando} onGuardar={guardar} />
    </>
  );
}

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Cargando…</div>}>
      <ConfiguracionContenido />
    </Suspense>
  );
}
