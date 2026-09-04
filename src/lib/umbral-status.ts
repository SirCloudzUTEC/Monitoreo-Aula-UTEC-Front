import type { Magnitud } from "@/domain/enums";
import type { ConfiguracionAula } from "@/domain/types";

export type TonoMagnitud = "normal" | "aviso" | "alerta";

export interface EvaluacionMagnitud {
  tono: TonoMagnitud;
  umbralMin?: number;
  umbralMax?: number;
}

export function evaluarMagnitud(magnitud: Magnitud, valor: number, config: ConfiguracionAula): EvaluacionMagnitud {
  const u = config.umbrales;
  switch (magnitud) {
    case "temperatura":
      return {
        umbralMin: u.temperaturaConfortMin,
        umbralMax: u.temperaturaConfortMax,
        tono: valor > u.temperaturaConfortMax ? "alerta" : valor < u.temperaturaConfortMin ? "aviso" : "normal",
      };
    case "humedad":
      return {
        umbralMin: u.hrConfortMin,
        umbralMax: u.hrConfortMax,
        tono: valor < u.hrConfortMin || valor > u.hrConfortMax ? "alerta" : "normal",
      };
    case "co2":
      return {
        umbralMax: u.co2AlertaPpm,
        tono: valor > u.co2AlertaPpm ? "alerta" : valor > u.co2AvisoPpm ? "aviso" : "normal",
      };
    case "pm25":
      return { umbralMax: u.pm25AlertaUgM3, tono: valor > u.pm25AlertaUgM3 ? "alerta" : "normal" };
    case "ruido":
      return { umbralMax: u.ruidoAlertaDba, tono: valor > u.ruidoAlertaDba ? "alerta" : "normal" };
    case "iluminancia":
      return { umbralMin: u.iluminanciaMinLux, tono: valor < u.iluminanciaMinLux ? "aviso" : "normal" };
    case "aforo":
      return { umbralMax: config.aforoMaximo, tono: valor > config.aforoMaximo ? "alerta" : "normal" };
    case "proximidad_ventana":
      return { umbralMin: 1, tono: valor < 1 ? "alerta" : "normal" };
    case "bateria":
      return { umbralMin: u.bateriaBajaPct, tono: valor < u.bateriaBajaPct ? "aviso" : "normal" };
    default:
      return { tono: "normal" };
  }
}
