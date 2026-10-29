"use client";

import { useMemo, useSyncExternalStore } from "react";
import { loadLocalRaw, parseLocal } from "@/lib/data/storage";

const suscribir = (cambio: () => void) => {
  window.addEventListener("storage", cambio);
  return () => window.removeEventListener("storage", cambio);
};

/**
 * A localStorage value read without a mount effect: SSR and the first client render get
 * `fallback`, then the stored value (and later changes from other tabs).
 */
export function useLocal<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(
    suscribir,
    () => loadLocalRaw(key),
    () => null,
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the fallback is a default, not an input
  return useMemo(() => parseLocal(raw, fallback), [raw]);
}
