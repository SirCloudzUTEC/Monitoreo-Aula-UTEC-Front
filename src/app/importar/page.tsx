"use client";

// F5 — import a floor plan (CSV points, DXF LINE/LWPOLYLINE, or JSON polygon),
// preview it over the classroom and save it for the /aula/[codigo] view.

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DownloadIcon, FileUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlanoSvg, type PlanoImportado } from "@/components/plano/plano-svg";
import { parsePlano, PLANTILLA_CSV, PLANTILLA_JSON, type ResultadoImport } from "@/lib/plano/import";
import { saveLocal } from "@/lib/data/storage";
import { getAula } from "@/lib/simulator/profiles";
import { CODIGOS_AULA } from "@/lib/store";
import type { AulaCodigo } from "@/lib/types";

function descargar(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportarPage() {
  const [aula, setAula] = useState<AulaCodigo>("L-419");
  const [resultado, setResultado] = useState<(ResultadoImport & { nombre: string }) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onArchivo = async (file: File) => {
    try {
      const texto = await file.text();
      const r = parsePlano(file.name, texto);
      setResultado({ ...r, nombre: file.name });
      if (r.aviso) toast.info(r.aviso);
      toast.success(`Contorno leído: ${r.puntos.length} puntos (${r.origen.toUpperCase()}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el archivo.");
      setResultado(null);
    }
  };

  const guardar = () => {
    if (!resultado) return;
    const plano: PlanoImportado = {
      puntos: resultado.puntos,
      nombre: resultado.nombre,
      origen: resultado.origen,
    };
    saveLocal(`plano:${aula}`, plano);
    toast.success(`Plano guardado para ${aula}.`);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <FileUpIcon className="size-6 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold">Importar plano</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Sube el contorno del aula como <strong>CSV</strong> (un punto “x,y” por línea, en metros),{" "}
        <strong>DXF</strong> (solo entidades LINE y LWPOLYLINE) o <strong>JSON</strong> (polígono).
        Se muestra una vista previa y puedes guardarlo para el plano del aula.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1 · Elige aula y archivo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={aula} onValueChange={(v) => setAula(v as AulaCodigo)}>
            <SelectTrigger className="w-32" aria-label="Aula destino">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODIGOS_AULA.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargar("plantilla_plano.csv", PLANTILLA_CSV, "text/csv")}
            >
              <DownloadIcon className="size-4" aria-hidden /> Plantilla CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargar("plantilla_plano.json", PLANTILLA_JSON, "application/json")}
            >
              <DownloadIcon className="size-4" aria-hidden /> Plantilla JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">2 · Vista previa</CardTitle>
        </CardHeader>
        <CardContent>
          {resultado ? (
            <>
              <PlanoSvg
                aula={getAula(aula)}
                plano={{ puntos: resultado.puntos, nombre: resultado.nombre, origen: resultado.origen }}
                className="w-full"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {resultado.nombre} · {resultado.puntos.length} puntos · origen{" "}
                {resultado.origen.toUpperCase()}
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay archivo cargado.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={guardar} disabled={!resultado}>
          Guardar plano para {aula}
        </Button>
        <Link href={`/aula/${aula}`} className="text-sm underline">
          Ver aula {aula}
        </Link>
      </div>
    </div>
  );
}
