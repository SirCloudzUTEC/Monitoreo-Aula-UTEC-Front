"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function FormularioRegistro() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ pendiente: boolean } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    const res = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    }).catch(() => null);
    setEnviando(false);
    if (!res) {
      setError("Sin conexión. Inténtalo de nuevo.");
      return;
    }
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; pendiente?: boolean; error?: string }
      | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "No se pudo crear la cuenta.");
      return;
    }
    setListo({ pendiente: Boolean(data.pendiente) });
  };

  if (listo) {
    return (
      <div className="w-full space-y-4 text-center">
        <p className="rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-200">
          Cuenta creada.{" "}
          {listo.pendiente
            ? "Queda pendiente de aprobación por la administración antes de poder usar la plataforma."
            : "Ya puedes iniciar sesión."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/acceso")}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3 text-left">
      <div className="space-y-1">
        <label htmlFor="reg-nombre" className="text-xs font-medium text-muted-foreground">
          Nombre completo
        </label>
        <input
          id="reg-nombre"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="reg-email" className="text-xs font-medium text-muted-foreground">
          Correo institucional
        </label>
        <input
          id="reg-email"
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
        <label htmlFor="reg-password" className="text-xs font-medium text-muted-foreground">
          Contraseña (mínimo 10 caracteres)
        </label>
        <input
          id="reg-password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="reg-password-2" className="text-xs font-medium text-muted-foreground">
          Confirmar contraseña
        </label>
        <input
          id="reg-password-2"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Usa una contraseña nueva, distinta de tu contraseña institucional de UTEC.
        Esta solo abre esta app.
      </p>
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
        {enviando ? "Creando…" : "Crear cuenta"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/acceso" className="underline underline-offset-4">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
