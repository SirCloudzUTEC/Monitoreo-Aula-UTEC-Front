"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SeverityBadge } from "@/components/common/severity-badge";
import { useAlertas } from "@/data/store/simulation-store";
import { tiempoRelativo } from "@/lib/format";

export function NotificationsBell() {
  const alertas = useAlertas();
  const pendientes = alertas.filter((a) => a.estadoAcuse === "pendiente").sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            {pendientes.length > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
                {pendientes.length > 9 ? "9+" : pendientes.length}
              </span>
            ) : null}
            <span className="sr-only">Notificaciones</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Alertas pendientes ({pendientes.length})</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pendientes.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Sin alertas pendientes.</p>
        ) : (
          pendientes.slice(0, 5).map((alerta) => (
            <DropdownMenuItem
              key={alerta.id}
              className="flex-col items-start gap-1 whitespace-normal"
              render={
                <Link href="/alertas">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{alerta.aulaId}</span>
                    <SeverityBadge severidad={alerta.severidad} />
                  </div>
                  <p className="text-sm leading-snug">{alerta.mensaje}</p>
                  <span className="text-xs text-muted-foreground">{tiempoRelativo(alerta.timestamp)}</span>
                </Link>
              }
            />
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/alertas" className="justify-center text-sm font-medium">
              Ver centro de alertas
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
