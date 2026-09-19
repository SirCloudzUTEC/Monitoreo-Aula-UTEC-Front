"use client";

// Surfaces alerts that open while the app is in use: a toast per new event and
// a beep for critical ones. Push notifications for closed tabs are sent by the
// backend (Web Push); this is the in-page counterpart.

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useEventosAbiertos } from "@/lib/api/hooks";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import { reproducirAlerta, useApp } from "@/lib/store";

export function AlertasEnVivo() {
  const { abiertos, listo } = useEventosAbiertos();
  const sonido = useApp((s) => s.sonido);
  const vistos = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!listo) return;
    // first load only records what is already open: no toast storm on page load
    if (vistos.current === null) {
      vistos.current = new Set(abiertos.map((e) => e.id_evento));
      return;
    }
    for (const e of abiertos) {
      if (vistos.current.has(e.id_evento)) continue;
      vistos.current.add(e.id_evento);
      const cat = CATALOGO_EVENTOS[e.tipo];
      if (!cat) continue;
      const titulo = `${cat.nombre} · ${e.aula}`;
      if (e.severidad === "critico") {
        toast.error(titulo, { description: cat.accion, duration: 10_000 });
        if (sonido) reproducirAlerta();
      } else {
        toast.warning(titulo, { description: cat.accion, duration: 6_000 });
      }
    }
  }, [abiertos, listo, sonido]);

  return null;
}
