"use client";

import { useState } from "react";
import { BellRing, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertItem } from "@/components/alerts/alert-item";
import { EmptyState } from "@/components/common/empty-state";
import { useAlertas } from "@/hooks/use-alertas";
import { AULA_IDS } from "@/domain/constants";
import type { AulaId } from "@/domain/types";

export default function AlertasPage() {
  const [aulaFiltro, setAulaFiltro] = useState<AulaId | "todas">("todas");
  const { activas, historial, ack } = useAlertas(aulaFiltro === "todas" ? undefined : { aulaId: aulaFiltro });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Centro de alertas</h2>
          <p className="text-sm text-muted-foreground">Alertas generadas por el sistema, con acuse de recibo para Operaciones.</p>
        </div>
        <Select value={aulaFiltro} onValueChange={(v) => setAulaFiltro(v as AulaId | "todas")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Aula" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las aulas</SelectItem>
            {AULA_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="activas">
        <TabsList>
          <TabsTrigger value="activas" className="gap-1.5">
            <BellRing className="size-3.5" />
            Activas ({activas.length})
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-1.5">
            <History className="size-3.5" />
            Historial ({historial.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="activas" className="flex flex-col gap-2">
          {activas.length === 0 ? (
            <EmptyState icon={BellRing} title="Sin alertas activas" description="Todas las alertas han sido atendidas." />
          ) : (
            activas.map((alerta) => <AlertItem key={alerta.id} alerta={alerta} onAck={ack} />)
          )}
        </TabsContent>
        <TabsContent value="historial" className="flex flex-col gap-2">
          {historial.length === 0 ? (
            <EmptyState icon={History} title="Sin historial todavia" description="Las alertas atendidas apareceran aqui." />
          ) : (
            historial.map((alerta) => <AlertItem key={alerta.id} alerta={alerta} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
