"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileClock, LayoutDashboard, Settings, ShieldAlert } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAlertas } from "@/data/store/simulation-store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alertas", label: "Alertas", icon: ShieldAlert },
  { href: "/footprint", label: "Footprint y log", icon: FileClock },
  { href: "/configuracion", label: "Configuracion", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const alertas = useAlertas();
  const pendientes = alertas.filter((a) => a.estadoAcuse === "pendiente").length;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Monitoreo del Aula</span>
            <span className="text-xs text-muted-foreground">Operaciones UTEC</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const activo = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={activo}
                      tooltip={item.label}
                      render={
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                    {item.href === "/alertas" && pendientes > 0 ? (
                      <SidebarMenuBadge>{pendientes}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
