import Image from "next/image";
import { DOMINIO_INSTITUCIONAL } from "@/lib/auth/identity";
import { FormularioRegistro } from "@/app/acceso/formulario-registro";

export const metadata = { title: "Crear cuenta — UTEC" };

export default function RegistroPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-md flex-col items-center justify-center gap-6 py-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/brand/utec-logo.png"
          alt="UTEC"
          width={120}
          height={57}
          priority
          className="h-12 w-auto dark:brightness-0 dark:invert"
        />
        <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Solo cuentas institucionales <strong>@{DOMINIO_INSTITUCIONAL}</strong>.
        </p>
      </div>
      <FormularioRegistro />
    </div>
  );
}
