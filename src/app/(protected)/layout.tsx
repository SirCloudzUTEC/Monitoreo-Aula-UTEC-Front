"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useMockAuth } from "@/hooks/use-mock-auth";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useMockAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !sesion) router.replace("/login");
  }, [cargando, sesion, router]);

  if (cargando || !sesion) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Cargando…</div>;
  }

  return <AppShell>{children}</AppShell>;
}
