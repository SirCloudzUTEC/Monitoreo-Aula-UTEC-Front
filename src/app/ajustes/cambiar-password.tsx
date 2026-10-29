"use client";

// Change the signed-in account's password (`POST /api/auth/password`). New accounts are created
// with a random password an administrator hands over, so this is the first thing a person should do.
// The backend revokes every session on success, so the user has to sign in again.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/common/layout";
import { Campo } from "@/components/common/form";
import { mensajeDeError, setAccessToken } from "@/lib/api/client";
import { cambiarPassword } from "@/lib/api/endpoints";
import { PASSWORD_MAX, PASSWORD_MIN, validarPasswordNueva } from "@/lib/auth/identity";
import { useApp } from "@/lib/store";

type Clave = "actual" | "nueva" | "repetida";

const CAMPOS: { clave: Clave; label: string; props: React.ComponentProps<"input"> }[] = [
  { clave: "actual", label: "Contraseña actual", props: { autoComplete: "current-password" } },
  {
    clave: "nueva",
    label: `Nueva (mínimo ${PASSWORD_MIN} caracteres)`,
    props: { autoComplete: "new-password", minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX },
  },
  { clave: "repetida", label: "Repite la nueva", props: { autoComplete: "new-password" } },
];

const VACIO: Record<Clave, string> = { actual: "", nueva: "", repetida: "" };

export function CambiarPassword() {
  const router = useRouter();
  const qc = useQueryClient();
  const [valores, setValores] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const { actual, nueva, repetida } = valores;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = validarPasswordNueva(actual, nueva, repetida);
    if (problema) {
      toast.error(problema);
      return;
    }
    setEnviando(true);
    try {
      await cambiarPassword(actual, nueva);
    } catch (err) {
      toast.error(mensajeDeError(err, "No se pudo cambiar la contraseña."));
      setEnviando(false);
      return;
    }
    // every session (this one too) was revoked by the backend
    setAccessToken(null);
    useApp.getState().setCuenta(null);
    qc.clear();
    toast.success("Contraseña actualizada. Inicia sesión de nuevo con la nueva.");
    router.replace("/acceso");
  };

  return (
    <SectionCard icon={KeyRoundIcon} title="Cambiar contraseña" contentClassName="">
      <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-3">
        {CAMPOS.map((c) => (
          <Campo key={c.clave} id={`pw-${c.clave}`} label={c.label}>
            <Input
              id={`pw-${c.clave}`}
              type="password"
              required
              {...c.props}
              value={valores[c.clave]}
              onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value }))}
            />
          </Campo>
        ))}
        <div className="sm:col-span-3">
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : "Cambiar contraseña"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Al cambiarla se cierran todas tus sesiones (también en otros equipos).
          </p>
        </div>
      </form>
    </SectionCard>
  );
}
