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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError, setAccessToken } from "@/lib/api/client";
import { cambiarPassword } from "@/lib/api/endpoints";
import { useApp } from "@/lib/store";

/** Same bounds as the backend (CambiarPasswordRequest). */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** Returns the reason a new password is not acceptable, or null. */
export function validarPasswordNueva(actual: string, nueva: string, repetida: string): string | null {
  if (nueva.length < PASSWORD_MIN) return `La contraseña nueva debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (nueva.length > PASSWORD_MAX) return `La contraseña nueva no puede superar ${PASSWORD_MAX} caracteres.`;
  if (nueva === actual) return "La contraseña nueva debe ser distinta de la actual.";
  if (nueva !== repetida) return "Las contraseñas nuevas no coinciden.";
  return null;
}

export function CambiarPassword() {
  const router = useRouter();
  const qc = useQueryClient();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [enviando, setEnviando] = useState(false);

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <KeyRoundIcon className="size-4" aria-hidden /> Cambiar contraseña
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="pw-actual" className="text-xs text-muted-foreground">
              Contraseña actual
            </Label>
            <Input
              id="pw-actual"
              type="password"
              autoComplete="current-password"
              required
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="pw-nueva" className="text-xs text-muted-foreground">
              Nueva (mínimo {PASSWORD_MIN} caracteres)
            </Label>
            <Input
              id="pw-nueva"
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="pw-repetir" className="text-xs text-muted-foreground">
              Repite la nueva
            </Label>
            <Input
              id="pw-repetir"
              type="password"
              autoComplete="new-password"
              required
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Cambiar contraseña"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Al cambiarla se cierran todas tus sesiones (también en otros equipos).
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
