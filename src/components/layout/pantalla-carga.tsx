import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the session is being restored (refresh → me). It mimics the app chrome so the
 * page appears to be there already instead of a blank "Cargando…".
 */
export function PantallaCarga() {
  return (
    <div role="status" className="flex min-h-dvh flex-col">
      <span className="sr-only">Cargando…</span>
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="ml-auto h-6 w-24 rounded-full" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 flex-col gap-2 border-r p-3 md:flex">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <div className="grid gap-5 xl:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </main>
      </div>
    </div>
  );
}
