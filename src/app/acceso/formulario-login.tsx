"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

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
    const res = await signIn("credenciales", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setEnviando(false);
    if (res?.error) {
      setError(
        "No se pudo iniciar sesión. Verifica tu correo y contraseña; si fallaste varias veces la cuenta puede estar bloqueada temporalmente.",
      );
      return;
    }
    router.push("/");
    router.refresh();
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
        ¿No tienes cuenta?{" "}
        <Link href="/acceso/registro" className="underline underline-offset-4">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
