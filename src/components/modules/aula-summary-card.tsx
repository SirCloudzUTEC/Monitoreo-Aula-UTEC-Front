"use client";

// Per-classroom summary at the top of the dashboard: state, current/next
// class, occupancy vs capacity and quick comfort readings.

import Link from "next/link";
import { CalendarClockIcon, MonitorIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAula } from "@/lib/aulas";
import { useEstados, useEventosAbiertos, useHorario, useUmbrales } from "@/lib/api/hooks";
import { bloqueEnCurso, minutosRestantes, proximoBloque, DIAS_SEMANA } from "@/lib/schedule";
import { CLASE_ESTADO, ETIQUETA_ESTADO, formatearValor, fechaHoraCorta } from "@/lib/format";
import { CLASE_FONDO_SEMAFORO, semaforoModulo } from "@/lib/modules";
import type { AulaCodigo, ModuloId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Módulo dueño de cada lectura rápida que se muestra en esta tarjeta. */
const MODULO_DE_MEDICION: Record<"temperatura" | "humedad" | "co2" | "ruido", ModuloId> = {
  temperatura: "confort",
  humedad: "confort",
  co2: "aire",
  ruido: "ruido",
};

export function AulaSummaryCard({ aula }: { aula: AulaCodigo }) {
  const { estados, valores: todos, nowMs: simNowMs } = useEstados();
  const estado = estados[aula];
  const valores = todos[aula];
  const { umbrales } = useUmbrales();
  const { abiertos } = useEventosAbiertos();
  const { horario } = useHorario();
  const spec = getAula(aula);

  const fecha = new Date(simNowMs); // 0 before init: values are empty then anyway
  const bloque = bloqueEnCurso(horario, aula, fecha);
  const proximo = proximoBloque(horario, aula, fecha);
  const ocupacion = typeof valores.ocupacion === "number" ? valores.ocupacion : 0;
  const enClase = bloque !== null;

  return (
    <Card className="glow-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Link href={`/aula/${aula}`} className="font-semibold hover:underline">
            {spec.nombre}
          </Link>
          <span
            className={cn("rounded-full px-3 py-0.5 text-sm font-medium", CLASE_ESTADO[estado])}
          >
            {ETIQUETA_ESTADO[estado]}
          </span>
          <a
            href={`/pantalla/${aula}`}
            target="_blank"
            rel="noopener"
            className="ml-auto text-muted-foreground hover:text-foreground"
            title="Abrir pantalla del aula (TV)"
          >
            <MonitorIcon className="size-5" aria-hidden />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-base">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClockIcon className="size-4 shrink-0" aria-hidden />
          {bloque ? (
            <span>
              <span className="font-medium text-foreground">{bloque.curso}</span> · termina en{" "}
              {minutosRestantes(horario, aula, fecha)} min
            </span>
          ) : proximo ? (
            <span>
              Próxima clase: <span className="font-medium text-foreground">{proximo.bloque.curso}</span>{" "}
              ({DIAS_SEMANA[proximo.bloque.dia]} {proximo.bloque.inicio},{" "}
              {fechaHoraCorta(proximo.inicia.getTime())})
            </span>
          ) : (
            <span>Sin clases programadas</span>
          )}
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <UsersIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-medium tabular-nums">
              {ocupacion} / {spec.aforo} personas
            </span>
            {ocupacion > spec.aforo && (
              <span className="text-sm font-semibold text-red-600">¡Aforo excedido!</span>
            )}
          </div>
          <Progress value={Math.min(100, (ocupacion / spec.aforo) * 100)} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {(["temperatura", "humedad", "co2", "ruido"] as const).map((m) => {
            const modulo = MODULO_DE_MEDICION[m];
            const semaforo = semaforoModulo(modulo, valores, umbrales, abiertos, aula, enClase);
            return (
              <Link
                key={m}
                href={`/modulo/${modulo}?aula=${aula}`}
                className={cn("rounded-lg p-3 transition-colors", CLASE_FONDO_SEMAFORO[semaforo])}
                title={
                  semaforo === "rojo"
                    ? "Con alerta: ver módulo"
                    : semaforo === "amarillo"
                      ? "Cerca del umbral: ver módulo"
                      : "Ver módulo"
                }
              >
                <div className="text-xs text-muted-foreground">
                  {m === "temperatura"
                    ? "Temperatura"
                    : m === "humedad"
                      ? "Humedad"
                      : m === "co2"
                        ? "CO₂"
                        : "Ruido"}
                </div>
                <div className="font-mono text-base font-semibold tabular-nums">
                  {formatearValor(m, valores[m])}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Link
            href={`/aula/${aula}`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Ver más →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
