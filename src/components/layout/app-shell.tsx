"use client";

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AlertToastWatcher } from "@/components/layout/alert-toast-watcher";
import { useSimulationClock } from "@/hooks/use-simulation-clock";

export function AppShell({ children }: { children: ReactNode }) {
  useSimulationClock();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <AlertToastWatcher />
        <main className="flex flex-1 flex-col gap-4 overflow-x-hidden p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
