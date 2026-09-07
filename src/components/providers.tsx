"use client";

// Client bootstrap: starts the simulation store once, registers the service
// worker (PWA) and mounts global providers (theme, tooltips, toasts).

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useApp } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const iniciar = useApp((s) => s.iniciar);

  useEffect(() => {
    iniciar();
    const refresh = () => {
      void useApp.getState().refreshSession();
    };
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    const sessionTimer = window.setInterval(refresh, 30_000);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {
          // offline mode unavailable (e.g. unsupported browser): app still works
        });
    }
    return () => {
      window.clearInterval(sessionTimer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [iniciar]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
