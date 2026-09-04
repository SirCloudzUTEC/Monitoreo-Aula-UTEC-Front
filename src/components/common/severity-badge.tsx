import { cn } from "@/lib/utils";
import { SEVERIDAD_META } from "@/lib/colors";
import type { Severidad } from "@/domain/enums";

export function SeverityBadge({ severidad, className }: { severidad: Severidad; className?: string }) {
  const meta = SEVERIDAD_META[severidad];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", meta.badgeClass, className)}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}
