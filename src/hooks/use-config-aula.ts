"use client";

import { useCallback, useState } from "react";
import { dataSource } from "@/data";
import { useConfiguracion } from "@/data/store/simulation-store";
import type { AulaId, ConfiguracionAula } from "@/domain/types";

export function useConfigAula(aulaId: AulaId) {
  const configuracion = useConfiguracion(aulaId);
  const [guardando, setGuardando] = useState(false);
  const [importando, setImportando] = useState(false);

  const guardar = useCallback(
    async (patch: Partial<ConfiguracionAula>) => {
      setGuardando(true);
      try {
        await dataSource.updateConfiguracion(aulaId, patch);
      } finally {
        setGuardando(false);
      }
    },
    [aulaId],
  );

  const importarPlano = useCallback(
    async (file: File) => {
      setImportando(true);
      try {
        return await dataSource.importPlano(aulaId, file);
      } finally {
        setImportando(false);
      }
    },
    [aulaId],
  );

  return { configuracion, guardando, importando, guardar, importarPlano };
}
