"use client";

// Admin-only user management. There is no self-registration: a superusuario
// is the only one who can create an account, and does so by picking the new
// account's email and role — the backend generates the password and returns it
// once so it can be handed to that person. Existing accounts can be suspended,
// re-roled or given a fresh password (all of which revoke their sessions).

import { useState } from "react";
import { UserPlusIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccesoRequerido, PageHeader, SectionCard } from "@/components/common/layout";
import { Campo, RolSelect } from "@/components/common/form";
import { DataTable, EstadoLista, type Columna } from "@/components/common/data-table";
import { SecretoUnaVez } from "@/components/common/secreto-una-vez";
import { useApp } from "@/lib/store";
import { useMutacionAdmin, useUsuarios } from "@/lib/api/hooks";
import {
  cambiarRol,
  crearUsuario,
  reactivarUsuario,
  restablecerPassword,
  suspenderUsuario,
  type Usuario,
} from "@/lib/api/endpoints";
import { ambitosPara, errorDeRol, ETIQUETA_ROL, type Ambito, type Rol } from "@/lib/auth/identity";
import { ETIQUETA_AMBITO } from "@/lib/incidents/catalog";
import { SelectorAmbitos } from "@/app/usuarios/selector-ambitos";
import { EditarUsuario } from "@/app/usuarios/editar-usuario";

type Credencial = { email: string; password: string };

export default function UsuariosPage() {
  return (
    <AccesoRequerido permiso="gestionar_usuarios" mensaje="Solo una cuenta superusuario puede gestionar usuarios.">
      <Usuarios />
    </AccesoRequerido>
  );
}

function Usuarios() {
  const cuenta = useApp((s) => s.cuenta);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol>("miembro");
  const [ambitos, setAmbitos] = useState<Ambito[]>([]);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [creada, setCreada] = useState<Credencial | null>(null);

  const lista = useUsuarios();
  const usuarios = lista.data ?? [];

  const crear = useMutacionAdmin({
    fn: crearUsuario,
    invalidar: "usuarios",
    alTerminar: (r) => {
      setCreada(r);
      setNombre("");
      setEmail("");
      setRol("miembro");
      setAmbitos([]);
    },
  });
  const suspender = useMutacionAdmin({
    fn: suspenderUsuario,
    invalidar: "usuarios",
    ok: "Cuenta suspendida; sus sesiones quedaron revocadas.",
  });
  const reasignarRol = useMutacionAdmin({
    fn: (v: { id: number; rol: Rol; ambitos: Ambito[] }) => cambiarRol(v.id, v.rol, v.ambitos),
    invalidar: "usuarios",
    ok: "Cuenta actualizada.",
    alTerminar: () => setEditando(null),
  });
  const reactivar = useMutacionAdmin({ fn: reactivarUsuario, invalidar: "usuarios", ok: "Cuenta reactivada." });
  const nuevaClave = useMutacionAdmin({ fn: restablecerPassword, invalidar: "usuarios", alTerminar: setCreada });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const problema = errorDeRol(rol, ambitos);
    if (problema) {
      toast.error(problema);
      return;
    }
    crear.mutate({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      rol,
      ambitos: ambitosPara(rol, ambitos),
    });
  };

  const columnas: Columna<Usuario>[] = [
    { titulo: "Correo", className: "font-mono text-xs", celda: (u) => u.email },
    { titulo: "Nombre", celda: (u) => u.nombre || "—" },
    {
      titulo: "Rol",
      celda: (u) => (
        <>
          <div>{ETIQUETA_ROL[u.rol] ?? u.rol}</div>
          {u.rol === "admin_operativo" && (
            <div className="text-xs text-muted-foreground">
              {u.ambitos.length > 0 ? u.ambitos.map((a) => ETIQUETA_AMBITO[a] ?? a).join(", ") : "sin ámbitos"}
            </div>
          )}
        </>
      ),
    },
    { titulo: "Estado", className: "capitalize", celda: (u) => u.estado },
    { titulo: "Creada", celda: (u) => new Date(u.creadoEn).toLocaleDateString("es-PE") },
    {
      titulo: "Acciones",
      celda: (u) => {
        const propia = u.email === cuenta?.email;
        return (
          <div className="flex flex-wrap gap-1">
            {!propia && (
              <Button size="sm" variant="outline" onClick={() => setEditando(u)}>
                Editar
              </Button>
            )}
            {u.estado === "suspendida" && (
              <Button size="sm" variant="outline" disabled={reactivar.isPending} onClick={() => reactivar.mutate(u.id)}>
                Reactivar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={nuevaClave.isPending}
              onClick={() =>
                window.confirm(`¿Generar una nueva contraseña para ${u.email}? Se cerrarán sus sesiones.`) &&
                nuevaClave.mutate(u.id)
              }
            >
              Nueva contraseña
            </Button>
            {u.estado === "aprobada" && !propia && (
              <Button
                size="sm"
                variant="ghost"
                disabled={suspender.isPending}
                onClick={() => window.confirm(`¿Suspender la cuenta de ${u.email}?`) && suspender.mutate(u.id)}
              >
                Suspender
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader icon={UsersIcon} title="Usuarios" />

      <SectionCard icon={UserPlusIcon} title="Crear cuenta">
        {creada && (
          <SecretoUnaVez
            filas={[{ valor: creada.password }]}
            mensajeCopiado="Contraseña copiada."
            onCerrar={() => setCreada(null)}
          >
            Contraseña de <strong>{creada.email}</strong>. Entrégala por un canal seguro; no se volverá a mostrar.
          </SecretoUnaVez>
        )}
        <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
          <Campo id="nuevo-nombre" label="Nombre completo">
            <Input
              id="nuevo-nombre"
              required
              maxLength={120}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Campo>
          <Campo id="nuevo-email" label="Correo institucional">
            <Input
              id="nuevo-email"
              type="email"
              required
              placeholder="nombre.apellido@utec.edu.pe"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>
          <Campo id="nuevo-rol" label="Rol" className="sm:col-span-2">
            <RolSelect id="nuevo-rol" value={rol} onChange={setRol} className="w-full sm:w-80" />
          </Campo>
          {rol === "admin_operativo" && (
            <Campo label="Ámbitos de incidentes (al menos uno)" className="gap-1.5 sm:col-span-2">
              <SelectorAmbitos valor={ambitos} onChange={setAmbitos} />
            </Campo>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Creando…" : "Crear cuenta y generar contraseña"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Cuentas existentes" contentClassName="">
        <EstadoLista cargando={lista.isPending} vacio={usuarios.length === 0} mensajeVacio="Todavía no hay cuentas.">
          <DataTable columnas={columnas} filas={usuarios} clave={(u) => u.id} />
        </EstadoLista>
      </SectionCard>

      {editando && (
        <EditarUsuario
          usuario={editando}
          guardando={reasignarRol.isPending}
          onCancelar={() => setEditando(null)}
          onGuardar={(r, a) => reasignarRol.mutate({ id: editando.id, rol: r, ambitos: a })}
        />
      )}
    </div>
  );
}
