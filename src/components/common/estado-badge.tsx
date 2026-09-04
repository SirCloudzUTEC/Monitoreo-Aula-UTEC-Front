import { cn } from "@/lib/utils";
import { ESTADO_AULA_META } from "@/lib/colors";
import type { EstadoAula } from "@/domain/enums";

export function EstadoAulaBadge({ estado, className }: { estado: EstadoAula; className?: string }) {
  const meta = ESTADO_AULA_META[estado];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", meta.badgeClass, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} aria-hidden />
      {meta.label}
    </span>
  );
}
