"use client";

// Standalone full-page 3D twin view (kept as a deep link; the aula page now
// embeds the same viewer as its primary view).

import { use, useMemo } from "react";
import { notFound } from "next/navigation";
import aulasData from "@/data/aulas.json";
import type { Aula } from "@/lib/types";
import { TwinViewer } from "@/components/three/twin-viewer";

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

  if (!aula) notFound();

  return <TwinViewer aula={aula} className="h-[calc(100dvh-8.5rem)] min-h-105" />;
}
