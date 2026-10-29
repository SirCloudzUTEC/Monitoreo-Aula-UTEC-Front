"use client";

// Green box for a secret the backend returns exactly once (a generated account
// password, an MQTT credential): each value with a copy button, and an
// "Entendido" button that dismisses it for good.

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export async function copiar(texto: string, ok = "Copiado.") {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(ok);
  } catch {
    toast.error("No se pudo copiar. Selecciónala manualmente.");
  }
}

export function SecretoUnaVez({
  filas,
  mensajeCopiado,
  onCerrar,
  children,
}: {
  filas: { etiqueta?: string; valor: string }[];
  mensajeCopiado?: string;
  onCerrar: () => void;
  /** explanation above the values */
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-200">
      <p>{children}</p>
      <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1">
        {filas.map((f) => (
          <div key={f.valor} className="contents">
            <dt className="text-xs">{f.etiqueta}</dt>
            <dd>
              <code className="break-all rounded bg-background/60 px-2 py-1 font-mono text-sm">{f.valor}</code>
            </dd>
            <dd>
              <Button type="button" size="sm" variant="outline" onClick={() => void copiar(f.valor, mensajeCopiado)}>
                Copiar
              </Button>
            </dd>
          </div>
        ))}
      </dl>
      <Button type="button" size="sm" variant="ghost" onClick={onCerrar}>
        Entendido
      </Button>
    </div>
  );
}
