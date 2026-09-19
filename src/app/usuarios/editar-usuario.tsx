"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectorAmbitos } from "@/app/usuarios/selector-ambitos";
import type { Usuario } from "@/lib/api/endpoints";
import type { Ambito, Rol } from "@/lib/auth/identity";

export const ETIQUETA_ROL: Record<Rol, string> = {
  miembro: "Usuario (solo visualización)",
  admin_operativo: "Administrador (aulas y planos)",
  superadmin: "Superusuario (gestión de usuarios)",
};

/** Only operational admins carry scopes (mirrors the backend rule). */
export function ambitosPara(rol: Rol, ambitos: Ambito[]): Ambito[] {
  return rol === "admin_operativo" ? ambitos : [];
}

/** Why the role/scopes pair cannot be saved, or null. */
export function errorDeRol(rol: Rol, ambitos: Ambito[]): string | null {
  return rol === "admin_operativo" && ambitos.length === 0
    ? "Un administrador necesita al menos un ámbito (sin él no vería ningún incidente)."
    : null;
}

/** Edits a role and, for operational admins, their scopes; existing scopes are the starting point. */
export function EditarUsuario({
  usuario,
  guardando,
  onCancelar,
  onGuardar,
}: {
  usuario: Usuario;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (rol: Rol, ambitos: Ambito[]) => void;
}) {
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [ambitos, setAmbitos] = useState<Ambito[]>(usuario.ambitos);
  const problema = errorDeRol(rol, ambitos);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {usuario.email}</DialogTitle>
          <DialogDescription>
            Al guardar se cierran las sesiones abiertas de esta cuenta para que el nuevo rol se aplique de inmediato.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="editar-rol">Rol</Label>
            <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
              <SelectTrigger id="editar-rol" className="w-full">
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
          {rol === "admin_operativo" && (
            <div className="flex flex-col gap-1.5">
              <Label>Ámbitos de incidentes</Label>
              <SelectorAmbitos valor={ambitos} onChange={setAmbitos} />
            </div>
          )}
          {problema && <p className="text-xs text-destructive">{problema}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button disabled={guardando || problema !== null} onClick={() => onGuardar(rol, ambitosPara(rol, ambitos))}>
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
