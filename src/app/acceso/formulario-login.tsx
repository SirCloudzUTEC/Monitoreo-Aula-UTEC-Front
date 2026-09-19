"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/endpoints";
import { destinoSeguro } from "@/lib/api/session";

export function FormularioLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const cuenta = await login(email.trim().toLowerCase(), password);
      useApp.getState().setCuenta(cuenta);
      router.replace(destinoSeguro(new URLSearchParams(window.location.search).get("next")));
    } catch (err) {
      setError(
        err instanceof ApiError && err.sinConexion
          ? "No se pudo contactar al servidor. Revisa tu conexión e inténtalo de nuevo."
          : err instanceof ApiError && err.status === 429
            ? "Demasiados intentos. Espera unos minutos antes de volver a intentarlo."
            : "No se pudo iniciar sesión. Verifica tu correo y contraseña; si fallaste varias veces la cuenta puede estar bloqueada temporalmente.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full space-y-3 text-left">
      <div className="space-y-1">
        <label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">
          Correo institucional
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre.apellido@utec.edu.pe"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          required
          minLength={10}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Iniciar sesión"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        ¿No tienes cuenta? Pídele a un administrador que te cree una.
      </p>
    </form>
  );
}
