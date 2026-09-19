"use client";

// F3 — classroom TV view (24" screen, readable at 3 m): huge values,
// refreshed every 5 s from the backend, full-width red banner on critical.

import { notFound, useParams } from "next/navigation";
import { AvisoObsoleto } from "@/components/modules/aviso-obsoleto";
import { CODIGOS_AULA, getAula } from "@/lib/aulas";
import { useEstados, useEventosAbiertos, useHorario, useUmbrales } from "@/lib/api/hooks";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import { bloqueEnCurso, minutosRestantes, proximoBloque, DIAS_SEMANA } from "@/lib/schedule";
import { ETIQUETA_ESTADO, formatearValor, horaCorta } from "@/lib/format";
import type { AulaCodigo, EstadoAula, EstadoPuerta, Magnitud, Umbrales } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLOR_ESTADO: Record<EstadoAula, string> = {
  Cerrada: "bg-zinc-700 text-zinc-100",
  Libre: "bg-sky-600 text-white",
  EnClase: "bg-emerald-600 text-white",
  Alerta: "bg-red-600 text-white",
};

interface MetricaConfig {
  magnitud: Magnitud;
  etiqueta: string;
  /** cuándo se pinta en rojo */
  enAlerta: (valor: number | EstadoPuerta | undefined, umbrales: Umbrales) => boolean;
  /** acción recomendada que se muestra cuando la medida está en alerta */
  accion?: string;
}


const METRICAS: MetricaConfig[] = [
  {
    magnitud: "temperatura",
    etiqueta: "Temperatura",
    enAlerta: (v, u) => typeof v === "number" && v > u.umbralTemp,
    accion: "Subir aire acondicionado",
  },
  {
    magnitud: "humedad",
    etiqueta: "Humedad",
    enAlerta: (v, u) => typeof v === "number" && (v < u.hrMin || v > u.hrMax),
    accion: "Ajustar climatización",
  },
  {
    magnitud: "co2",
    etiqueta: "CO₂",
    enAlerta: (v, u) => typeof v === "number" && v >= u.co2Aviso,
    accion: "Aumentar ventilación",
  },
  {
    magnitud: "ruido",
    etiqueta: "Ruido",
    enAlerta: (v, u) => typeof v === "number" && v > u.umbralRuido,
    accion: "Cerrar ventanas",
  },
  {
    magnitud: "lux",
    etiqueta: "Iluminación",
    enAlerta: (v, u) => typeof v === "number" && v < u.umbralLux,
    accion: "Encender luces",
  },
  {
    magnitud: "puerta",
    etiqueta: "Puerta",
    enAlerta: (v) => v === "abierta",
    accion: "Cerrar puerta",
  },
];

export default function PantallaPage() {
  const params = useParams<{ aula: string }>();
  const aula = params.aula as AulaCodigo;
  const { estados, valores: todos, antiguedadMs, nowMs: simNowMs } = useEstados();
  const valido = CODIGOS_AULA.includes(aula);
  const valores = valido ? todos[aula] : undefined;
  const estado = valido ? estados[aula] : "Cerrada";
  const { abiertos } = useEventosAbiertos();
  const { horario } = useHorario();
  const { umbrales } = useUmbrales();

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

      {valido && (
        <AvisoObsoleto antiguedadMs={antiguedadMs[aula]} oscuro className="mb-6 text-[22px]" />
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
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl p-4 transition-colors",
            ocupacion > spec.aforo ? "bg-red-600/90" : "bg-zinc-900",
          )}
        >
          <div className={cn("text-[24px]", ocupacion > spec.aforo ? "text-red-100" : "text-zinc-400")}>
            Ocupación
          </div>
          <div className="font-mono text-[64px] font-bold tabular-nums leading-tight text-white">
            {ocupacion}
            <span className={cn("text-[32px]", ocupacion > spec.aforo ? "text-red-100" : "text-zinc-400")}>
              {" "}
              / {spec.aforo}
            </span>
          </div>
        </div>
        {METRICAS.map((m) => {
          const valor = valores?.[m.magnitud];
          const alerta = m.enAlerta(valor, umbrales);
          return (
            <div
              key={m.magnitud}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-colors",
                alerta ? "bg-red-600/90" : "bg-zinc-900",
              )}
            >
              <div className={cn("text-[24px]", alerta ? "text-red-100" : "text-zinc-400")}>
                {m.etiqueta}
              </div>
              <div className="font-mono text-[48px] font-bold tabular-nums leading-tight text-white">
                {formatearValor(m.magnitud, valor)}
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
