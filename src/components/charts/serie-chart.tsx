"use client";

// Full chart for the module detail view: time axis, tooltip, threshold
// reference lines and anomaly markers (F9).

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Magnitud, Umbrales } from "@/lib/types";
import type { PuntoSerieApi as PuntoSerie } from "@/lib/api/endpoints";
import { detectarAnomalias, type PuntoAnomalo } from "@/lib/anomaly/detector";
import { horaCorta, fechaHoraCorta, formatearValor } from "@/lib/format";
import { lineasUmbral } from "@/lib/umbrales";
import { UNIDADES } from "@/lib/units";

const ETIQUETA_SERIE: Record<string, string> = { anomalia: "Anomalía" };
const etiquetaTooltip = (t: unknown) => fechaHoraCorta(Number(t));

interface Punto extends PuntoSerie {
  anomalia?: number; // y-value duplicated when the point is anomalous
  explicacion?: string;
}

export function SerieChart({
  data,
  magnitud,
  umbrales,
  height = 240,
  conAnomalias = true,
}: {
  data: PuntoSerie[];
  magnitud: Magnitud;
  umbrales: Umbrales;
  height?: number;
  conAnomalias?: boolean;
}) {
  const { puntos, anomalias } = useMemo(() => {
    const anomalias: PuntoAnomalo[] = conAnomalias
      ? detectarAnomalias(
          data.map((p) => p.valor),
          magnitud,
        )
      : [];
    const porIndice = new Map(anomalias.map((a) => [a.index, a]));
    const puntos: Punto[] = data.map((p, i) => {
      const a = porIndice.get(i);
      return a ? { ...p, anomalia: p.valor, explicacion: a.explicacion } : p;
    });
    return { puntos, anomalias };
  }, [data, magnitud, conAnomalias]);

  if (data.length === 0) {
    return <div style={{ height }} className="w-full animate-pulse rounded-lg bg-muted" />;
  }

  const largo = data[data.length - 1].t - data[0].t > 26 * 3600_000;
  const lineas = lineasUmbral(magnitud, umbrales);

  return (
    <div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={puntos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) => (largo ? fechaHoraCorta(t) : horaCorta(t))}
              tick={{ fontSize: 11 }}
              minTickGap={40}
            />
            <YAxis
              width={48}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              unit={UNIDADES[magnitud] ? ` ${UNIDADES[magnitud]}` : ""}
            />
            <Tooltip
              labelFormatter={etiquetaTooltip}
              formatter={(v, nombre) => [formatearValor(magnitud, Number(v)), ETIQUETA_SERIE[String(nombre)] ?? "Valor"]}
            />
            {lineas.map((l) => (
              <ReferenceLine
                key={l.etiqueta}
                y={l.valor}
                stroke={l.color ?? "#f59e0b"}
                strokeDasharray="6 4"
                label={{ value: l.etiqueta, fontSize: 10, position: "insideTopRight" }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="valor"
              stroke="var(--chart-1)"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
            {conAnomalias && (
              <Scatter dataKey="anomalia" fill="#dc2626" isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {conAnomalias && anomalias.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {anomalias.slice(-3).map((a) => (
            <li key={a.index} className="flex items-start gap-1.5">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-600" aria-hidden />
              <span>
                {puntos[a.index] ? `${fechaHoraCorta(puntos[a.index].t)}: ` : ""}
                {a.explicacion}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
