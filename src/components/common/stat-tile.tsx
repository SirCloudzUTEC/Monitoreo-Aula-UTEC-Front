import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tono = "normal" | "aviso" | "alerta";

const TONO_CLASS: Record<Tono, string> = {
  normal: "text-foreground",
  aviso: "text-amber-600 dark:text-amber-400",
  alerta: "text-red-600 dark:text-red-400",
};

export function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  tono = "normal",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  tono?: Tono;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className={cn("flex items-baseline gap-1 tabular-nums", TONO_CLASS[tono])}>
        <span className="text-2xl font-semibold sm:text-3xl">{value}</span>
        {unit ? <span className="text-sm font-normal text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  );
}
