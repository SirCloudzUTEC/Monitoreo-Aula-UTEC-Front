"use client";

// Client bootstrap: restores the session from the refresh cookie, mounts
// react-query, registers the service worker (PWA) and the global providers
// (theme, tooltips, toasts). Every page except /acceso requires a session,
// because the backend refuses unauthenticated reads.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AlertasEnVivo } from "@/components/alertas-en-vivo";
import { PantallaCarga } from "@/components/layout/pantalla-carga";
import { ApiError, onSesionPerdida } from "@/lib/api/client";
import { restaurarSesion } from "@/lib/api/session";
import { useApp } from "@/lib/store";

function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2_000,
        // a 4xx will not fix itself by retrying
        retry: (n, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && n < 2,
      },
    },
  });
}

/** Restores the session once, keeps the store in sync and gates protected pages. */
function SesionGate({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const cuenta = useApp((s) => s.cuenta);
  const sesionLista = useApp((s) => s.sesionLista);
  const publica = pathname === "/acceso";

  useEffect(() => {
    let cancelado = false;
    void restaurarSesion().then((c) => {
      if (cancelado) return;
      useApp.getState().setCuenta(c);
      useApp.getState().setSesionLista();
    });
    onSesionPerdida(() => {
      useApp.getState().setCuenta(null);
      queryClient.clear();
    });
    return () => {
      cancelado = true;
      onSesionPerdida(null);
    };
  }, [queryClient]);

  useEffect(() => {
    if (sesionLista && !cuenta && !publica) {
      router.replace(`/acceso?next=${encodeURIComponent(pathname)}`);
    }
  }, [sesionLista, cuenta, publica, pathname, router]);

  if (!sesionLista || (!cuenta && !publica)) {
    // pages with app chrome get a skeleton of it; the login and the TV view stay minimal
    if (publica || pathname.startsWith("/pantalla")) {
      return (
        <div
          role="status"
          className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground"
        >
          Cargando…
        </div>
      );
    }
    return <PantallaCarga />;
  }
  return (
    <>
      {cuenta && <AlertasEnVivo />}
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(crearQueryClient);
  const iniciar = useApp((s) => s.iniciar);

  useEffect(() => {
    iniciar();
    const refresh = () => {
      void useApp.getState().probarConexion();
    };
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    const connTimer = window.setInterval(refresh, 30_000);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {
          // offline mode unavailable (e.g. unsupported browser): app still works
        });
    }
    return () => {
      window.clearInterval(connTimer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [iniciar]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={200}>
          <SesionGate queryClient={queryClient}>{children}</SesionGate>
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
