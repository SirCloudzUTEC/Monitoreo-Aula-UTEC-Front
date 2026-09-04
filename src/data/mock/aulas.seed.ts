import { AFORO_MAXIMO_DEFAULT, AULA_IDS, AULA_NOMBRES, HORARIO_DEFAULT, RANGO_MAGNITUD, UMBRALES_DEFAULT } from "@/domain/constants";
import type { Magnitud } from "@/domain/enums";
import type { Aula, AulaId, ConfiguracionAula, Nodo } from "@/domain/types";

export const MAGNITUDES_AMBIENTALES: Magnitud[] = [
  "temperatura",
  "humedad",
  "co2",
  "pm25",
  "ruido",
  "iluminancia",
];

function nodosSeed(aulaId: AulaId): Nodo[] {
  const now = new Date().toISOString();
  return [
    {
      id: `${aulaId}-nodo-ambiental`,
      aulaId,
      nombre: "Nodo Ambiental",
      tipo: "ambiental",
      bateriaPct: 100,
      ultimaSenal: now,
      estado: "ok",
    },
    {
      id: `${aulaId}-nodo-puerta`,
      aulaId,
      nombre: "Nodo Puerta",
      tipo: "puerta",
      bateriaPct: 92,
      ultimaSenal: now,
      estado: "ok",
    },
    {
      id: `${aulaId}-nodo-ventana`,
      aulaId,
      nombre: "Nodo Ventana",
      tipo: "ventana",
      bateriaPct: 88,
      ultimaSenal: now,
      estado: "ok",
    },
  ];
}

export function seedAulas(): Record<AulaId, Aula> {
  const aulas = {} as Record<AulaId, Aula>;
  for (const id of AULA_IDS) {
    const meta = AULA_NOMBRES[id];
    aulas[id] = {
      id,
      nombre: meta.nombre,
      edificio: meta.edificio,
      piso: meta.piso,
      estado: "Libre",
      puerta: "cerrada",
      ocupacionActual: 0,
      nodos: nodosSeed(id),
    };
  }
  return aulas;
}

export function seedConfiguraciones(): Record<AulaId, ConfiguracionAula> {
  const config = {} as Record<AulaId, ConfiguracionAula>;
  for (const id of AULA_IDS) {
    config[id] = {
      aulaId: id,
      aforoMaximo: AFORO_MAXIMO_DEFAULT,
      umbrales: { ...UMBRALES_DEFAULT },
      horario: HORARIO_DEFAULT.map((b) => ({ ...b })),
    };
  }
  return config;
}

export function seedLecturaInicial(): Record<AulaId, Record<Magnitud, number>> {
  const lecturas = {} as Record<AulaId, Record<Magnitud, number>>;
  for (const id of AULA_IDS) {
    lecturas[id] = {} as Record<Magnitud, number>;
    for (const magnitud of Object.keys(RANGO_MAGNITUD) as Magnitud[]) {
      lecturas[id][magnitud] = RANGO_MAGNITUD[magnitud].target;
    }
  }
  return lecturas;
}
