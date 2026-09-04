"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AULA_IDS } from "@/domain/constants";
import type { FootprintFiltro } from "@/hooks/use-footprint";

const SEVERIDADES = ["todas", "info", "alerta", "critico"] as const;
const TIPOS = ["todos", "nominal", "fuera_de_nominal"] as const;

export function FootprintFilters({
  filtro,
  onChange,
}: {
  filtro: FootprintFiltro;
  onChange: (patch: Partial<FootprintFiltro>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-aula">Aula</Label>
        <Select value={filtro.aulaId ?? "todas"} onValueChange={(v) => onChange({ aulaId: v as FootprintFiltro["aulaId"] })}>
          <SelectTrigger id="fp-aula">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {AULA_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-desde">Desde</Label>
        <Input
          id="fp-desde"
          type="date"
          onChange={(e) => onChange({ desde: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-hasta">Hasta</Label>
        <Input
          id="fp-hasta"
          type="date"
          onChange={(e) =>
            onChange({ hasta: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined })
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-actor">Actor</Label>
        <Input id="fp-actor" placeholder="docente, sistema..." onChange={(e) => onChange({ actor: e.target.value || undefined })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-severidad">Severidad</Label>
        <Select value={filtro.severidad ?? "todas"} onValueChange={(v) => onChange({ severidad: v as FootprintFiltro["severidad"] })}>
          <SelectTrigger id="fp-severidad">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERIDADES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "todas" ? "Todas" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-tipo">Tipo</Label>
        <Select value={filtro.tipo ?? "todos"} onValueChange={(v) => onChange({ tipo: v as FootprintFiltro["tipo"] })}>
          <SelectTrigger id="fp-tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "todos" ? "Todos" : t.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
