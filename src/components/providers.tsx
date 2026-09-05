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
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // offline mode unavailable (e.g. unsupported browser): app still works
      });
    }
  }, [iniciar]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
