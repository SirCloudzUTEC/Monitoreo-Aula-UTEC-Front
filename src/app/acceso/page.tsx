// Institutional sign-in surface. Server component: reads real
// configuration and reports honestly what is pending. Primary path is an
// app-specific email+password account (never the user's real UTEC
// credential); Google appears too once a client ID/secret is configured.

import Image from "next/image";
import Link from "next/link";
import { ShieldCheckIcon, UsersIcon, BellRingIcon } from "lucide-react";
import {
  DOMINIO_INSTITUCIONAL,
  proveedorIdentidadConfigurado,
} from "@/lib/auth/identity";
import { BotonGoogle } from "@/app/acceso/boton-google";
import { FormularioLogin } from "@/app/acceso/formulario-login";

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
        <h1 className="text-3xl font-bold tracking-tight">Campus Digital</h1>
        <p className="text-base text-muted-foreground">
          Plataforma exclusiva para la comunidad UTEC. Solo cuentas
          institucionales <strong>@{DOMINIO_INSTITUCIONAL}</strong>.
        </p>
      </div>

      <FormularioLogin />

      {configurado && (
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            o
            <span className="h-px flex-1 bg-border" />
          </div>
          <BotonGoogle />
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
