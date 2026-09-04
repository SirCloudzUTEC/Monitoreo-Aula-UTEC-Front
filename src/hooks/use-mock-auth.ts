"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, login as loginMock, logout as logoutMock, type SesionAdmin } from "@/lib/auth-mock";

export function useMockAuth() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionAdmin | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // localStorage solo existe en el cliente; se lee tras montar para
    // evitar un mismatch de hidratacion entre servidor y cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSession());
    setCargando(false);
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const nueva = loginMock(email, password);
      setSesion(nueva);
      router.push("/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    logoutMock();
    setSesion(null);
    router.push("/login");
  }, [router]);

  return { sesion, cargando, login, logout };
}
