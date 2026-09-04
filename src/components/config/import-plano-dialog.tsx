"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileUp, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ConfiguracionAula } from "@/domain/types";
import { formatFechaHora } from "@/lib/format";

export function ImportPlanoDialog({
  configuracion,
  importando,
  onImportar,
}: {
  configuracion: ConfiguracionAula;
  importando: boolean;
  onImportar: (file: File) => Promise<{ ok: boolean; mensaje: string; sensoresDetectados?: number }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const handleFile = async (file: File) => {
    setResultado(null);
    const res = await onImportar(file);
    setResultado(res);
    if (res.ok) toast.success(res.mensaje);
    else toast.error(res.mensaje);
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          <Button variant="outline" className="w-fit gap-1.5">
            <UploadCloud className="size-3.5" />
            Importar plano CAD / CSV
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar plano de {configuracion.aulaId}</DialogTitle>
          <DialogDescription>
            Sube un archivo .dxf (plano CAD) o .csv con dimensiones, aforo y posiciones de sensores del aula.
          </DialogDescription>
        </DialogHeader>

        {configuracion.planoImportado ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-medium">{configuracion.planoImportado.nombreArchivo}</p>
              <p className="text-xs text-muted-foreground">
                Importado {formatFechaHora(configuracion.planoImportado.importadoEn)}
                {configuracion.planoImportado.sensoresDetectados !== undefined
                  ? ` · ${configuracion.planoImportado.sensoresDetectados} sensores detectados`
                  : ""}
              </p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center hover:bg-muted/40"
          disabled={importando}
        >
          <FileUp className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Click para elegir un archivo .dxf o .csv</p>
          <p className="text-xs text-muted-foreground">Este entorno de demostracion no procesa el contenido real del plano.</p>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".dxf,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {importando ? <Progress value={66} className="animate-pulse" /> : null}
        {resultado && !importando ? (
          <p className={resultado.ok ? "text-sm text-emerald-600 dark:text-emerald-400" : "text-sm text-red-600 dark:text-red-400"}>
            {resultado.mensaje}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
