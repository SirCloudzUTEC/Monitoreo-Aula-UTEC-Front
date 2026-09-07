"use client";

// F4 — 2D floor plan drawn as SVG from the classroom spec (positions in
// meters). If an imported outline exists (F5, localStorage), it replaces the
// default rectangle.

import type { Aula, PosicionPlano } from "@/lib/types";

export interface PlanoImportado {
  /** outline vertices in meters */
  puntos: PosicionPlano[];
  nombre?: string;
  origen?: string; // "csv" | "dxf" | "json"
}

const S = 48; // px per meter
const M = 24; // margin px

function px(p: PosicionPlano): { x: number; y: number } {
  return { x: M + p.x * S, y: M + p.y * S };
}

export function PlanoSvg({
  aula,
  plano,
  className,
}: {
  aula: Aula;
  plano?: PlanoImportado | null;
  className?: string;
}) {
  const ancho = M * 2 + aula.largo * S;
  const alto = M * 2 + aula.ancho * S;
  const pos = aula.posiciones;

  const nodos = aula.nodos.filter((n) => pos[n]);
  const ventanas = Object.keys(pos).filter((k) => k.startsWith("ventana"));
  const comps = aula.componentes.filter((c) => c.pos);

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      className={className}
      role="img"
      aria-label={`Plano 2D de ${aula.nombre}`}
    >
      {/* room outline: imported polygon or spec rectangle */}
      {plano && plano.puntos.length >= 3 ? (
        <polygon
          points={plano.puntos.map((p) => `${px(p).x},${px(p).y}`).join(" ")}
          fill="var(--muted)"
          stroke="var(--foreground)"
          strokeWidth={2.5}
        />
      ) : (
        <rect
          x={M}
          y={M}
          width={aula.largo * S}
          height={aula.ancho * S}
          fill="var(--muted)"
          stroke="var(--foreground)"
          strokeWidth={2.5}
          rx={4}
        />
      )}

      {/* door (gap on the wall) */}
      {pos.puerta && (
        <g>
          <rect
            x={px(pos.puerta).x - 4}
            y={px(pos.puerta).y - 22}
            width={8}
            height={44}
            fill="#b45309"
            rx={2}
          />
          <text x={px(pos.puerta).x + 10} y={px(pos.puerta).y + 4} fontSize={11} fill="currentColor">
            Puerta
          </text>
        </g>
      )}

      {/* windows along the top wall */}
      {ventanas.map((v) => (
        <g key={v}>
          <rect
            x={px(pos[v]).x}
            y={px(pos[v]).y - 4}
            width={S}
            height={8}
            fill="#0284c7"
            rx={2}
          />
          <text x={px(pos[v]).x} y={px(pos[v]).y + 18} fontSize={11} fill="currentColor">
            {v === "ventana1" ? "Ventana 1" : "Ventana 2"}
          </text>
        </g>
      ))}

      {/* fixed components */}
      {comps.map((c) => (
        <g key={c.id}>
          <rect
            x={px(c.pos!).x - 8}
            y={px(c.pos!).y - 8}
            width={16}
            height={16}
            fill="var(--muted-foreground)"
            opacity={0.6}
            rx={3}
          />
          <text
            x={px(c.pos!).x}
            y={px(c.pos!).y - 12}
            fontSize={10}
            textAnchor="middle"
            fill="currentColor"
            opacity={0.8}
          >
            {c.nombre}
          </text>
        </g>
      ))}

      {/* sensor nodes */}
      {nodos.map((n) => (
        <g key={n}>
          <circle
            cx={px(pos[n]).x}
            cy={px(pos[n]).y}
            r={9}
            fill={n === "procesadorAula" ? "#7c3aed" : "#059669"}
            stroke="white"
            strokeWidth={2}
          />
          <text
            x={px(pos[n]).x}
            y={px(pos[n]).y + 22}
            fontSize={11}
            fontWeight={600}
            textAnchor="middle"
            fill="currentColor"
          >
            {n}
          </text>
        </g>
      ))}

      {/* scale reference */}
      <g>
        <line
          x1={M}
          y1={alto - 8}
          x2={M + S}
          y2={alto - 8}
          stroke="currentColor"
          strokeWidth={2}
        />
        <text x={M + S + 6} y={alto - 5} fontSize={10} fill="currentColor">
          1 m
        </text>
      </g>
    </svg>
  );
}
