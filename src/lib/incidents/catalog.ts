// Community incident reports: categories, severity, and routing.
// Members act as "human sensors": any authorized user can report, and the
// platform routes the alert to the operational scope that must attend it.

import type { Ambito } from "@/lib/auth/identity";

export type CategoriaIncidente =
  | "robo"
  | "conducta_peligrosa"
  | "emergencia_medica"
  | "acoso"
  | "infraestructura"
  | "falla_tecnologica"
  | "acceso_no_autorizado"
  | "objeto_perdido"
  | "otro";

export type PrioridadIncidente = "critica" | "alta" | "media" | "baja";

export interface IncidenteCatalogo {
  categoria: CategoriaIncidente;
  nombre: string;
  descripcion: string;
  ejemplos: string;
  prioridad: PrioridadIncidente;
  /** Operational scopes notified, in order of responsibility. */
  destinatarios: readonly Ambito[];
  /** Critical incidents also urge contacting emergency services directly. */
  recordarEmergencias?: boolean;
}

export const CATALOGO_INCIDENTES: Record<CategoriaIncidente, IncidenteCatalogo> = {
  robo: {
    categoria: "robo",
    nombre: "Robo o hurto",
    descripcion: "Sustracción de pertenencias o equipos, en curso o reciente.",
    ejemplos: "Laptop sustraída en un aula, mochila desaparecida, equipo del laboratorio faltante.",
    prioridad: "critica",
    destinatarios: ["seguridad"],
    recordarEmergencias: true,
  },
  conducta_peligrosa: {
    categoria: "conducta_peligrosa",
    nombre: "Conducta peligrosa",
    descripcion: "Comportamiento que pone en riesgo a personas o instalaciones.",
    ejemplos: "Peleas, amenazas, manipulación insegura de equipos o sustancias.",
    prioridad: "critica",
    destinatarios: ["seguridad", "bienestar"],
    recordarEmergencias: true,
  },
  emergencia_medica: {
    categoria: "emergencia_medica",
    nombre: "Emergencia médica",
    descripcion: "Persona herida, desmayada o con síntomas graves.",
    ejemplos: "Desmayo en clase, caída con lesión, crisis respiratoria.",
    prioridad: "critica",
    destinatarios: ["bienestar", "seguridad"],
    recordarEmergencias: true,
  },
  acoso: {
    categoria: "acoso",
    nombre: "Acoso u hostigamiento",
    descripcion: "Situaciones de acoso, hostigamiento o discriminación.",
    ejemplos: "Hostigamiento reiterado, comentarios discriminatorios, intimidación.",
    prioridad: "alta",
    destinatarios: ["bienestar"],
  },
  infraestructura: {
    categoria: "infraestructura",
    nombre: "Problema de infraestructura",
    descripcion: "Daños o fallas en instalaciones físicas.",
    ejemplos: "Fuga de agua, vidrio roto, aire acondicionado malogrado, puerta trabada.",
    prioridad: "media",
    destinatarios: ["mantenimiento"],
  },
  falla_tecnologica: {
    categoria: "falla_tecnologica",
    nombre: "Falla tecnológica",
    descripcion: "Problemas con equipos o servicios tecnológicos.",
    ejemplos: "Proyector sin señal, red caída en un aula, sensor sin datos.",
    prioridad: "media",
    destinatarios: ["ti"],
  },
  acceso_no_autorizado: {
    categoria: "acceso_no_autorizado",
    nombre: "Acceso no autorizado",
    descripcion: "Personas en áreas restringidas o fuera de horario.",
    ejemplos: "Desconocido en el laboratorio, aula abierta fuera de horario.",
    prioridad: "alta",
    destinatarios: ["seguridad"],
  },
  objeto_perdido: {
    categoria: "objeto_perdido",
    nombre: "Objeto perdido o encontrado",
    descripcion: "Pertenencias extraviadas o halladas en el campus.",
    ejemplos: "Fotocheck encontrado, casaca olvidada en un aula.",
    prioridad: "baja",
    destinatarios: ["seguridad"],
  },
  otro: {
    categoria: "otro",
    nombre: "Otro",
    descripcion: "Cualquier situación que consideres importante reportar.",
    ejemplos: "Situaciones que no encajan en las categorías anteriores.",
    prioridad: "media",
    destinatarios: ["seguridad"],
  },
};

export const CATEGORIAS_ORDENADAS: readonly CategoriaIncidente[] = [
  "emergencia_medica",
  "robo",
  "conducta_peligrosa",
  "acoso",
  "acceso_no_autorizado",
  "infraestructura",
  "falla_tecnologica",
  "objeto_perdido",
  "otro",
];

const LIMITE_DESCRIPCION = 2000;

export interface BorradorIncidente {
  categoria: CategoriaIncidente;
  ubicacion: string;
  descripcion: string;
}

export type ValidacionIncidente =
  | { ok: true; borrador: BorradorIncidente }
  | { ok: false; error: string };

/** Validates a report draft; trims and bounds free text. */
export function validarBorrador(input: {
  categoria?: unknown;
  ubicacion?: unknown;
  descripcion?: unknown;
}): ValidacionIncidente {
  const categoria = input.categoria;
  if (
    typeof categoria !== "string" ||
    !Object.hasOwn(CATALOGO_INCIDENTES, categoria)
  ) {
    return { ok: false, error: "Elige una categoría válida." };
  }
  const ubicacion =
    typeof input.ubicacion === "string" ? input.ubicacion.trim() : "";
  if (ubicacion.length === 0 || ubicacion.length > 120) {
    return {
      ok: false,
      error: "Indica la ubicación (aula, piso o zona), máximo 120 caracteres.",
    };
  }
  const descripcion =
    typeof input.descripcion === "string" ? input.descripcion.trim() : "";
  if (descripcion.length < 10) {
    return {
      ok: false,
      error: "Describe lo ocurrido con al menos 10 caracteres.",
    };
  }
  if (descripcion.length > LIMITE_DESCRIPCION) {
    return {
      ok: false,
      error: `La descripción supera el límite de ${LIMITE_DESCRIPCION} caracteres.`,
    };
  }
  return {
    ok: true,
    borrador: {
      categoria: categoria as CategoriaIncidente,
      ubicacion,
      descripcion,
    },
  };
}

export const ETIQUETA_AMBITO: Record<Ambito, string> = {
  seguridad: "Seguridad",
  mantenimiento: "Mantenimiento",
  ti: "TI",
  bienestar: "Bienestar y Salud",
};

/** Human-readable routing summary for a category. */
export function destinatariosDe(categoria: CategoriaIncidente): string {
  return CATALOGO_INCIDENTES[categoria].destinatarios
    .map((a) => ETIQUETA_AMBITO[a])
    .join(" y ");
}
