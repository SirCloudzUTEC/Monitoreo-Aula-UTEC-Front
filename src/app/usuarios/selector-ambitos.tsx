"use client";

import { AMBITOS, type Ambito } from "@/lib/auth/identity";
import { ETIQUETA_AMBITO } from "@/lib/incidents/catalog";
import { cn } from "@/lib/utils";

/**
 * Scopes an operational admin handles incidents for. Without at least one an admin can neither
 * see nor attend any report, so the forms that assign the role require it.
 */
export function SelectorAmbitos({
  valor,
  onChange,
  disabled,
}: {
  valor: Ambito[];
  onChange: (v: Ambito[]) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="Ámbitos" className="flex flex-wrap gap-2">
      {AMBITOS.map((a) => {
        const activo = valor.includes(a);
        return (
          <label
            key={a}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
              activo ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="checkbox"
              className="size-3.5 accent-[var(--primary)]"
              checked={activo}
              disabled={disabled}
              onChange={() => onChange(activo ? valor.filter((x) => x !== a) : [...valor, a])}
            />
            {ETIQUETA_AMBITO[a]}
          </label>
        );
      })}
    </div>
  );
}
