"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/common/severity-badge";
import type { Alerta } from "@/domain/types";
import { formatFechaHora, tiempoRelativo } from "@/lib/format";

export function AlertItem({ alerta, onAck }: { alerta: Alerta; onAck?: (id: string) => Promise<void> }) {
  const [enviando, setEnviando] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{alerta.aulaId}</span>
          <SeverityBadge severidad={alerta.severidad} />
        </div>
        <p className="text-sm">{alerta.mensaje}</p>
        <p className="text-xs text-muted-foreground">
          {formatFechaHora(alerta.timestamp)} · {tiempoRelativo(alerta.timestamp)}
          {alerta.estadoAcuse === "atendida" && alerta.atendidaPor ? ` · Atendida por ${alerta.atendidaPor}` : ""}
        </p>
      </div>
      {onAck && alerta.estadoAcuse === "pendiente" ? (
        <Button
          size="sm"
          variant="outline"
          className="w-fit gap-1.5"
          disabled={enviando}
          onClick={async () => {
            setEnviando(true);
            try {
              await onAck(alerta.id);
            } finally {
              setEnviando(false);
            }
          }}
        >
          <CheckCircle2 className="size-3.5" />
          {enviando ? "Marcando..." : "Marcar como atendida"}
        </Button>
      ) : null}
    </div>
  );
}
