"use client";

// F2 — alerts: open list with acknowledge + escalation, and the history of
// out-of-nominal events. Filters by classroom and severity.

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellRingIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventoCard, ETIQUETA_SEVERIDAD } from "@/components/events/evento-card";
import { useApp, CODIGOS_AULA, estaEscalado } from "@/lib/store";
import { TIPOS_FUERA_NOMINAL } from "@/lib/events/catalog";
import type { AulaCodigo, Evento, Severidad } from "@/lib/types";

type FiltroAula = AulaCodigo | "todas";
type FiltroSev = Severidad | "todas";

export default function AlertasPage() {
  const abiertos = useApp((s) => s.abiertos);
  const log = useApp((s) => s.log);
  const simNowMs = useApp((s) => s.simNowMs);
  const [aula, setAula] = useState<FiltroAula>("todas");
  const [sev, setSev] = useState<FiltroSev>("todas");

  const filtrar = (evs: Evento[]) =>
    evs.filter(
      (e) => (aula === "todas" || e.aula === aula) && (sev === "todas" || e.severidad === sev),
    );

  const abiertas = filtrar(abiertos).sort((a, b) => b.ts.localeCompare(a.ts));
  const escaladas = abiertas.filter((e) => estaEscalado(e, simNowMs)).length;

  const historial = useMemo(() => {
    const idsAbiertos = new Set(abiertos.map((e) => e.id_evento));
    const fuera = new Set<string>(TIPOS_FUERA_NOMINAL);
    return log
      .filter((r) => fuera.has(r.tipo) && !idsAbiertos.has(r.id_evento))
      .slice(-500)
      .reverse() as unknown as Evento[];
  }, [log, abiertos]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <BellRingIcon className="size-7 text-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Alertas</h1>
          {escaladas > 0 && (
            <span className="rounded-full bg-red-600 px-3 py-0.5 text-sm font-semibold text-white">
              {escaladas} escalada{escaladas > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="text-base text-muted-foreground">
          {abiertas.length === 0
            ? "No hay alertas abiertas en ninguna aula."
            : `${abiertas.length} alerta${abiertas.length === 1 ? "" : "s"} abierta${abiertas.length === 1 ? "" : "s"} en total.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={aula} onValueChange={(v) => setAula(v as FiltroAula)}>
          <SelectTrigger className="w-36" aria-label="Filtrar por aula">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las aulas</SelectItem>
            {CODIGOS_AULA.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sev} onValueChange={(v) => setSev(v as FiltroSev)}>
          <SelectTrigger className="w-40" aria-label="Filtrar por severidad">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda severidad</SelectItem>
            {(["critico", "alerta", "info"] as Severidad[]).map((s) => (
              <SelectItem key={s} value={s}>
                {ETIQUETA_SEVERIDAD[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="abiertas">
        <TabsList>
          <TabsTrigger value="abiertas">Abiertas ({abiertas.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="abiertas" className="mt-3 flex flex-col gap-2">
          {abiertas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay alertas abiertas. Todo en orden. ✓
            </p>
          ) : (
            abiertas.map((e) => <EventoCard key={e.id_evento} evento={e} abierta />)
          )}
        </TabsContent>
        <TabsContent value="historial" className="mt-3 flex flex-col gap-2">
          {historial.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay eventos cerrados. El historial completo está en el{" "}
              <Link href="/log" className="underline">
                log de eventos
              </Link>
              .
            </p>
          ) : (
            filtrar(historial).map((e) => <EventoCard key={e.id_evento} evento={e} />)
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
