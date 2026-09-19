import type { Magnitud } from "@/lib/types";

export const UNIDADES: Record<Magnitud, string> = {
  temperatura: "°C",
  humedad: "%",
  co2: "ppm",
  pm25: "µg/m³",
  voc: "índice",
  lux: "lx",
  ruido: "dBA",
  presencia: "0/1",
  ocupacion: "personas",
  puerta: "estado",
  proximidad_ventana: "m",
  bateria: "%",
  latido: "1",
};
