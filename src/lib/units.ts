// Single source of per-magnitude metadata: label, unit, display decimals and
// the max plausible jump between samples (anomaly detector).

import type { Magnitud } from "@/lib/types";

export interface InfoMagnitud {
  etiqueta: string;
  /** compact label for tiles and small cards */
  corta: string;
  unidad: string;
  decimales?: number;
  /** max plausible change between consecutive samples */
  saltoMax?: number;
}

export const MAGNITUDES: Record<Magnitud, InfoMagnitud> = {
  temperatura: { etiqueta: "Temperatura", corta: "Temperatura", unidad: "°C", decimales: 1, saltoMax: 1.5 },
  humedad: { etiqueta: "Humedad relativa", corta: "Humedad", unidad: "%", decimales: 0, saltoMax: 6 },
  co2: { etiqueta: "CO₂", corta: "CO₂", unidad: "ppm", decimales: 0, saltoMax: 200 },
  pm25: { etiqueta: "PM2.5", corta: "PM2.5", unidad: "µg/m³", decimales: 1, saltoMax: 15 },
  voc: { etiqueta: "VOC", corta: "VOC", unidad: "índice", decimales: 0, saltoMax: 60 },
  lux: { etiqueta: "Iluminancia", corta: "Iluminación", unidad: "lx", decimales: 0, saltoMax: 250 },
  ruido: { etiqueta: "Ruido", corta: "Ruido", unidad: "dBA", decimales: 1, saltoMax: 15 },
  presencia: { etiqueta: "Presencia", corta: "Presencia", unidad: "0/1" },
  ocupacion: { etiqueta: "Ocupación", corta: "Ocupación", unidad: "personas", decimales: 0, saltoMax: 8 },
  puerta: { etiqueta: "Puerta", corta: "Puerta", unidad: "estado" },
  proximidad_ventana: {
    etiqueta: "Proximidad a ventana",
    corta: "Proximidad",
    unidad: "m",
    decimales: 2,
    saltoMax: 3,
  },
  bateria: { etiqueta: "Batería", corta: "Batería", unidad: "%", decimales: 0, saltoMax: 5 },
  latido: { etiqueta: "Latido", corta: "Latido", unidad: "1" },
};

const mapa = <T>(fn: (i: InfoMagnitud) => T) =>
  Object.fromEntries(Object.entries(MAGNITUDES).map(([m, i]) => [m, fn(i)])) as Record<Magnitud, T>;

export const UNIDADES = mapa((i) => i.unidad);
export const ETIQUETA_MAGNITUD = mapa((i) => i.etiqueta);
