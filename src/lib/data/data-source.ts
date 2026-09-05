// Data access layer. Phase 1 ships SimulatedDataSource (deterministic, pure
// functions of time). When the classroom processor's MQTT broker exists,
// MqttDataSource replaces it without touching the UI or the rule engine.

import type { AulaCodigo, Escenario, Horario, Magnitud, Medicion } from "@/lib/types";
import { historial, medicionesEnTick, TICK_MS } from "@/lib/simulator/generator";

export interface RangoHistorial {
  desde: Date;
  hasta: Date;
  pasoMs: number;
}

export interface DataSource {
  /** Measurements for the 5 s tick containing `fecha`. */
  medicionesActuales(aula: AulaCodigo, fecha: Date): Medicion[];
  /** Sampled series for charts. */
  serie(
    aula: AulaCodigo,
    magnitud: Magnitud,
    rango: RangoHistorial,
  ): { ts: string; t: number; valor: number }[];
}

export class SimulatedDataSource implements DataSource {
  constructor(
    private opts: {
      horario: Horario;
      escenario: (aula: AulaCodigo) => Escenario;
    },
  ) {}

  medicionesActuales(aula: AulaCodigo, fecha: Date): Medicion[] {
    return medicionesEnTick(aula, this.opts.escenario(aula), this.opts.horario, fecha);
  }

  serie(aula: AulaCodigo, magnitud: Magnitud, rango: RangoHistorial) {
    return historial(
      aula,
      this.opts.escenario(aula),
      this.opts.horario,
      magnitud,
      rango.desde,
      rango.hasta,
      rango.pasoMs,
    );
  }
}

/**
 * TODO(phase 2): real data source against the classroom processor.
 * - connect to NEXT_PUBLIC_MQTT_WS_URL over WebSocket (mqtt.js), auth MQTT_USER/MQTT_PASS
 * - subscribe to utec/aula/+/+/+ (QoS 1) and map payloads (already SYS-09.2 JSON)
 * - serie() should query the processor's history API instead of synthesizing
 */
export class MqttDataSource implements DataSource {
  medicionesActuales(): Medicion[] {
    throw new Error("MqttDataSource: pendiente de broker MQTT (fase 2)");
  }
  serie(): { ts: string; t: number; valor: number }[] {
    throw new Error("MqttDataSource: pendiente de broker MQTT (fase 2)");
  }
}

export { TICK_MS };
