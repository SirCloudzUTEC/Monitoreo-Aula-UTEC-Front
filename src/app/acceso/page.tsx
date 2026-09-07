// Institutional sign-in surface. Server component: reads real
// configuration and reports honestly what is pending. No password form —
// UTEC accounts authenticate through the institutional provider once
// IT confirms it (Google or Microsoft); we never collect credentials.

import Image from "next/image";
import Link from "next/link";
import { ShieldCheckIcon, UsersIcon, BellRingIcon } from "lucide-react";
import {
  DOMINIO_INSTITUCIONAL,
  proveedorIdentidadConfigurado,
} from "@/lib/auth/identity";

export const metadata = { title: "Acceso institucional — UTEC" };

export default function AccesoPage() {
  const configurado = proveedorIdentidadConfigurado();

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-md flex-col items-center justify-center gap-8 py-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/brand/utec-logo.png"
          alt="UTEC"
          width={120}
          height={57}
          priority
          className="h-12 w-auto dark:brightness-0 dark:invert"
        />
        <h1 className="text-2xl font-semibold">Campus Digital</h1>
        <p className="text-sm text-muted-foreground">
          Plataforma exclusiva para la comunidad UTEC. Solo cuentas
          institucionales <strong>@{DOMINIO_INSTITUCIONAL}</strong>.
        </p>
      </div>

      {configurado ? (
        <button
          type="button"
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Continuar con cuenta UTEC
        </button>
      ) : (
        <div className="w-full space-y-3">
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground"
          >
            Continuar con cuenta UTEC
          </button>
          <p className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-200">
            El inicio de sesión institucional está pendiente de configurar con
            TI de UTEC. Nunca escribas tu contraseña institucional fuera del
            portal oficial.
          </p>
        </div>
      )}

      <ul className="w-full space-y-3 text-left text-sm">
        <li className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Las cuentas nuevas quedan <strong>pendientes de aprobación</strong>{" "}
            por la administración antes de acceder a los datos.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <UsersIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Cada rol ve solo la información autorizada: comunidad, personal
            operativo y administración.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <BellRingIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Podrás reportar incidentes y recibir alertas del personal
            correspondiente.
          </span>
        </li>
      </ul>

      <Link
        href="/"
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Volver al panel de demostración
      </Link>
    </div>
  );
}
