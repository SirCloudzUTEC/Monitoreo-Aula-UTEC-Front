"use client";

// Dashboard card for one domain module (F1): per-classroom current value,
// 60-minute sparkline, traffic light and open-alert count. Links to /modulo/[id].

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/charts/sparkline";
import { ModuleIcon } from "@/components/modules/module-icon";
import { useSerie } from "@/lib/use-serie";
import { useApp, CODIGOS_AULA } from "@/lib/store";
import {
  CLASE_SEMAFORO,
  ETIQUETA_SEMAFORO,
  MODULOS,
  eventosDeModulo,
  peorSemaforo,
  semaforoModulo,
  type Semaforo,
} from "@/lib/modules";
import { formatearValor } from "@/lib/format";
import { claseEnCurso } from "@/lib/schedule";
import type { AulaCodigo, ModuloId } from "@/lib/types";
import { cn } from "@/lib/utils";

function FilaAula({
  aula,
  modulo,
  semaforo,
}: {
  aula: AulaCodigo;
  modulo: ModuloId;
  semaforo: Semaforo;
}) {
  const info = MODULOS[modulo];
  const valor = useApp((s) => s.valores[aula][info.principal]);
  const serie = useSerie(aula, info.principal, 60, 1);
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn("size-2.5 shrink-0 rounded-full", CLASE_SEMAFORO[semaforo])}
        title={ETIQUETA_SEMAFORO[semaforo]}
        aria-label={`${aula}: ${ETIQUETA_SEMAFORO[semaforo]}`}
      />
      <div className="w-16 shrink-0 text-xs text-muted-foreground">{aula}</div>
      <div className="w-24 shrink-0 font-mono text-sm font-semibold tabular-nums">
        {formatearValor(info.principal, valor)}
      </div>
      <div className="min-w-0 flex-1">
        <Sparkline data={serie} height={32} />
      </div>
    </div>
  );
}

export function ModuleCard({ modulo }: { modulo: ModuloId }) {
  const info = MODULOS[modulo];
  const abiertos = useApp((s) => s.abiertos);
  const valores = useApp((s) => s.valores);
  const umbrales = useApp((s) => s.umbrales);
  const horario = useApp((s) => s.horario);
  const simNowMs = useApp((s) => s.simNowMs);

  const fecha = new Date(simNowMs); // 0 before init: values are empty then anyway
  const semaforos = Object.fromEntries(
    CODIGOS_AULA.map((a) => [
      a,
      semaforoModulo(modulo, valores[a], umbrales, abiertos, a, claseEnCurso(horario, a, fecha)),
    ]),
  ) as Record<AulaCodigo, Semaforo>;
  const agregado = CODIGOS_AULA.map((a) => semaforos[a]).reduce(peorSemaforo, "verde");
  const nAlertas = eventosDeModulo(abiertos, modulo).length;

  return (
    <Link href={`/modulo/${modulo}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ModuleIcon modulo={modulo} className="size-4 text-muted-foreground" />
            {info.titulo}
            <span
              className={cn("ml-auto size-2.5 rounded-full", CLASE_SEMAFORO[agregado])}
              title={ETIQUETA_SEMAFORO[agregado]}
            />
            {nAlertas > 0 && (
              <Badge variant="destructive" className="tabular-nums">
                {nAlertas}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {CODIGOS_AULA.map((a) => (
            <FilaAula key={a} aula={a} modulo={modulo} semaforo={semaforos[a]} />
          ))}
        </CardContent>
      </Card>
    </Link>
  );
}
