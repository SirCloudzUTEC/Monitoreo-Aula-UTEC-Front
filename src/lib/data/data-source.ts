// Data access layer. Phase 1 ships SimulatedDataSource (deterministic, pure
// functions of time). When the classroom processor's MQTT broker exists,
// MqttDataSource replaces it without touching the UI or the rule engine.

import type {
  AulaCodigo,
  Escenario,
  Horario,
  Magnitud,
  Medicion,
} from "@/lib/types";
import {
  historial,
  medicionesEnTick,
  TICK_MS,
} from "@/lib/simulator/generator";

export interface ScenarioTransition {
  at: number;
  scenario: Escenario;
}

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
      horario: Horario | (() => Horario);
      escenario: (aula: AulaCodigo) => Escenario;
      timeline?: (aula: AulaCodigo) => ScenarioTransition[];
    },
  ) {}

  private schedule(): Horario {
    return typeof this.opts.horario === "function"
      ? this.opts.horario()
      : this.opts.horario;
  }

  private transition(aula: AulaCodigo, ms: number): ScenarioTransition {
    const changes = this.opts.timeline?.(aula);
    return (
      changes?.findLast((change) => change.at <= ms) ?? {
        at: 0,
        scenario: changes ? "clase_normal" : this.opts.escenario(aula),
      }
    );
  }

  medicionesActuales(aula: AulaCodigo, fecha: Date): Medicion[] {
    const change = this.transition(aula, fecha.getTime());
    return medicionesEnTick(
      aula,
      change.scenario,
      this.schedule(),
      fecha,
      change.at || undefined,
    );
  }

  serie(aula: AulaCodigo, magnitud: Magnitud, rango: RangoHistorial) {
    if (!Number.isFinite(rango.pasoMs) || rango.pasoMs <= 0)
      throw new Error("Paso de serie inválido.");
    const points: { ts: string; t: number; valor: number }[] = [];
    const schedule = this.schedule();
    for (
      let t = Math.floor(rango.desde.getTime() / TICK_MS) * TICK_MS;
      t < rango.hasta.getTime();
      t += rango.pasoMs
    ) {
      const change = this.transition(aula, t);
      points.push(
        ...historial(
          aula,
          change.scenario,
          schedule,
          magnitud,
          new Date(t),
          new Date(t + 1),
          rango.pasoMs,
          change.at || undefined,
        ),
      );
    }
    return points;
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
