"use client";

import {
  CpuIcon,
  DoorOpenIcon,
  LightbulbIcon,
  ShieldIcon,
  ThermometerIcon,
  UsersIcon,
  Volume2Icon,
  WindIcon,
} from "lucide-react";
import type { ModuloId } from "@/lib/types";

const ICONOS: Record<ModuloId, React.ComponentType<{ className?: string }>> = {
  confort: ThermometerIcon,
  iluminacion: LightbulbIcon,
  aire: WindIcon,
  ruido: Volume2Icon,
  aforo: UsersIcon,
  accesos: DoorOpenIcon,
  perimetro: ShieldIcon,
  nodos: CpuIcon,
};

export function ModuleIcon({ modulo, className }: { modulo: ModuloId; className?: string }) {
  const Icono = ICONOS[modulo];
  return <Icono className={className} aria-hidden />;
}
