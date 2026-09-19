"use client";

// Admin-only user management. There is no self-registration anymore: a
// superusuario is the only one who can create an account, and does so by
// picking the new account's email and role — the server generates the
// password and returns it once so it can be handed to that person.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserPlusIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { puede, type Rol } from "@/lib/auth/identity";

const ETIQUETA_ROL: Record<Rol, string> = {
  miembro: "Usuario (solo visualización)",
  admin_operativo: "Administrador (aulas y planos)",
  superadmin: "Superusuario (gestión de usuarios)",
};

interface UsuarioFila {
  email: string;
  nombre: string;
  rol: Rol;
  estado: string;
  creado_en: string;
}

export default function UsuariosPage() {
  const cuenta = useApp((s) => s.cuenta);
  const autorizado = cuenta ? puede(cuenta, "gestionar_usuarios") : false;

  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol>("miembro");
  const [enviando, setEnviando] = useState(false);
  const [creada, setCreada] = useState<{ email: string; password: string } | null>(
    null,
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/usuarios").catch(() => null);
    const data = (await res?.json().catch(() => null)) as
      | { usuarios?: UsuarioFila[] }
      | null;
    setUsuarios(data?.usuarios ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (autorizado) void cargar();
  }, [autorizado, cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), email: email.trim().toLowerCase(), rol }),
    }).catch(() => null);
    setEnviando(false);
    if (!res) {
      toast.error("Sin conexión: no se creó la cuenta.");
      return;
    }
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; email?: string; password?: string; error?: string }
      | null;
    if (!res.ok || !data?.ok || !data.password) {
      toast.error(data?.error ?? "No se pudo crear la cuenta.");
      return;
    }
    setCreada({ email: data.email ?? email, password: data.password });
    setNombre("");
    setEmail("");
    setRol("miembro");
    void cargar();
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Contraseña copiada.");
    } catch {
      toast.error("No se pudo copiar. Selecciónala manualmente.");
    }
  };

  if (!cuenta) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center text-sm text-muted-foreground">
        No hay una sesión activa.{" "}
        <Link href="/acceso" className="underline">
          Inicia sesión
        </Link>
        .
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center text-sm text-muted-foreground">
        Solo una cuenta superusuario puede gestionar usuarios.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <UsersIcon className="size-7 text-primary" aria-hidden />
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Usuarios</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserPlusIcon className="size-4" aria-hidden /> Crear cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {creada && (
            <div className="space-y-2 rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p>
                Cuenta creada para <strong>{creada.email}</strong>. Entrégale esta
                contraseña por un canal seguro; no se volverá a mostrar.
              </p>
              <div className="flex items-center gap-2">
                <code className="rounded bg-background/60 px-2 py-1 font-mono text-sm">
                  {creada.password}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copiar(creada.password)}
                >
                  Copiar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreada(null)}
                >
                  Entendido
                </Button>
              </div>
            </div>
          )}
          <form onSubmit={crear} className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="nuevo-nombre" className="text-xs text-muted-foreground">
                Nombre completo
              </Label>
              <Input
                id="nuevo-nombre"
                required
                maxLength={120}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="nuevo-email" className="text-xs text-muted-foreground">
                Correo institucional
              </Label>
              <Input
                id="nuevo-email"
                type="email"
                required
                placeholder="nombre.apellido@utec.edu.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="nuevo-rol" className="text-xs text-muted-foreground">
                Rol
              </Label>
              <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
                <SelectTrigger id="nuevo-rol" className="w-full sm:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ETIQUETA_ROL) as Rol[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ETIQUETA_ROL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={enviando}>
                {enviando ? "Creando…" : "Crear cuenta y generar contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Cuentas existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay cuentas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell className="font-mono text-xs">{u.email}</TableCell>
                    <TableCell>{u.nombre || "—"}</TableCell>
                    <TableCell>{ETIQUETA_ROL[u.rol] ?? u.rol}</TableCell>
                    <TableCell className="capitalize">{u.estado}</TableCell>
                    <TableCell>
                      {new Date(u.creado_en).toLocaleDateString("es-PE")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
