// The 8 domain modules of the dashboard (F1) and their traffic-light logic.

import type {
  AulaCodigo,
  EstadoPuerta,
  Evento,
  Magnitud,
  ModuloId,
  Umbrales,
} from "@/lib/types";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";

export type Semaforo = "verde" | "amarillo" | "rojo";

export interface InfoModulo {
  id: ModuloId;
  titulo: string;
  /** magnitudes the module watches (charts on /modulo/[id]) */
  magnitudes: Magnitud[];
  /** magnitude shown big on the dashboard card */
  principal: Magnitud;
  /** plain-language explanation for a non-technical reader */
  explicacion: string;
}

export const MODULOS: Record<ModuloId, InfoModulo> = {
  confort: {
    id: "confort",
    titulo: "Confort térmico",
    magnitudes: ["temperatura", "humedad"],
    principal: "temperatura",
    explicacion:
      "Vigila que la temperatura y la humedad del aula se mantengan en un rango cómodo para estudiar. Si la temperatura supera el umbral por varios minutos, se genera una alerta para revisar la ventilación o el aire acondicionado.",
  },
  iluminacion: {
    id: "iluminacion",
    titulo: "Iluminación",
    magnitudes: ["lux"],
    principal: "lux",
    explicacion:
      "Mide cuánta luz hay sobre las mesas (en lux). Con clase en curso se espera al menos el umbral configurado; el objetivo recomendado para leer y escribir es 500 lx. Si falta luz por varios minutos, se avisa para encender luminarias o revisar fallas.",
  },
  aire: {
    id: "aire",
    titulo: "Calidad de aire",
    magnitudes: ["co2", "pm25", "voc"],
    principal: "co2",
    explicacion:
      "El CO₂ sube cuando hay muchas personas y poca ventilación: sobre 1000 ppm cuesta concentrarse y sobre 1500 ppm es crítico. También se vigilan las partículas finas (PM2.5) y los compuestos volátiles (VOC).",
  },
  ruido: {
    id: "ruido",
    titulo: "Ruido",
    magnitudes: ["ruido"],
    principal: "ruido",
    explicacion:
      "Mide el nivel sonoro promedio (LAeq de 1 minuto, en dBA). Sobre el umbral configurado resulta difícil escuchar la clase; la alerta ayuda a detectar ruido externo o interno sostenido.",
  },
  aforo: {
    id: "aforo",
    titulo: "Aforo",
    magnitudes: ["ocupacion"],
    principal: "ocupacion",
    explicacion:
      "Cuenta cuántas personas hay en el aula usando el sensor de la puerta. Superar el aforo máximo es un evento crítico de seguridad: se notifica al moderador y debe acusar recibo.",
  },
  accesos: {
    id: "accesos",
    titulo: "Accesos / puerta",
    magnitudes: ["puerta"],
    principal: "puerta",
    explicacion:
      "Vigila el estado de la puerta (abierta, cerrada o asegurada). Una puerta abierta demasiado tiempo desperdicia climatización y, fuera de horario, es un riesgo de seguridad.",
  },
  perimetro: {
    id: "perimetro",
    titulo: "Perímetro ventanas",
    magnitudes: ["proximidad_ventana"],
    principal: "proximidad_ventana",
    explicacion:
      "Sensores de distancia en las ventanas detectan si alguien se acerca por fuera cuando el aula está vacía o fuera de horario. Una presencia sostenida a menos de la distancia configurada genera una alerta crítica para seguridad.",
  },
  nodos: {
    id: "nodos",
    titulo: "Estado de nodos",
    magnitudes: ["bateria"],
    principal: "bateria",
    explicacion:
      "Salud del propio sistema: batería de cada nodo y su latido periódico. Si un nodo deja de reportar o el procesador del aula queda fuera de línea, se avisa para revisarlo.",
  },
};

export const ORDEN_MODULOS: ModuloId[] = [
  "confort",
  "iluminacion",
  "aire",
  "ruido",
  "aforo",
  "accesos",
  "perimetro",
  "nodos",
];

export function esModuloId(id: string): id is ModuloId {
  return id in MODULOS;
}

/** Open events belonging to a module (via the event catalog). */
export function eventosDeModulo(abiertos: Evento[], modulo: ModuloId, aula?: AulaCodigo): Evento[] {
  return abiertos.filter(
    (e) => CATALOGO_EVENTOS[e.tipo].modulo === modulo && (!aula || e.aula === aula),
  );
}

type Valores = Partial<Record<Magnitud, number | EstadoPuerta>>;

/**
 * Traffic light for a module in one classroom: red if it has an open critical
 * event, yellow if it has an open alert-level event or an instantaneous value
 * beyond its threshold (persistence not yet met), green otherwise.
 */
export function semaforoModulo(
  modulo: ModuloId,
  valores: Valores,
  umbrales: Umbrales,
  abiertos: Evento[],
  aula: AulaCodigo,
  enClase: boolean,
): Semaforo {
  const evs = eventosDeModulo(abiertos, modulo, aula);
  if (evs.some((e) => e.severidad === "critico")) return "rojo";
  if (evs.length > 0) return "amarillo";

  const n = (m: Magnitud): number | undefined => {
    const v = valores[m];
    return typeof v === "number" ? v : undefined;
  };
  switch (modulo) {
    case "confort": {
      const t = n("temperatura");
      const hr = n("humedad");
      if (t !== undefined && t > umbrales.umbralTemp) return "amarillo";
      if (hr !== undefined && (hr < umbrales.hrMin || hr > umbrales.hrMax)) return "amarillo";
      return "verde";
    }
    case "iluminacion": {
      const lux = n("lux");
      if (enClase && lux !== undefined && lux < umbrales.umbralLux) return "amarillo";
      return "verde";
    }
    case "aire": {
      const co2 = n("co2");
      const pm = n("pm25");
      if (co2 !== undefined && co2 >= umbrales.co2Aviso) return "amarillo";
      if (pm !== undefined && pm > umbrales.pm25Max) return "amarillo";
      return "verde";
    }
    case "ruido": {
      const r = n("ruido");
      if (r !== undefined && r > umbrales.umbralRuido) return "amarillo";
      return "verde";
    }
    case "aforo": {
      const o = n("ocupacion");
      if (o !== undefined && o > umbrales.aforoMaximo) return "amarillo";
      return "verde";
    }
    case "accesos":
      return "verde"; // only event-driven
    case "perimetro": {
      const d = n("proximidad_ventana");
      if (d !== undefined && d < umbrales.distVentana) return "amarillo";
      return "verde";
    }
    case "nodos": {
      const b = n("bateria");
      if (b !== undefined && b < umbrales.bateriaBaja) return "amarillo";
      return "verde";
    }
  }
}

export const CLASE_SEMAFORO: Record<Semaforo, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-600",
};

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  verde: "Normal",
  amarillo: "En observación",
  rojo: "Crítico",
};

/** Worst of two traffic lights (module card aggregates both classrooms). */
export function peorSemaforo(a: Semaforo, b: Semaforo): Semaforo {
  const orden: Semaforo[] = ["verde", "amarillo", "rojo"];
  return orden[Math.max(orden.indexOf(a), orden.indexOf(b))];
}

/** Fondo tenue/translúcido para una lectura, según el semáforo de su módulo. */
export const CLASE_FONDO_SEMAFORO: Record<Semaforo, string> = {
  verde: "bg-muted/50",
  amarillo: "bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20",
  rojo: "bg-red-600/15 hover:bg-red-600/25 dark:bg-red-600/25",
};

export interface RiesgoAula {
  aula: AulaCodigo;
  score: number;
  criticas: number;
  alertas: number;
  enObservacion: number;
}

/**
 * Puntaje de riesgo para el panel general: las alertas críticas abiertas
 * pesan más, las alertas normales pesan menos, y los módulos que están
 * "amarillo" (cerca del umbral, sin evento formal aún) pesan lo mínimo.
 * 0 = nada que vigilar en esa aula.
 */
export function riesgoAula(
  aula: AulaCodigo,
  valores: Valores,
  umbrales: Umbrales,
  abiertos: Evento[],
  enClase: boolean,
): RiesgoAula {
  const evsAula = abiertos.filter((e) => e.aula === aula);
  const criticas = evsAula.filter((e) => e.severidad === "critico").length;
  const alertas = evsAula.filter((e) => e.severidad === "alerta").length;
  const enObservacion = ORDEN_MODULOS.filter(
    (m) => semaforoModulo(m, valores, umbrales, abiertos, aula, enClase) === "amarillo",
  ).length;
  return {
    aula,
    criticas,
    alertas,
    enObservacion,
    score: criticas * 100 + alertas * 10 + enObservacion,
  };
}
