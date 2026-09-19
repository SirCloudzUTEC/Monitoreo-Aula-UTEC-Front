"use client";

// Admin-only user management. There is no self-registration: a superusuario
// is the only one who can create an account, and does so by picking the new
// account's email and role — the backend generates the password and returns it
// once so it can be handed to that person. Existing accounts can be suspended,
// re-roled or given a fresh password (all of which revoke their sessions).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useHabilitado } from "@/lib/api/hooks";
import {
  cambiarRol,
  crearUsuario,
  listarUsuarios,
  restablecerPassword,
  suspenderUsuario,
} from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
import { puede, type Rol } from "@/lib/auth/identity";

const ETIQUETA_ROL: Record<Rol, string> = {
  miembro: "Usuario (solo visualización)",
  admin_operativo: "Administrador (aulas y planos)",
  superadmin: "Superusuario (gestión de usuarios)",
};

export default function UsuariosPage() {
  const cuenta = useApp((s) => s.cuenta);
  const autorizado = cuenta ? puede(cuenta, "gestionar_usuarios") : false;
  const habilitado = useHabilitado("gestionar_usuarios");
  const qc = useQueryClient();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol>("miembro");
  const [creada, setCreada] = useState<{ email: string; password: string } | null>(
    null,
  );

  const lista = useQuery({
    queryKey: ["usuarios"],
    queryFn: listarUsuarios,
    enabled: habilitado,
  });
  const usuarios = lista.data ?? [];
  const cargando = lista.isPending && habilitado;
  const refrescar = () => qc.invalidateQueries({ queryKey: ["usuarios"] });
  const alFallar = (e: unknown) => toast.error(mensajeDeError(e, "No se pudo completar la acción."));

  const crear = useMutation({
    mutationFn: crearUsuario,
    onSuccess: (r) => {
      setCreada(r);
      setNombre("");
      setEmail("");
      setRol("miembro");
      void refrescar();
    },
    onError: alFallar,
  });
  const suspender = useMutation({
    mutationFn: suspenderUsuario,
    onSuccess: () => {
      toast.success("Cuenta suspendida; sus sesiones quedaron revocadas.");
      void refrescar();
    },
    onError: alFallar,
  });
  const reasignarRol = useMutation({
    mutationFn: (v: { id: number; rol: Rol }) => cambiarRol(v.id, v.rol),
    onSuccess: () => {
      toast.success("Rol actualizado.");
      void refrescar();
    },
    onError: alFallar,
  });
  const nuevaClave = useMutation({
    mutationFn: restablecerPassword,
    onSuccess: (r) => setCreada(r),
    onError: alFallar,
  });

  const enviando = crear.isPending;
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    crear.mutate({ nombre: nombre.trim(), email: email.trim().toLowerCase(), rol });
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
                Contraseña de <strong>{creada.email}</strong>. Entrégala por un canal
                seguro; no se volverá a mostrar.
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
          <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
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
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.email}</TableCell>
                    <TableCell>{u.nombre || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.rol}
                        disabled={u.email === cuenta?.email || reasignarRol.isPending}
                        onValueChange={(v) => reasignarRol.mutate({ id: u.id, rol: v as Rol })}
                      >
                        <SelectTrigger className="w-56" aria-label={`Rol de ${u.email}`}>
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
                    </TableCell>
                    <TableCell className="capitalize">{u.estado}</TableCell>
                    <TableCell>
                      {new Date(u.creadoEn).toLocaleDateString("es-PE")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={nuevaClave.isPending}
                          onClick={() => {
                            if (window.confirm(`¿Generar una nueva contraseña para ${u.email}? Se cerrarán sus sesiones.`))
                              nuevaClave.mutate(u.id);
                          }}
                        >
                          Nueva contraseña
                        </Button>
                        {u.estado !== "suspendida" && u.email !== cuenta?.email && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={suspender.isPending}
                            onClick={() => {
                              if (window.confirm(`¿Suspender la cuenta de ${u.email}?`))
                                suspender.mutate(u.id);
                            }}
                          >
                            Suspender
                          </Button>
                        )}
                      </div>
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
