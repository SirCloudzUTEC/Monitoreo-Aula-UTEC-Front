import { BatteryMedium, DoorOpen, Droplets, Lightbulb, ScanEye, Thermometer, Users, Volume2, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Magnitud } from "@/domain/enums";

export const MAGNITUD_META: Record<Magnitud, { label: string; icon: LucideIcon }> = {
  temperatura: { label: "Temperatura", icon: Thermometer },
  humedad: { label: "Humedad relativa", icon: Droplets },
  co2: { label: "CO2", icon: Wind },
  pm25: { label: "Particulas PM2.5", icon: Wind },
  ruido: { label: "Nivel de ruido", icon: Volume2 },
  iluminancia: { label: "Iluminancia", icon: Lightbulb },
  aforo: { label: "Aforo", icon: Users },
  puerta: { label: "Puerta", icon: DoorOpen },
  proximidad_ventana: { label: "Proximidad a ventana", icon: ScanEye },
  bateria: { label: "Bateria de nodos", icon: BatteryMedium },
};
