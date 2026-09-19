import { cn } from "@/lib/utils";

/** Placeholder block for content that is still loading (keeps the layout from jumping). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** Table body placeholder: `filas` rows of `columnas` cells. */
function FilasSkeleton({ filas = 4, columnas = 4 }: { filas?: number; columnas?: number }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          {Array.from({ length: columnas }, (_, j) => (
            <Skeleton key={j} className={cn("h-5", j === 0 ? "w-1/4" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, FilasSkeleton };
