import type {
  CodigoEvento,
  Magnitud,
  Severidad,
  TipoEvento,
} from "@/domain/enums";

export interface CatalogoEventoInfo {
  codigo: CodigoEvento;
  label: string;
  descripcionOperador: string;
  tipo: TipoEvento;
  severidadDefault: Severidad;
  magnitud?: Magnitud;
  /** Si true, el evento genera además una Alerta que requiere acuse de Operaciones. */
  generaAlerta: boolean;
}

export const CATALOGO_EVENTOS: Record<CodigoEvento, CatalogoEventoInfo> = {
  inicio_clase: {
    codigo: "inicio_clase",
    label: "Inicio de clase",
    descripcionOperador: "El aula entró en horario de clase según el horario configurado.",
    tipo: "nominal",
    severidadDefault: "info",
    generaAlerta: false,
  },
  fin_clase: {
    codigo: "fin_clase",
    label: "Fin de clase",
    descripcionOperador: "El aula salió del horario de clase configurado.",
    tipo: "nominal",
    severidadDefault: "info",
    generaAlerta: false,
  },
  ingreso: {
    codigo: "ingreso",
    label: "Ingreso al aula",
    descripcionOperador: "Se registró el ingreso de una persona al aula.",
    tipo: "nominal",
    severidadDefault: "info",
    magnitud: "aforo",
    generaAlerta: false,
  },
  egreso: {
    codigo: "egreso",
    label: "Egreso del aula",
    descripcionOperador: "Se registró la salida de una persona del aula.",
    tipo: "nominal",
    severidadDefault: "info",
    magnitud: "aforo",
    generaAlerta: false,
  },
  luz_encendida: {
    codigo: "luz_encendida",
    label: "Luz encendida",
    descripcionOperador: "Se detectó que la luminaria del aula se encendió.",
    tipo: "nominal",
    severidadDefault: "info",
    magnitud: "iluminancia",
    generaAlerta: false,
  },
  luz_apagada: {
    codigo: "luz_apagada",
    label: "Luz apagada",
    descripcionOperador: "Se detectó que la luminaria del aula se apagó.",
    tipo: "nominal",
    severidadDefault: "info",
    magnitud: "iluminancia",
    generaAlerta: false,
  },
  puerta_asegurada: {
    codigo: "puerta_asegurada",
    label: "Puerta asegurada",
    descripcionOperador: "La cerradura eléctrica aseguró la puerta fuera de horario de clase.",
    tipo: "nominal",
    severidadDefault: "info",
    magnitud: "puerta",
    generaAlerta: false,
  },
  temperatura_fuera_confort: {
    codigo: "temperatura_fuera_confort",
    label: "Temperatura fuera de confort",
    descripcionOperador: "La temperatura del aula salió del rango de confort térmico (ASHRAE 55) por más de 5 minutos.",
    tipo: "fuera_de_nominal",
    severidadDefault: "alerta",
    magnitud: "temperatura",
    generaAlerta: true,
  },
  hr_fuera_confort: {
    codigo: "hr_fuera_confort",
    label: "Humedad fuera de confort",
    descripcionOperador: "La humedad relativa salió del rango de confort por más de 10 minutos.",
    tipo: "fuera_de_nominal",
    severidadDefault: "alerta",
    magnitud: "humedad",
    generaAlerta: true,
  },
  co2_aviso: {
    codigo: "co2_aviso",
    label: "CO2 en aviso",
    descripcionOperador: "El CO2 superó 1000 ppm de forma sostenida. Se recomienda ventilar.",
    tipo: "fuera_de_nominal",
    severidadDefault: "info",
    magnitud: "co2",
    generaAlerta: false,
  },
  co2_alerta: {
    codigo: "co2_alerta",
    label: "CO2 en alerta",
    descripcionOperador: "El CO2 superó 1500 ppm de forma sostenida. Reducir aforo y ventilar de inmediato.",
    tipo: "fuera_de_nominal",
    severidadDefault: "critico",
    magnitud: "co2",
    generaAlerta: true,
  },
  pm25_alto: {
    codigo: "pm25_alto",
    label: "Partículas PM2.5 altas",
    descripcionOperador: "La concentración de PM2.5 superó 35 µg/m3 durante al menos 1 hora.",
    tipo: "fuera_de_nominal",
    severidadDefault: "alerta",
    magnitud: "pm25",
    generaAlerta: true,
  },
  ruido_excesivo: {
    codigo: "ruido_excesivo",
    label: "Ruido excesivo",
    descripcionOperador: "El nivel sonoro (LAeq) superó 70 dBA.",
    tipo: "fuera_de_nominal",
    severidadDefault: "alerta",
    magnitud: "ruido",
    generaAlerta: true,
  },
  iluminacion_insuficiente: {
    codigo: "iluminacion_insuficiente",
    label: "Iluminación insuficiente",
    descripcionOperador: "La iluminancia sobre los pupitres cayó por debajo de 300 lux con clase en curso.",
    tipo: "fuera_de_nominal",
    severidadDefault: "alerta",
    magnitud: "iluminancia",
    generaAlerta: true,
  },
  aforo_excedido: {
    codigo: "aforo_excedido",
    label: "Aforo excedido",
    descripcionOperador: "La ocupación del aula superó el aforo máximo configurado.",
    tipo: "fuera_de_nominal",
    severidadDefault: "critico",
    magnitud: "aforo",
    generaAlerta: true,
  },
  puerta_abierta: {
    codigo: "puerta_abierta",
    label: "Puerta abierta prolongada",
    descripcionOperador: "La puerta permaneció abierta más tiempo del esperado según el horario.",
    tipo: "fuera_de_nominal",
    severidadDefault: "alerta",
    magnitud: "puerta",
    generaAlerta: true,
  },
  proximidad_ventana: {
    codigo: "proximidad_ventana",
    label: "Proximidad a ventana",
    descripcionOperador: "Se detectó una persona a menos de 1 m de una ventana fuera de horario o con el aula vacía.",
    tipo: "fuera_de_nominal",
    severidadDefault: "critico",
    magnitud: "proximidad_ventana",
    generaAlerta: true,
  },
  bateria_baja: {
    codigo: "bateria_baja",
    label: "Batería baja",
    descripcionOperador: "Un nodo sensor reportó menos de 20% de batería.",
    tipo: "fuera_de_nominal",
    severidadDefault: "alerta",
    magnitud: "bateria",
    generaAlerta: true,
  },
  nodo_sin_datos: {
    codigo: "nodo_sin_datos",
    label: "Nodo sin datos",
    descripcionOperador: "Un nodo sensor no envía latido hace más de 15 minutos.",
    tipo: "fuera_de_nominal",
    severidadDefault: "alerta",
    generaAlerta: true,
  },
  procesador_offline: {
    codigo: "procesador_offline",
    label: "Procesador de aula fuera de línea",
    descripcionOperador: "El procesador de aula no responde hace más de 60 segundos.",
    tipo: "fuera_de_nominal",
    severidadDefault: "critico",
    generaAlerta: true,
  },
};

export function getEventoInfo(codigo: CodigoEvento): CatalogoEventoInfo {
  return CATALOGO_EVENTOS[codigo];
}
