"use client";

// F1 — general dashboard: per-classroom summary + the 8 domain modules.

import Link from "next/link";
import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { PanelAdmin } from "@/components/admin/panel-admin";
import { AulaSummaryCard } from "@/components/modules/aula-summary-card";
import { ModuleCard } from "@/components/modules/module-card";
import { ORDEN_MODULOS, riesgoAula } from "@/lib/modules";
import { useApp } from "@/lib/store";
import { CODIGOS_AULA } from "@/lib/aulas";
import { useEstados, useEventosAbiertos, useHorario, useUmbrales } from "@/lib/api/hooks";
import { horaLarga } from "@/lib/format";
import { claseEnCurso } from "@/lib/schedule";
import type { AulaCodigo } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_AULAS_VISIBLES = 4;

export default function DashboardPage() {
  const { abiertos, listo: alertasListas } = useEventosAbiertos();
  const { estados, valores, nowMs: simNowMs, listo } = useEstados();
  const { umbrales } = useUmbrales();
  const { horario } = useHorario();
  const prefsAulas = useApp((s) => s.prefsAulas);
  const [expandido, setExpandido] = useState(false);

  const sinAcuse = abiertos.filter((e) => !e.acuse).length;
  const aulasLibres = CODIGOS_AULA.filter((a) => estados[a] === "Libre").length;

  const fecha = new Date(simNowMs);
  const riesgos = CODIGOS_AULA.map((a) =>
    riesgoAula(a, valores[a], umbrales, abiertos, claseEnCurso(horario, a, fecha)),
  );
  const enRiesgo = riesgos.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  const hayRiesgo = enRiesgo.length > 0;

  // Selección manual (ajustes): se parte de esas aulas; sin selección, orden por riesgo.
  const modoManual = prefsAulas.modo === "manual" && prefsAulas.seleccion.length > 0;
  const preferidas: AulaCodigo[] = modoManual
    ? prefsAulas.seleccion.filter((a) => CODIGOS_AULA.includes(a))
    : enRiesgo.map((r) => r.aula);

  // La zona siempre va en duplas: se completa con las demás aulas hasta un número par.
  const resto = CODIGOS_AULA.filter((a) => !preferidas.includes(a));
  const base: AulaCodigo[] = [...preferidas, ...resto];
  const maxVisibles = expandido ? base.length : MAX_AULAS_VISIBLES;
  const enDuplas = (n: number) => Math.min(base.length, n + (n % 2));
  const visibles = base.slice(0, enDuplas(modoManual ? Math.max(preferidas.length, 2) : maxVisibles));
  const restantes = modoManual ? 0 : base.length - visibles.length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Panel general</h1>
        <p className="text-base text-muted-foreground">
          {listo && simNowMs ? `Estado en vivo a las ${horaLarga(simNowMs)}` : "Cargando estado en vivo…"} ·{" "}
          {listo ? `${aulasLibres} de ${CODIGOS_AULA.length} aulas libres` : "comprobando aulas…"} ·{" "}
          {!alertasListas ? (
            <span className="font-medium">comprobando alertas…</span>
          ) : sinAcuse > 0 ? (
            <span className="font-medium text-red-600">
              {sinAcuse} alerta{sinAcuse === 1 ? "" : "s"} sin acuse
            </span>
          ) : (
            <span className="font-medium text-emerald-600">sin alertas pendientes</span>
          )}
        </p>
      </div>

      <section className="flex flex-col gap-4" aria-label="Resumen por aula">
        <div className="flex items-center justify-between gap-2">
          {hayRiesgo ? (
            <h2 className="text-lg font-semibold text-red-600">
              Aulas en riesgo ({enRiesgo.length})
            </h2>
          ) : (
            <span />
          )}
          <Link
            href="/aulas"
            className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Ver más aulas →
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {visibles.map((a) => (
            <AulaSummaryCard key={a} aula={a} />
          ))}
        </div>
        {restantes > 0 && (
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className={cn(
              "flex items-center justify-center gap-1.5 text-sm font-medium",
              hayRiesgo
                ? "text-red-600 hover:text-red-700"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {hayRiesgo
              ? `Ver ${restantes} aula${restantes === 1 ? "" : "s"} más en riesgo`
              : `Ver ${restantes} aula${restantes === 1 ? "" : "s"} más`}
            <ChevronDownIcon className="size-4" aria-hidden />
          </button>
        )}
        {expandido && base.length > MAX_AULAS_VISIBLES && (
          <button
            type="button"
            onClick={() => setExpandido(false)}
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Mostrar menos
            <ChevronUpIcon className="size-4" aria-hidden />
          </button>
        )}
      </section>

      <PanelAdmin />

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