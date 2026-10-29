"use client";

// F8 — settings: account, thresholds and weekly schedule (persisted by the
// backend, which authorizes, validates and audits every change), contacts,
// push notifications and sound.

import { Settings2Icon } from "lucide-react";
import { PageHeader } from "@/components/common/layout";
import { useApp } from "@/lib/store";
import { CambiarPassword } from "@/app/ajustes/cambiar-password";
import {
  SeccionContactos,
  SeccionCuenta,
  SeccionHorario,
  SeccionNotificaciones,
  SeccionPanel,
  SeccionUmbrales,
} from "@/app/ajustes/secciones";

export default function AjustesPage() {
  const conSesion = useApp((s) => s.cuenta !== null);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader icon={Settings2Icon} title="Ajustes" />
      <SeccionCuenta />
      {conSesion && <CambiarPassword />}
      <SeccionNotificaciones />
      <SeccionPanel />
      <SeccionUmbrales />
      <SeccionHorario />
      <SeccionContactos />
    </div>
  );
}
