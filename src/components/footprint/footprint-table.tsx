"use client";

import { Fragment, useState } from "react";
import { ChevronRight, FileSearch } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge } from "@/components/common/severity-badge";
import { EmptyState } from "@/components/common/empty-state";
import type { Evento } from "@/domain/types";
import { formatFechaHora } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FootprintTable({ eventos }: { eventos: Evento[] }) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  if (eventos.length === 0) {
    return <EmptyState icon={FileSearch} title="Sin eventos para estos filtros" description="Ajusta el rango de fechas o los filtros seleccionados." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Fecha y hora</TableHead>
            <TableHead>Aula</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Severidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((evento) => {
            const expandido = expandidoId === evento.id;
            return (
              <Fragment key={evento.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandidoId(expandido ? null : evento.id)}
                >
                  <TableCell>
                    <ChevronRight className={cn("size-4 transition-transform", expandido && "rotate-90")} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatFechaHora(evento.timestamp)}</TableCell>
                  <TableCell className="font-medium">{evento.aulaId}</TableCell>
                  <TableCell className="max-w-xs truncate">{evento.mensaje}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{evento.actor.nombre}</TableCell>
                  <TableCell>
                    <SeverityBadge severidad={evento.severidad} />
                  </TableCell>
                </TableRow>
                {expandido ? (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={6}>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 py-2 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs text-muted-foreground">Codigo</dt>
                          <dd>{evento.codigo}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Tipo</dt>
                          <dd>{evento.tipo}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Actor</dt>
                          <dd>{evento.actor.tipo} — {evento.actor.nombre}</dd>
                        </div>
                        {evento.magnitud ? (
                          <div>
                            <dt className="text-xs text-muted-foreground">Magnitud</dt>
                            <dd>{evento.magnitud}</dd>
                          </div>
                        ) : null}
                        {evento.valorObservado !== undefined ? (
                          <div>
                            <dt className="text-xs text-muted-foreground">Valor observado</dt>
                            <dd>{evento.valorObservado}</dd>
                          </div>
                        ) : null}
                        <div className="col-span-full">
                          <dt className="text-xs text-muted-foreground">Mensaje</dt>
                          <dd>{evento.mensaje}</dd>
                        </div>
                      </dl>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
