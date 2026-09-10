"use client";

// One event/alert row, reused by /alertas and /modulo/[id]. Shows severity,
// catalog name, plain-language action and the acknowledge button (F2).

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import { useApp, estaEscalado } from "@/lib/store";
import { fechaHoraDeIso } from "@/lib/format";
import type { Evento, Severidad } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useOnline } from "@/lib/use-online";

const CLASE_SEVERIDAD: Record<Severidad, string> = {
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  alerta: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  critico: "bg-red-600 text-white",
};

export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  info: "Info",
  alerta: "Alerta",
  critico: "Crítico",
};

export function EventoCard({
  evento,
  abierta = false,
}: {
  evento: Evento;
  abierta?: boolean;
}) {
  const acusar = useApp((s) => s.acusar);
  const canWrite = useApp((s) => s.rol === "administrador");
  const online = useOnline();
  const simNowMs = useApp((s) => s.simNowMs);
  const cat = CATALOGO_EVENTOS[evento.tipo];
  const escalado = abierta && estaEscalado(evento, simNowMs);

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        escalado && "border-red-600 bg-red-50 dark:bg-red-950/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            CLASE_SEVERIDAD[evento.severidad],
          )}
        >
          {ETIQUETA_SEVERIDAD[evento.severidad]}
        </span>
        <span className="text-base font-medium">{cat.nombre}</span>
        <Badge variant="outline">{evento.aula}</Badge>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {fechaHoraDeIso(evento.ts)}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{cat.descripcion}</p>
      {(evento.valor || evento.umbral) && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {evento.valor && (
            <>
              Valor: <span className="font-mono">{evento.valor}</span>
            </>
          )}
          {evento.valor && evento.umbral && " · "}
          {evento.umbral && (
            <>
              Umbral: <span className="font-mono">{evento.umbral}</span>
            </>
          )}
        </p>
      )}
      {escalado && (
        <p className="mt-1 text-xs font-semibold text-red-700 dark:text-red-400">
          ⚠ Escalada: 10 minutos sin acuse. Contacta al responsable; en esta
          fase no se envía correo ni Telegram.
        </p>
      )}
      {abierta && (
        <div className="mt-2 flex items-center gap-2">
          {evento.acuse ? (
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              ✓ Acusado por {evento.acuse.actor} (
              {fechaHoraDeIso(evento.acuse.ts)})
            </span>
          ) : (
            <>
              <Button
                size="sm"
                disabled={!canWrite || !online}
                onClick={() => acusar(evento.aula, evento.id_evento)}
              >
                Acusar recibo
              </Button>
              <span className="text-xs text-muted-foreground">
                {cat.accion}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
