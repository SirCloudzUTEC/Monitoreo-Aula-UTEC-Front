"use client";

// Client bootstrap: starts the simulation store once, registers the service
// worker (PWA), syncs the Auth.js session into the store and mounts global
// providers (theme, tooltips, toasts).

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { useSession } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useApp } from "@/lib/store";
import { AppSessionProvider } from "@/components/session-provider";

function SessionSync() {
  const { data } = useSession();
  const setCuenta = useApp((s) => s.setCuenta);

  useEffect(() => {
    setCuenta(data?.cuenta ?? null);
  }, [data, setCuenta]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const iniciar = useApp((s) => s.iniciar);

  useEffect(() => {
    iniciar();
    const refresh = () => {
      void useApp.getState().probarConexion();
    };
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
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
    <AppSessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={200}>
          <SessionSync />
          {children}
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </ThemeProvider>
    </AppSessionProvider>
  );
}
