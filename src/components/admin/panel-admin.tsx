"use client";

// Admin-only block of the dashboard (operational health). Members never see it.

import { BloqueSalud } from "@/components/admin/bloque-salud";
import { puede } from "@/lib/auth/identity";
import { useApp } from "@/lib/store";

export function PanelAdmin() {
  const cuenta = useApp((s) => s.cuenta);
  if (!cuenta || !puede(cuenta, "atender_incidentes")) return null;
  return (
    <div aria-label="Panel del administrador">
      <BloqueSalud />
    </div>
  );
}
