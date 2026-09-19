"use client";

// Listado completo de aulas — a donde lleva "Ver más aulas" del panel
// general cuando la selección manual o el tope de 4 ocultan el resto.

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AulaSummaryCard } from "@/components/modules/aula-summary-card";
import { CODIGOS_AULA } from "@/lib/aulas";

export default function TodasLasAulasPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden /> Volver al panel general
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Todas las aulas</h1>
        <p className="text-base text-muted-foreground">
          {CODIGOS_AULA.length} aula{CODIGOS_AULA.length === 1 ? "" : "s"} en el campus.
        </p>
      </div>
      <section className="grid gap-5 xl:grid-cols-2" aria-label="Todas las aulas">
        {CODIGOS_AULA.map((a) => (
          <AulaSummaryCard key={a} aula={a} />
        ))}
      </section>
    </div>
  );
}