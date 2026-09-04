"use client";

import { useMemo } from "react";
import { useSimulationStore } from "@/data/store/simulation-store";
import type { AulaId } from "@/domain/types";

export function useVulnerabilidades(aulaId?: AulaId) {
  const vulnerabilidades = useSimulationStore((s) => s.vulnerabilidades);
  return useMemo(
    () => (aulaId ? vulnerabilidades.filter((v) => v.aulaId === aulaId) : vulnerabilidades),
    [vulnerabilidades, aulaId],
  );
}
