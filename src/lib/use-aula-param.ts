"use client";

import { useParams } from "next/navigation";
import { esCodigoAula } from "@/lib/aulas";
import type { AulaCodigo } from "@/lib/types";

/** The classroom code of a dynamic route segment, or null when it is not a known classroom. */
export function useAulaParam(segmento: string): AulaCodigo | null {
  const params = useParams<Record<string, string>>();
  const codigo = decodeURIComponent(params[segmento] ?? "");
  return esCodigoAula(codigo) ? codigo : null;
}
