"use client";

// Tiny 60-minute trend line for dashboard cards (no axes, no tooltip).

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { PuntoSerie } from "@/lib/use-serie";

export function Sparkline({
  data,
  color = "var(--chart-1)",
  height = 36,
}: {
  data: PuntoSerie[];
  color?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <div style={{ height }} className="w-full animate-pulse rounded bg-muted" />;
  }
  return (
    <div style={{ height }} className="w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={["auto", "auto"]} />
          <Line
            type="monotone"
            dataKey="valor"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
