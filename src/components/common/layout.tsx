// Page-level building blocks shared by every route: title row, section card,
// pill chip, empty/error states and the "sign in / not allowed" gate.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHabilitado } from "@/lib/api/hooks";
import type { Permiso } from "@/lib/auth/identity";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Page title with optional icon, subtitle line and right-aligned actions. */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** actions / badges next to the title */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        {Icon && <Icon className="size-7 text-primary" aria-hidden />}
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {children}
      </div>
      {subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Card with an icon + title header: the standard section of a settings/admin page. */
export function SectionCard({
  icon: Icon,
  title,
  className,
  contentClassName = "flex flex-col gap-4",
  children,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          {Icon && <Icon className="size-4" aria-hidden />} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

/** Rounded status pill; `clase` comes from one of the CLASE_* maps. */
export function Chip({ clase, className, children }: { clase: string; className?: string; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", clase, className)}>{children}</span>;
}

/** Centered muted message for an empty list. */
export function Vacio({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("py-8 text-center text-sm text-muted-foreground", className)}>{children}</p>;
}

export function AvisoError({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {children}
    </p>
  );
}

/** Info strip used for read-only / loading notes inside a section. */
export function Nota({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{children}</p>;
}

/**
 * Renders `children` only for an account holding `permiso`; otherwise a sign-in link (no session)
 * or `mensaje` (session without the permission).
 */
export function AccesoRequerido({
  permiso,
  mensaje,
  children,
}: {
  permiso: Permiso;
  mensaje: string;
  children: React.ReactNode;
}) {
  const cuenta = useApp((s) => s.cuenta);
  const habilitado = useHabilitado(permiso);
  if (habilitado) return children;
  return (
    <div className="mx-auto max-w-lg py-8 text-center text-sm text-muted-foreground">
      {cuenta ? (
        mensaje
      ) : (
        <>
          No hay una sesión activa.{" "}
          <Link href="/acceso" className="underline">
            Inicia sesión
          </Link>
          .
        </>
      )}
    </div>
  );
}
