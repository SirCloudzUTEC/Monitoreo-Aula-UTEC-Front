"use client";

// F3 — classroom TV view (24" screen, readable at 3 m): huge values,
// refreshed every 5 s from the backend, full-width red banner on critical.

import { notFound } from "next/navigation";
import { AvisoObsoleto } from "@/components/modules/aviso-obsoleto";
import { getAula } from "@/lib/aulas";
import { useEstados, useEventosAbiertos, useHorario, useUmbrales } from "@/lib/api/hooks";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import { bloqueEnCurso, minutosRestantes, proximoBloque, DIAS_SEMANA } from "@/lib/schedule";
import { CLASE_ESTADO_TV, ETIQUETA_ESTADO, formatearValor, horaCorta } from "@/lib/format";
import { fueraDeUmbral } from "@/lib/umbrales";
import { MAGNITUDES } from "@/lib/units";
import { useAulaParam } from "@/lib/use-aula-param";
import type { Aula, Magnitud, Umbrales, Valores } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Contexto {
  valores: Valores;
  umbrales: Umbrales;
  spec: Aula;
  enClase: boolean;
}

interface MetricaConfig {
  magnitud: Magnitud;
  /** cuándo se pinta en rojo (por defecto, la regla de umbral de la magnitud) */
  enAlerta?: (c: Contexto) => boolean;
  /** valor mostrado (por defecto, el valor formateado) */
  mostrar?: (c: Contexto) => React.ReactNode;
  /** acción recomendada que se muestra cuando la medida está en alerta */
  accion?: string;
  /** tamaño del valor (el aforo se lee aún más grande) */
  claseValor?: string;
}

const ocupacionDe = (v: Valores) => (typeof v.ocupacion === "number" ? v.ocupacion : 0);

const METRICAS: MetricaConfig[] = [
  {
    magnitud: "ocupacion",
    claseValor: "text-[64px]",
    enAlerta: (c) => ocupacionDe(c.valores) > c.spec.aforo,
    mostrar: (c) => (
      <>
        {ocupacionDe(c.valores)}
        <span className="text-[32px] opacity-70"> / {c.spec.aforo}</span>
      </>
    ),
  },
  { magnitud: "temperatura", accion: "Subir aire acondicionado" },
  { magnitud: "humedad", accion: "Ajustar climatización" },
  { magnitud: "co2", accion: "Aumentar ventilación" },
  { magnitud: "ruido", accion: "Cerrar ventanas" },
  { magnitud: "lux", accion: "Encender luces" },
  { magnitud: "puerta", enAlerta: (c) => c.valores.puerta === "abierta", accion: "Cerrar puerta" },
];

export default function PantallaPage() {
  const aula = useAulaParam("aula");
  const { estados, valores: todos, antiguedadMs, nowMs } = useEstados();
  const { abiertos } = useEventosAbiertos();
  const { horario } = useHorario();
  const { umbrales } = useUmbrales();

  if (!aula) notFound();
  const spec = getAula(aula);
  const valores = todos[aula];
  const estado = estados[aula];
  const fecha = new Date(nowMs); // 0 before init; values are empty then anyway
  const bloque = bloqueEnCurso(horario, aula, fecha);
  const proximo = bloque ? null : proximoBloque(horario, aula, fecha);
  const criticos = abiertos.filter((e) => e.aula === aula && e.severidad === "critico" && !e.acuse);
  const ctx: Contexto = { valores, umbrales, spec, enClase: bloque !== null };

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 p-6 text-zinc-50">
      {/* critical banner */}
      {criticos.length > 0 && (
        <div
          role="alert"
          className="mb-6 animate-pulse rounded-xl bg-red-600 px-6 py-4 text-center text-[36px] font-bold leading-tight text-white"
        >
          ⚠ {CATALOGO_EVENTOS[criticos[0].tipo].nombre.toUpperCase()}
          <div className="text-[22px] font-medium">{CATALOGO_EVENTOS[criticos[0].tipo].accion}</div>
        </div>
      )}

      <AvisoObsoleto antiguedadMs={antiguedadMs[aula]} oscuro className="mb-6 text-[22px]" />

      {/* header */}
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-[44px] font-bold leading-none">{spec.nombre}</h1>
        <span className={cn("rounded-full px-5 py-1.5 text-[26px] font-semibold", CLASE_ESTADO_TV[estado])}>
          {ETIQUETA_ESTADO[estado]}
        </span>
        <span className="ml-auto font-mono text-[44px] tabular-nums leading-none">
          {nowMs ? horaCorta(nowMs) : "--:--"}
        </span>
      </header>

      {/* class in progress / next class */}
      <div className="mb-6 text-[26px] text-zinc-300">
        {bloque ? (
          <>
            <span className="font-semibold text-white">{bloque.curso}</span> · termina en{" "}
            <span className="font-semibold text-white">{minutosRestantes(bloque, fecha)} min</span>
          </>
        ) : proximo ? (
          <>
            Próxima clase: <span className="font-semibold text-white">{proximo.bloque.curso}</span> ·{" "}
            {DIAS_SEMANA[proximo.bloque.dia]} {proximo.bloque.inicio}
          </>
        ) : (
          "Sin clases programadas"
        )}
      </div>

      {/* metrics grid */}
      <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-3">
        {METRICAS.map((m) => {
          const valor = valores[m.magnitud];
          const alerta = m.enAlerta ? m.enAlerta(ctx) : fueraDeUmbral(m.magnitud, valor, umbrales, ctx.enClase);
          return (
            <div
              key={m.magnitud}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-colors",
                alerta ? "bg-red-600/90" : "bg-zinc-900",
              )}
            >
              <div className={cn("text-[24px]", alerta ? "text-red-100" : "text-zinc-400")}>
                {MAGNITUDES[m.magnitud].corta}
              </div>
              <div
                className={cn("font-mono font-bold tabular-nums leading-tight text-white", m.claseValor ?? "text-[48px]")}
              >
                {m.mostrar ? m.mostrar(ctx) : formatearValor(m.magnitud, valor)}
              </div>
              {alerta && m.accion && (
                <div className="mt-1 rounded-full border border-white/70 px-4 py-1.5 text-[18px] font-semibold text-white">
                  {m.accion}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <footer className="mt-4 text-center text-[18px] text-zinc-500">
        Aula Digital UTEC · actualización cada 5 s
      </footer>
    </div>
  );
}
