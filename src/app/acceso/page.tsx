// Institutional sign-in surface. The account is an app-specific
// email+password created by an administrator (never the user's real UTEC
// credential); authentication happens against the Spring Boot backend.

import { ShieldCheckIcon, UsersIcon, BellRingIcon } from "lucide-react";
import { DOMINIO_INSTITUCIONAL } from "@/lib/auth/identity";
import { LogoUtec } from "@/components/brand/logo-utec";
import { FormularioLogin } from "@/app/acceso/formulario-login";

export const metadata = { title: "Acceso institucional — UTEC" };

const PUNTOS = [
  {
    icono: ShieldCheckIcon,
    texto: "No hay registro abierto: un administrador crea tu cuenta y te entrega la contraseña.",
  },
  {
    icono: UsersIcon,
    texto: "Cada rol ve solo la información autorizada: comunidad, personal operativo y administración.",
  },
  {
    icono: BellRingIcon,
    texto: "Podrás reportar incidentes y recibir alertas del personal correspondiente.",
  },
];

export default function AccesoPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-md flex-col items-center justify-center gap-8 py-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <LogoUtec width={120} height={57} className="h-12 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight">Campus Digital</h1>
        <p className="text-base text-muted-foreground">
          Plataforma exclusiva para la comunidad UTEC. Solo cuentas
          institucionales <strong>@{DOMINIO_INSTITUCIONAL}</strong>.
        </p>
      </div>

      <FormularioLogin />

      <ul className="w-full space-y-3 text-left text-sm">
        {PUNTOS.map(({ icono: Icono, texto }) => (
          <li key={texto} className="flex items-start gap-3">
            <Icono className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
