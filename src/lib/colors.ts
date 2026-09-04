import { AlertOctagon, AlertTriangle, CircleAlert, DoorClosed, DoorOpen, Info, Lock } from "lucide-react";
import type { EstadoAula, EstadoPuerta, Severidad } from "@/domain/enums";

export const ESTADO_AULA_META: Record<EstadoAula, { label: string; badgeClass: string; dotClass: string }> = {
  Libre: {
    label: "Libre",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    dotClass: "bg-emerald-500",
  },
  EnClase: {
    label: "En clase",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
    dotClass: "bg-blue-500",
  },
  Cerrada: {
    label: "Cerrada",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
  },
  Alerta: {
    label: "Alerta",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    dotClass: "bg-red-500",
  },
};

export const SEVERIDAD_META: Record<Severidad, { label: string; badgeClass: string; icon: typeof Info }> = {
  info: {
    label: "Info",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
    icon: Info,
  },
  alerta: {
    label: "Alerta",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    icon: AlertTriangle,
  },
  critico: {
    label: "Critico",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    icon: AlertOctagon,
  },
};

export const ESTADO_PUERTA_META: Record<EstadoPuerta, { label: string; icon: typeof DoorOpen; className: string }> = {
  abierta: { label: "Abierta", icon: DoorOpen, className: "text-amber-600 dark:text-amber-400" },
  cerrada: { label: "Cerrada", icon: DoorClosed, className: "text-slate-600 dark:text-slate-300" },
  asegurada: { label: "Asegurada", icon: Lock, className: "text-emerald-600 dark:text-emerald-400" },
};

export const ICONO_GENERICO_ALERTA = CircleAlert;
