"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DIAS_SEMANA } from "@/domain/constants";
import type { BloqueHorario, ConfiguracionAula } from "@/domain/types";

interface FilaHorario {
  dia: BloqueHorario["dia"];
  activo: boolean;
  inicio: string;
  fin: string;
}

function construirFilas(horario: BloqueHorario[]): FilaHorario[] {
  return (Array.from({ length: 7 }, (_, dia) => dia) as BloqueHorario["dia"][]).map((dia) => {
    const bloque = horario.find((b) => b.dia === dia);
    return { dia, activo: Boolean(bloque), inicio: bloque?.inicio ?? "08:00", fin: bloque?.fin ?? "18:00" };
  });
}

export function HorarioForm({
  configuracion,
  guardando,
  onGuardar,
}: {
  configuracion: ConfiguracionAula;
  guardando: boolean;
  onGuardar: (patch: Partial<ConfiguracionAula>) => Promise<void>;
}) {
  // Cada aula se renderiza en su propia pestaña con `aulaId` fijo, por lo que
  // este estado local solo necesita inicializarse una vez por instancia.
  const [filas, setFilas] = useState<FilaHorario[]>(() => construirFilas(configuracion.horario));

  const actualizarFila = (dia: FilaHorario["dia"], patch: Partial<FilaHorario>) => {
    setFilas((prev) => prev.map((f) => (f.dia === dia ? { ...f, ...patch } : f)));
  };

  const guardar = async () => {
    const horario: BloqueHorario[] = filas
      .filter((f) => f.activo)
      .map((f) => ({ dia: f.dia, inicio: f.inicio, fin: f.fin }));
    await onGuardar({ horario });
    toast.success(`Horario de ${configuracion.aulaId} actualizado.`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario de clases</CardTitle>
        <CardDescription>Define los dias y horas en que el aula esta programada para tener clase.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {filas.map((fila) => (
          <div key={fila.dia} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
            <Checkbox
              checked={fila.activo}
              onCheckedChange={(checked) => actualizarFila(fila.dia, { activo: checked === true })}
              aria-label={`Activar ${DIAS_SEMANA[fila.dia]}`}
            />
            <span className="text-sm font-medium">{DIAS_SEMANA[fila.dia]}</span>
            <Input
              type="time"
              value={fila.inicio}
              disabled={!fila.activo}
              onChange={(e) => actualizarFila(fila.dia, { inicio: e.target.value })}
              className="w-28"
            />
            <Input
              type="time"
              value={fila.fin}
              disabled={!fila.activo}
              onChange={(e) => actualizarFila(fila.dia, { fin: e.target.value })}
              className="w-28"
            />
          </div>
        ))}
        <Button type="button" className="w-fit gap-1.5" disabled={guardando} onClick={guardar}>
          <Save className="size-3.5" />
          {guardando ? "Guardando..." : "Guardar horario"}
        </Button>
      </CardContent>
    </Card>
  );
}
