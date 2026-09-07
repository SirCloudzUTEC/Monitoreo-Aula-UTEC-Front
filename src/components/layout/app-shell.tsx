"use client";

// App chrome: top bar (sim clock, speed, role) + responsive navigation.
// Mobile first: bottom tab bar on small screens, sidebar on md+.
// The TV view (/pantalla/*) renders without any chrome.

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  DoorOpenIcon,
  FileUpIcon,
  HouseIcon,
  MonitorIcon,
  ScrollTextIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useOnline } from "@/lib/use-online";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useApp, CODIGOS_AULA } from "@/lib/store";
import { horaLarga, ETIQUETA_ESTADO, CLASE_ESTADO } from "@/lib/format";

interface NavItem {
  href: string;
  etiqueta: string;
  icono: React.ComponentType<{ className?: string }>;
  /** show open-alert count badge */
  conAlertas?: boolean;
  /** hidden from the mobile tab bar (kept in sidebar) */
  soloDesktop?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", etiqueta: "Inicio", icono: HouseIcon },
  { href: "/asistente", etiqueta: "Asistente", icono: SparklesIcon },
  { href: "/alertas", etiqueta: "Alertas", icono: BellIcon, conAlertas: true },
  {
    href: "/aula/L-419",
    etiqueta: "Aula L-419",
    icono: DoorOpenIcon,
    soloDesktop: true,
  },
  {
    href: "/aula/A-1001",
    etiqueta: "Aula A-1001",
    icono: DoorOpenIcon,
    soloDesktop: true,
  },
  { href: "/log", etiqueta: "Log de eventos", icono: ScrollTextIcon },
  { href: "/simulador", etiqueta: "Simulador", icono: SlidersHorizontalIcon },
  {
    href: "/importar",
    etiqueta: "Importar plano",
    icono: FileUpIcon,
    soloDesktop: true,
  },
  { href: "/ajustes", etiqueta: "Ajustes", icono: Settings2Icon },
];

function activo(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const abiertos = useApp((s) => s.abiertos);
  const estados = useApp((s) => s.estados);
  const simNowMs = useApp((s) => s.simNowMs);
  const velocidad = useApp((s) => s.velocidad);
  const corriendo = useApp((s) => s.corriendo);
  const rol = useApp((s) => s.rol);

  if (pathname.startsWith("/pantalla")) return <>{children}</>;

  const sinAcuse = abiertos.filter((e) => !e.acuse).length;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src="/brand/utec-logo.png"
              alt="UTEC"
              width={72}
              height={34}
              priority
              className="h-7 w-auto dark:brightness-0 dark:invert"
            />
            <span className="hidden border-l pl-2 text-sm font-medium text-muted-foreground sm:inline">
              Campus Digital
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-sm">
            {CODIGOS_AULA.map((a) => (
              <Link
                key={a}
                href={`/aula/${a}`}
                className={cn(
                  "hidden rounded-full px-2.5 py-0.5 text-xs font-medium md:inline-block",
                  CLASE_ESTADO[estados[a]],
                )}
                title={`Estado de ${a}`}
              >
                {a}: {ETIQUETA_ESTADO[estados[a]]}
              </Link>
            ))}
            <Badge
              variant="outline"
              className="font-mono tabular-nums"
              title="Hora simulada (Lima)"
            >
              {simNowMs ? horaLarga(simNowMs) : "--:--:--"}
            </Badge>
            {(velocidad !== 1 || !corriendo) && (
              <Badge variant={corriendo ? "secondary" : "destructive"}>
                {corriendo ? `×${velocidad}` : "Pausado"}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="hidden capitalize sm:inline-flex"
              title="Rol activo"
            >
              {rol}
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div
        role="status"
        className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground"
      >
        {online
          ? "Demostración · datos simulados, sin sensores conectados"
          : "Sin conexión · solo lectura"}
      </div>
      <div className="flex flex-1">
        {/* sidebar (md+) */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 border-r md:block">
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  activo(pathname, item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icono className="size-4" aria-hidden />
                {item.etiqueta}
                {item.conAlertas && sinAcuse > 0 && (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                    {sinAcuse}
                  </span>
                )}
              </Link>
            ))}
            <a
              href={`/pantalla/${CODIGOS_AULA[0]}`}
              target="_blank"
              rel="noopener"
              className="mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MonitorIcon className="size-4" aria-hidden />
              Pantalla del aula ↗
            </a>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden">
        {NAV.filter((i) => !i.soloDesktop).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
              activo(pathname, item.href)
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            <item.icono className="size-5" aria-hidden />
            {item.etiqueta.split(" ")[0]}
            {item.conAlertas && sinAcuse > 0 && (
              <span className="absolute right-1/2 top-1 inline-flex min-w-4 -translate-y-0 translate-x-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                {sinAcuse}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
