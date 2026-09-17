"use client";

// 3D digital twin view (LOD 1): orbit the classroom shell and click sensor
// nodes to inspect them. Uses real aula dimensions and node positions.

import { use, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, RotateCcwIcon } from "lucide-react";
import aulasData from "@/data/aulas.json";
import type { Aula, NodoId } from "@/lib/types";
import { NODO_META } from "@/components/three/classroom-scene";

const ClassroomScene = dynamic(
  () => import("@/components/three/classroom-scene").then((m) => m.ClassroomScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Cargando aula 3D…
      </div>
    ),
  },
);

export default function Aula3DPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const aula = useMemo(
    () => (aulasData as Aula[]).find((a) => a.codigo === codigo),
    [codigo],
  );
  const [selected, setSelected] = useState<NodoId | null>(null);
  const [sceneKey, setSceneKey] = useState(0);

  if (!aula) notFound();

  const meta = selected ? NODO_META[selected] : null;

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-105 flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <Link
          href={`/aula/${aula.codigo}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {aula.nombre}
        </Link>
        <h1 className="text-lg font-semibold">Gemelo 3D</h1>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">
          Nivel 1: estructura y sensores
        </span>
        <button
          type="button"
          onClick={() => setSceneKey((k) => k + 1)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcwIcon className="size-3.5" aria-hidden />
          Reiniciar vista
        </button>
      </header>

      <div className="glow-border relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-[#0d1319]">
        <ClassroomScene
          key={sceneKey}
          aula={aula}
          selected={selected}
          onSelect={setSelected}
        />

        {meta && selected && (
          <aside className="absolute right-3 top-3 w-64 rounded-lg border bg-card/95 p-3 text-sm shadow-lg backdrop-blur">
            <h2 className="font-semibold">{meta.etiqueta}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{meta.descripcion}</p>
            <dl className="mt-2 space-y-0.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Posición</dt>
                <dd className="font-mono">
                  x {aula.posiciones[selected]?.x} m · y {aula.posiciones[selected]?.y} m
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Altura de montaje</dt>
                <dd className="font-mono">{meta.altura} m</dd>
              </div>
            </dl>
            <p className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
              Mediciones en vivo y zonas de peligro llegan en el nivel 3.
            </p>
          </aside>
        )}

        <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/55 px-2.5 py-1.5 text-[11px] text-white/85">
          Arrastra para orbitar · rueda para acercar · clic en un sensor para
          inspeccionarlo
        </p>
      </div>
    </div>
  );
}
