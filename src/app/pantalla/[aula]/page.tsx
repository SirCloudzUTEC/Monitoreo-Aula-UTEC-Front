"use client";

// F3 — classroom TV view (24" screen, readable at 3 m): huge values,
// refreshed every 5 s by the sim clock, full-width red banner on critical.

import { notFound, useParams } from "next/navigation";
import { useApp, CODIGOS_AULA } from "@/lib/store";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import { getAula } from "@/lib/simulator/profiles";
import { bloqueEnCurso, minutosRestantes, proximoBloque, DIAS_SEMANA } from "@/lib/schedule";
import { ETIQUETA_ESTADO, formatearValor, horaCorta } from "@/lib/format";
import type { AulaCodigo, EstadoAula, Magnitud } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLOR_ESTADO: Record<EstadoAula, string> = {
  Cerrada: "bg-zinc-700 text-zinc-100",
  Libre: "bg-sky-600 text-white",
  EnClase: "bg-emerald-600 text-white",
  Alerta: "bg-red-600 text-white",
};

const METRICAS: { magnitud: Magnitud; etiqueta: string }[] = [
  { magnitud: "temperatura", etiqueta: "Temperatura" },
  { magnitud: "humedad", etiqueta: "Humedad" },
  { magnitud: "co2", etiqueta: "CO₂" },
  { magnitud: "ruido", etiqueta: "Ruido" },
  { magnitud: "lux", etiqueta: "Iluminación" },
  { magnitud: "puerta", etiqueta: "Puerta" },
];

export default function PantallaPage() {
  const params = useParams<{ aula: string }>();
  const aula = params.aula as AulaCodigo;
  const valores = useApp((s) => (CODIGOS_AULA.includes(aula) ? s.valores[aula] : undefined));
  const estado = useApp((s) => (CODIGOS_AULA.includes(aula) ? s.estados[aula] : "Cerrada"));
  const abiertos = useApp((s) => s.abiertos);
  const horario = useApp((s) => s.horario);
  const simNowMs = useApp((s) => s.simNowMs);

  if (!CODIGOS_AULA.includes(aula)) notFound();
  const spec = getAula(aula);
  const fecha = new Date(simNowMs); // 0 before init; values are empty then anyway
  const bloque = bloqueEnCurso(horario, aula, fecha);
  const proximo = proximoBloque(horario, aula, fecha);
  const criticos = abiertos.filter((e) => e.aula === aula && e.severidad === "critico" && !e.acuse);
  const ocupacion = typeof valores?.ocupacion === "number" ? valores.ocupacion : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 p-6 text-zinc-50">
      {/* critical banner */}
      {criticos.length > 0 && (
        <div
          role="alert"
          className="mb-6 animate-pulse rounded-xl bg-red-600 px-6 py-4 text-center text-[36px] font-bold leading-tight text-white"
        >
          ⚠ {CATALOGO_EVENTOS[criticos[0].tipo].nombre.toUpperCase()}
          <div className="text-[22px] font-medium">
            {CATALOGO_EVENTOS[criticos[0].tipo].accion}
          </div>
        </div>
      )}

      {/* header */}
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-[44px] font-bold leading-none">{spec.nombre}</h1>
        <span
          className={cn(
            "rounded-full px-5 py-1.5 text-[26px] font-semibold",
            COLOR_ESTADO[estado],
          )}
        >
          {ETIQUETA_ESTADO[estado]}
        </span>
        <span className="ml-auto font-mono text-[44px] tabular-nums leading-none">
          {simNowMs ? horaCorta(simNowMs) : "--:--"}
        </span>
      </header>

      {/* class in progress / next class */}
      <div className="mb-6 text-[26px] text-zinc-300">
        {bloque ? (
          <>
            <span className="font-semibold text-white">{bloque.curso}</span> · termina en{" "}
            <span className="font-semibold text-white">
              {minutosRestantes(horario, aula, fecha)} min
            </span>
          </>
        ) : proximo ? (
          <>
            Próxima clase: <span className="font-semibold text-white">{proximo.bloque.curso}</span>{" "}
            · {DIAS_SEMANA[proximo.bloque.dia]} {proximo.bloque.inicio}
          </>
        ) : (
          "Sin clases programadas"
        )}
      </div>

      {/* metrics grid */}
      <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-xl bg-zinc-900 p-4">
          <div className="text-[24px] text-zinc-400">Ocupación</div>
          <div
            className={cn(
              "font-mono text-[64px] font-bold tabular-nums leading-tight",
              ocupacion > spec.aforo && "text-red-500",
            )}
          >
            {ocupacion}
            <span className="text-[32px] text-zinc-400"> / {spec.aforo}</span>
          </div>
        </div>
        {METRICAS.map((m) => (
          <div
            key={m.magnitud}
            className="flex flex-col items-center justify-center rounded-xl bg-zinc-900 p-4"
          >
            <div className="text-[24px] text-zinc-400">{m.etiqueta}</div>
            <div className="font-mono text-[48px] font-bold tabular-nums leading-tight">
              {formatearValor(m.magnitud, valores?.[m.magnitud])}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-4 text-center text-[18px] text-zinc-500">
        Aula Digital UTEC · actualización cada 5 s
      </footer>
    </div>
  );
}
