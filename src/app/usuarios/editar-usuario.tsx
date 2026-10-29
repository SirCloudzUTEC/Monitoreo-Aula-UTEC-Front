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
import { RolSelect } from "@/components/common/form";
import { SelectorAmbitos } from "@/app/usuarios/selector-ambitos";
import type { Usuario } from "@/lib/api/endpoints";
import { ambitosPara, errorDeRol, type Ambito, type Rol } from "@/lib/auth/identity";

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
            <RolSelect id="editar-rol" value={rol} onChange={setRol} className="w-full" />
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
