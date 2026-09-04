"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SimulatorControls } from "@/components/layout/simulator-controls";
import { useMockAuth } from "@/hooks/use-mock-auth";

const TITULOS: { prefix: string; titulo: string }[] = [
  { prefix: "/dashboard", titulo: "Dashboard general" },
  { prefix: "/aulas", titulo: "Detalle de aula" },
  { prefix: "/alertas", titulo: "Centro de alertas" },
  { prefix: "/footprint", titulo: "Footprint y log de eventos" },
  { prefix: "/configuracion", titulo: "Configuracion" },
];

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Topbar() {
  const pathname = usePathname();
  const { sesion, logout } = useMockAuth();
  const titulo = TITULOS.find((t) => pathname.startsWith(t.prefix))?.titulo ?? "Monitoreo del Aula";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <h1 className="text-sm font-semibold sm:text-base">{titulo}</h1>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block">
          <SimulatorControls />
        </div>
        <ThemeToggle />
        <NotificationsBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">{iniciales(sesion?.nombre ?? "Admin")}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{sesion?.nombre ?? "Administrador"}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{sesion?.email ?? "Administrador"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="size-4" />
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
