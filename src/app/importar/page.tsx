"use client";

// F5 — import a floor plan (CSV points, DXF LINE/LWPOLYLINE, or JSON polygon),
// preview it over the classroom and save it for the /aula/[codigo] view.

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DownloadIcon, FileUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanoSvg, type PlanoImportado } from "@/components/plano/plano-svg";
import { PageHeader, SectionCard, Vacio } from "@/components/common/layout";
import { SelectSimple, opcionesDe } from "@/components/common/form";
import { parsePlano, PLANTILLA_CSV, PLANTILLA_JSON } from "@/lib/plano/import";
import { descargarArchivo, saveLocal } from "@/lib/data/storage";
import { mensajeDeError } from "@/lib/api/client";
import { useHabilitado } from "@/lib/api/hooks";
import { CODIGOS_AULA, getAula } from "@/lib/aulas";
import { useApp } from "@/lib/store";
import { useOnline } from "@/lib/use-online";
import type { AulaCodigo } from "@/lib/types";

const PLANTILLAS = [
  { archivo: "plantilla_plano.csv", contenido: PLANTILLA_CSV, tipo: "text/csv", etiqueta: "Plantilla CSV" },
  { archivo: "plantilla_plano.json", contenido: PLANTILLA_JSON, tipo: "application/json", etiqueta: "Plantilla JSON" },
];

const OPCIONES_AULA = opcionesDe(CODIGOS_AULA);

export default function ImportarPage() {
  const admin = useHabilitado("gestionar_dispositivos");
  const online = useOnline();
  const autorizar = useApp((s) => s.autorizar);
  const [aula, setAula] = useState<AulaCodigo>("L-419");
  const [plano, setPlano] = useState<Required<PlanoImportado> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onArchivo = async (file: File) => {
    try {
      const r = await parsePlano(file.name, await file.text());
      setPlano({ puntos: r.puntos, nombre: file.name, origen: r.origen });
      if (r.aviso) toast.info(r.aviso);
      toast.success(`Contorno leído: ${r.puntos.length} puntos (${r.origen.toUpperCase()}).`);
    } catch (e) {
      toast.error(mensajeDeError(e, "No se pudo leer el archivo."));
      setPlano(null);
    }
  };

  const guardar = async () => {
    if (!plano || !admin || !online || !(await autorizar("gestionar_dispositivos"))) return;
    saveLocal(`plano:${aula}`, plano);
    toast.success(`Plano guardado para ${aula}.`);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        icon={FileUpIcon}
        title="Importar plano"
        subtitle={
          <>
            Sube el contorno del aula como <strong>CSV</strong> (un punto “x,y” por línea, en metros),{" "}
            <strong>DXF</strong> (solo entidades LINE y LWPOLYLINE) o <strong>JSON</strong> (polígono). Se muestra
            una vista previa y puedes guardarlo para el plano del aula.
          </>
        }
      />

      <SectionCard title="1 · Elige aula y archivo" contentClassName="flex flex-wrap items-center gap-3">
        <SelectSimple
          value={aula}
          onChange={setAula}
          opciones={OPCIONES_AULA}
          className="w-32"
          ariaLabel="Aula destino"
        />
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.dxf,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onArchivo(f);
            e.target.value = "";
          }}
        />
        <Button onClick={() => inputRef.current?.click()}>Elegir archivo…</Button>
        <div className="ml-auto flex gap-2">
          {PLANTILLAS.map((p) => (
            <Button
              key={p.archivo}
              variant="outline"
              size="sm"
              onClick={() => descargarArchivo(p.archivo, p.contenido, p.tipo)}
            >
              <DownloadIcon className="size-4" aria-hidden /> {p.etiqueta}
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="2 · Vista previa" contentClassName="">
        {plano ? (
          <>
            <PlanoSvg aula={getAula(aula)} plano={plano} className="w-full" />
            <p className="mt-2 text-xs text-muted-foreground">
              {plano.nombre} · {plano.puntos.length} puntos · origen {plano.origen.toUpperCase()}
            </p>
          </>
        ) : (
          <Vacio>Aún no hay archivo cargado.</Vacio>
        )}
      </SectionCard>

      <div className="flex items-center gap-3">
        <Button onClick={guardar} disabled={!plano || !admin || !online}>
          Guardar plano para {aula}
        </Button>
        <Link href={`/aula/${aula}`} className="text-sm underline">
          Ver aula {aula}
        </Link>
      </div>
    </div>
  );
}
