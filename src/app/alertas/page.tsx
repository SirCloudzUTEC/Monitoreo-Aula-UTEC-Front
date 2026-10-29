"use client";

// F2 — alerts: open list with acknowledge + escalation, and the history of
// out-of-nominal events. Filters by classroom and severity.

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellRingIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventoCard } from "@/components/events/evento-card";
import { PageHeader, Vacio } from "@/components/common/layout";
import {
  FiltroAulaSelect,
  FiltroSeveridadSelect,
  type FiltroAula,
  type FiltroSeveridad,
} from "@/components/common/form";
import { estaEscalado } from "@/lib/store";
import { useEstados, useEventosAbiertos, useEventosCerrados } from "@/lib/api/hooks";
import { TIPOS_FUERA_NOMINAL } from "@/lib/events/catalog";
import { plural } from "@/lib/format";

const FUERA_NOMINAL = new Set<string>(TIPOS_FUERA_NOMINAL);

export default function AlertasPage() {
  const { abiertos } = useEventosAbiertos();
  const cerrados = useEventosCerrados();
  const { nowMs } = useEstados();
  const [aula, setAula] = useState<FiltroAula>("todas");
  const [sev, setSev] = useState<FiltroSeveridad>("todas");

  const { abiertas, historial } = useMemo(() => {
    const pasa = (e: { aula: string; severidad: string }) =>
      (aula === "todas" || e.aula === aula) && (sev === "todas" || e.severidad === sev);
    return {
      abiertas: abiertos.filter(pasa).sort((a, b) => b.ts.localeCompare(a.ts)),
      historial: cerrados.filter((e) => FUERA_NOMINAL.has(e.tipo) && pasa(e)),
    };
  }, [abiertos, cerrados, aula, sev]);
  const escaladas = abiertas.filter((e) => estaEscalado(e, nowMs)).length;
  const filtrando = aula !== "todas" || sev !== "todas";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        icon={BellRingIcon}
        title="Alertas"
        subtitle={
          abiertas.length === 0
            ? "No hay alertas abiertas en ninguna aula."
            : `${plural(abiertas.length, "alerta")} ${abiertas.length === 1 ? "abierta" : "abiertas"} en total.`
        }
      >
        {escaladas > 0 && (
          <span className="rounded-full bg-red-600 px-3 py-0.5 text-sm font-semibold text-white">
            {plural(escaladas, "escalada")}
          </span>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <FiltroAulaSelect value={aula} onChange={setAula} />
        <FiltroSeveridadSelect value={sev} onChange={setSev} />
      </div>

      <Tabs defaultValue="abiertas">
        <TabsList>
          <TabsTrigger value="abiertas">Abiertas ({abiertas.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="abiertas" className="mt-3 flex flex-col gap-2">
          {abiertas.length === 0 ? (
            <Vacio>No hay alertas abiertas. Todo en orden. ✓</Vacio>
          ) : (
            abiertas.map((e) => <EventoCard key={e.id_evento} evento={e} abierta nowMs={nowMs} />)
          )}
        </TabsContent>
        <TabsContent value="historial" className="mt-3 flex flex-col gap-2">
          {historial.length === 0 ? (
            <Vacio>
              {filtrando ? "Ningún evento cerrado coincide con los filtros." : "Aún no hay eventos cerrados."} El
              historial completo está en el{" "}
              <Link href="/log" className="underline">
                log de eventos
              </Link>
              .
            </Vacio>
          ) : (
            historial.map((e) => <EventoCard key={e.id_evento} evento={e} />)
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Las alertas críticas también llegan como notificación push si activas el permiso en{" "}
        <Link href="/ajustes" className="underline">
          Ajustes
        </Link>
        .
      </p>
    </div>
  );
}
