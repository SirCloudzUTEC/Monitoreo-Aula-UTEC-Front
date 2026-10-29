// One table of threshold rules per magnitude: whether an instantaneous value is
// out of range (dashboard traffic light, TV screen) and which reference lines
// the charts draw. Kept free of chart code so pages can use it without recharts.

import type { EstadoPuerta, Magnitud, Umbrales } from "@/lib/types";
import { UNIDADES } from "@/lib/units";

export interface LineaUmbral {
  valor: number;
  etiqueta: string;
  color?: string;
}

const AMBAR = "#f59e0b";
const ROJO = "#dc2626";
const VERDE = "#10b981";

interface ReglaUmbral {
  /** instantaneous value beyond the threshold (persistence not considered) */
  fuera: (v: number, u: Umbrales, enClase: boolean) => boolean;
  /** [label prefix, threshold key, color?] */
  lineas: [string, keyof Umbrales, string?][];
}

const REGLAS: Partial<Record<Magnitud, ReglaUmbral>> = {
  temperatura: { fuera: (v, u) => v > u.umbralTemp, lineas: [["Umbral", "umbralTemp"]] },
  humedad: {
    fuera: (v, u) => v < u.hrMin || v > u.hrMax,
    lineas: [
      ["Mín", "hrMin"],
      ["Máx", "hrMax"],
    ],
  },
  co2: {
    fuera: (v, u) => v >= u.co2Aviso,
    lineas: [
      ["Aviso", "co2Aviso", AMBAR],
      ["Alerta", "co2Alerta", ROJO],
    ],
  },
  pm25: { fuera: (v, u) => v > u.pm25Max, lineas: [["Máx", "pm25Max"]] },
  lux: {
    // light only matters with a class in session
    fuera: (v, u, enClase) => enClase && v < u.umbralLux,
    lineas: [
      ["Mín en clase", "umbralLux", AMBAR],
      ["Objetivo", "luxObjetivo", VERDE],
    ],
  },
  ruido: { fuera: (v, u) => v > u.umbralRuido, lineas: [["Umbral", "umbralRuido"]] },
  ocupacion: { fuera: (v, u) => v > u.aforoMaximo, lineas: [["Aforo máx", "aforoMaximo", ROJO]] },
  proximidad_ventana: { fuera: (v, u) => v < u.distVentana, lineas: [["Distancia mín", "distVentana", ROJO]] },
  bateria: { fuera: (v, u) => v < u.bateriaBaja, lineas: [["Batería baja", "bateriaBaja", AMBAR]] },
};

export function fueraDeUmbral(
  magnitud: Magnitud,
  valor: number | EstadoPuerta | undefined,
  u: Umbrales,
  enClase: boolean,
): boolean {
  const regla = REGLAS[magnitud];
  return regla !== undefined && typeof valor === "number" && regla.fuera(valor, u, enClase);
}

/** Threshold reference lines that apply to a magnitude. */
export function lineasUmbral(magnitud: Magnitud, u: Umbrales): LineaUmbral[] {
  return (REGLAS[magnitud]?.lineas ?? []).map(([texto, clave, color]) => ({
    valor: u[clave],
    etiqueta: `${texto} ${u[clave]} ${UNIDADES[magnitud]}`,
    color,
  }));
}
