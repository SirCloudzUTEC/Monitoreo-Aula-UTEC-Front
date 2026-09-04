export type EstadoAula = "Libre" | "EnClase" | "Cerrada" | "Alerta";

export type EstadoPuerta = "abierta" | "cerrada" | "asegurada";

export type Severidad = "info" | "alerta" | "critico";

export type TipoEvento = "nominal" | "fuera_de_nominal";

export type EstadoNodo = "ok" | "sin_datos" | "offline";

export type EstadoAcuse = "pendiente" | "atendida";

export type Magnitud =
  | "temperatura"
  | "humedad"
  | "co2"
  | "pm25"
  | "ruido"
  | "iluminancia"
  | "aforo"
  | "puerta"
  | "proximidad_ventana"
  | "bateria";

export type CodigoEvento =
  | "inicio_clase"
  | "fin_clase"
  | "ingreso"
  | "egreso"
  | "luz_encendida"
  | "luz_apagada"
  | "puerta_asegurada"
  | "temperatura_fuera_confort"
  | "hr_fuera_confort"
  | "co2_aviso"
  | "co2_alerta"
  | "pm25_alto"
  | "ruido_excesivo"
  | "iluminacion_insuficiente"
  | "aforo_excedido"
  | "puerta_abierta"
  | "proximidad_ventana"
  | "bateria_baja"
  | "nodo_sin_datos"
  | "procesador_offline";
