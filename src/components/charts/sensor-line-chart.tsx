"use client";

import { Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useSerieHistorica } from "@/data/store/simulation-store";
import type { Magnitud } from "@/domain/enums";
import type { AulaId } from "@/domain/types";
import { formatHora } from "@/lib/format";

const chartConfig = {
  valor: { label: "Valor", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SensorLineChart({
  aulaId,
  magnitud,
  unidad,
  umbralMax,
  umbralMin,
}: {
  aulaId: AulaId;
  magnitud: Magnitud;
  unidad: string;
  umbralMax?: number;
  umbralMin?: number;
}) {
  const serie = useSerieHistorica(aulaId, magnitud);
  const data = serie.map((lectura) => ({
    hora: formatHora(lectura.timestamp),
    valor: Number(lectura.valor.toFixed(2)),
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-48 w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <XAxis dataKey="hora" tickLine={false} axisLine={false} minTickGap={32} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          unit={unidad ? ` ${unidad}` : undefined}
          domain={["auto", "auto"]}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        {umbralMax !== undefined ? (
          <ReferenceLine y={umbralMax} stroke="var(--color-destructive)" strokeDasharray="4 4" />
        ) : null}
        {umbralMin !== undefined ? (
          <ReferenceLine y={umbralMin} stroke="var(--color-destructive)" strokeDasharray="4 4" />
        ) : null}
        <Line type="monotone" dataKey="valor" stroke="var(--color-valor)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}
