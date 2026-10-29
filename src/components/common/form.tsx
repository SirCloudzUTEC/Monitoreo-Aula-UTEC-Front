"use client";

// Form pieces shared by the admin pages: a labelled field, a select driven by a
// value→label record, and the classroom / severity / role selects built on it.

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CODIGOS_AULA } from "@/lib/aulas";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/identity";
import { ETIQUETA_SEVERIDAD } from "@/lib/format";
import type { AulaCodigo, Severidad } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Small muted label above a control. */
export function Campo({
  id,
  label,
  className,
  children,
}: {
  id?: string;
  label: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Select whose options are the entries of `opciones` (value → label), in insertion order. */
export function SelectSimple<T extends string>({
  value,
  onChange,
  opciones,
  id,
  className = "w-36",
  ariaLabel,
  placeholder,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  opciones: Partial<Record<T, string>>;
  id?: string;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(opciones) as [T, string][]).map(([v, etiqueta]) => (
          <SelectItem key={v} value={v}>
            {etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** value → label record over a list where both are the same string. */
export const opcionesDe = <T extends string>(valores: readonly T[]) =>
  Object.fromEntries(valores.map((v) => [v, v as string])) as Record<T, string>;

const OPCIONES_AULA = opcionesDe(CODIGOS_AULA);
const TODAS_LAS_AULAS = { todas: "Todas las aulas", ...OPCIONES_AULA } as Record<FiltroAula, string>;
const TODA_SEVERIDAD = {
  todas: "Toda severidad",
  critico: ETIQUETA_SEVERIDAD.critico,
  alerta: ETIQUETA_SEVERIDAD.alerta,
  info: ETIQUETA_SEVERIDAD.info,
} as Record<FiltroSeveridad, string>;

export type FiltroAula = AulaCodigo | "todas";
export type FiltroSeveridad = Severidad | "todas";

/** "todas" → undefined, for API filters. */
export const sinTodas = <T extends string>(v: T | "todas"): T | undefined => (v === "todas" ? undefined : v);

export function AulaSelect({ value, onChange, id }: { value: AulaCodigo; onChange: (v: AulaCodigo) => void; id?: string }) {
  return <SelectSimple id={id} value={value} onChange={onChange} opciones={OPCIONES_AULA} />;
}

export function FiltroAulaSelect({ value, onChange }: { value: FiltroAula; onChange: (v: FiltroAula) => void }) {
  return <SelectSimple value={value} onChange={onChange} opciones={TODAS_LAS_AULAS} ariaLabel="Filtrar por aula" />;
}

export function FiltroSeveridadSelect({
  value,
  onChange,
}: {
  value: FiltroSeveridad;
  onChange: (v: FiltroSeveridad) => void;
}) {
  return (
    <SelectSimple
      value={value}
      onChange={onChange}
      opciones={TODA_SEVERIDAD}
      className="w-40"
      ariaLabel="Filtrar por severidad"
    />
  );
}

export function RolSelect({
  value,
  onChange,
  id,
  className,
}: {
  value: Rol;
  onChange: (v: Rol) => void;
  id: string;
  className: string;
}) {
  return <SelectSimple id={id} value={value} onChange={onChange} opciones={ETIQUETA_ROL} className={className} />;
}
