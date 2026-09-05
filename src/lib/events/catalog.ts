import type { Severidad, TipoEvento } from "@/lib/types";

export interface EventoCatalogo {
  tipo: TipoEvento;
  severidad: Severidad;
  nombre: string; // UI label (Spanish)
  descripcion: string; // plain-language explanation for a non-technical operator
  accion: string; // what the operator should do
  modulo:
    | "confort"
    | "iluminacion"
    | "aire"
    | "ruido"
    | "aforo"
    | "accesos"
    | "perimetro"
    | "nodos"
    | "general";
}

export const CATALOGO_EVENTOS: Record<TipoEvento, EventoCatalogo> = {
  inicio_clase: {
    tipo: "inicio_clase",
    severidad: "info",
    nombre: "Inicio de clase",
    descripcion: "Comenzó una clase según el horario del aula.",
    accion: "Ninguna. Registro informativo.",
    modulo: "general",
  },
  fin_clase: {
    tipo: "fin_clase",
    severidad: "info",
    nombre: "Fin de clase",
    descripcion: "Terminó la clase según el horario del aula.",
    accion: "Ninguna. Registro informativo.",
    modulo: "general",
  },
  ingreso: {
    tipo: "ingreso",
    severidad: "info",
    nombre: "Ingreso",
    descripcion: "Una persona entró al aula (contador de la puerta).",
    accion: "Ninguna. Registro informativo.",
    modulo: "aforo",
  },
  egreso: {
    tipo: "egreso",
    severidad: "info",
    nombre: "Egreso",
    descripcion: "Una persona salió del aula (contador de la puerta).",
    accion: "Ninguna. Registro informativo.",
    modulo: "aforo",
  },
  luz_encendida: {
    tipo: "luz_encendida",
    severidad: "info",
    nombre: "Luz encendida",
    descripcion: "Se encendió la iluminación del aula.",
    accion: "Ninguna. Registro informativo.",
    modulo: "iluminacion",
  },
  luz_apagada: {
    tipo: "luz_apagada",
    severidad: "info",
    nombre: "Luz apagada",
    descripcion: "Se apagó la iluminación del aula.",
    accion: "Ninguna. Registro informativo.",
    modulo: "iluminacion",
  },
  puerta_asegurada: {
    tipo: "puerta_asegurada",
    severidad: "info",
    nombre: "Puerta asegurada",
    descripcion: "La cerradura eléctrica quedó asegurada.",
    accion: "Ninguna. Registro informativo.",
    modulo: "accesos",
  },
  temperatura_fuera_confort: {
    tipo: "temperatura_fuera_confort",
    severidad: "alerta",
    nombre: "Temperatura fuera de confort",
    descripcion: "La temperatura superó el umbral de confort de forma sostenida.",
    accion: "Revisar ventilación o aire acondicionado del aula.",
    modulo: "confort",
  },
  hr_fuera_confort: {
    tipo: "hr_fuera_confort",
    severidad: "alerta",
    nombre: "Humedad fuera de confort",
    descripcion: "La humedad relativa salió del rango recomendado.",
    accion: "Revisar ventilación; valores extremos afectan el confort.",
    modulo: "confort",
  },
  co2_aviso: {
    tipo: "co2_aviso",
    severidad: "alerta",
    nombre: "CO2 en aviso",
    descripcion: "El CO2 superó 1000 ppm: el aire empieza a viciarse.",
    accion: "Abrir puerta o ventanas para ventilar.",
    modulo: "aire",
  },
  co2_alerta: {
    tipo: "co2_alerta",
    severidad: "critico",
    nombre: "CO2 crítico",
    descripcion: "El CO2 superó 1500 ppm de forma sostenida: afecta la concentración.",
    accion: "Ventilar de inmediato; considerar pausa de la clase.",
    modulo: "aire",
  },
  pm25_alto: {
    tipo: "pm25_alto",
    severidad: "alerta",
    nombre: "Partículas PM2.5 altas",
    descripcion: "El material particulado fino superó el máximo saludable.",
    accion: "Revisar fuentes de polvo o humo; ventilar con criterio.",
    modulo: "aire",
  },
  ruido_excesivo: {
    tipo: "ruido_excesivo",
    severidad: "alerta",
    nombre: "Ruido excesivo",
    descripcion: "El nivel de ruido promedio (1 min) superó el umbral.",
    accion: "Verificar la fuente del ruido dentro o fuera del aula.",
    modulo: "ruido",
  },
  iluminacion_insuficiente: {
    tipo: "iluminacion_insuficiente",
    severidad: "alerta",
    nombre: "Iluminación insuficiente",
    descripcion: "Con clase en curso, la luz está por debajo del mínimo recomendado.",
    accion: "Encender luminarias o revisar luminarias dañadas.",
    modulo: "iluminacion",
  },
  aforo_excedido: {
    tipo: "aforo_excedido",
    severidad: "critico",
    nombre: "Aforo excedido",
    descripcion: "Hay más personas dentro del aula que el aforo permitido.",
    accion: "Notificar al moderador; pedir que salgan personas hasta cumplir el aforo.",
    modulo: "aforo",
  },
  puerta_abierta: {
    tipo: "puerta_abierta",
    severidad: "alerta",
    nombre: "Puerta abierta demasiado tiempo",
    descripcion: "La puerta lleva abierta más tiempo del permitido.",
    accion: "Verificar la puerta; puede estar trabada.",
    modulo: "accesos",
  },
  proximidad_ventana: {
    tipo: "proximidad_ventana",
    severidad: "critico",
    nombre: "Persona cerca de la ventana",
    descripcion: "Se detectó a alguien muy cerca de una ventana con el aula vacía o fuera de horario.",
    accion: "Notificar a seguridad para que verifique el perímetro.",
    modulo: "perimetro",
  },
  bateria_baja: {
    tipo: "bateria_baja",
    severidad: "alerta",
    nombre: "Batería baja",
    descripcion: "Un nodo a batería está por debajo del nivel mínimo.",
    accion: "Programar cambio o recarga de batería.",
    modulo: "nodos",
  },
  nodo_sin_datos: {
    tipo: "nodo_sin_datos",
    severidad: "alerta",
    nombre: "Nodo sin datos",
    descripcion: "Un nodo dejó de enviar su latido periódico.",
    accion: "Revisar alimentación y conectividad del nodo.",
    modulo: "nodos",
  },
  procesador_offline: {
    tipo: "procesador_offline",
    severidad: "critico",
    nombre: "Procesador de aula sin conexión",
    descripcion: "El procesador del aula (Raspberry Pi) no responde.",
    accion: "Revisar energía y red del procesador del aula.",
    modulo: "nodos",
  },
};

export const TIPOS_FUERA_NOMINAL: TipoEvento[] = (
  Object.values(CATALOGO_EVENTOS) as EventoCatalogo[]
)
  .filter((e) => e.severidad !== "info")
  .map((e) => e.tipo);
