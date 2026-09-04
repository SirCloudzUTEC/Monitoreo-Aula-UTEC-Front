import type { DataSource, AlertaFiltro, EventoFiltro, ImportPlanoResultado } from "@/data/contracts/data-source";
import type { Alerta, AulaId, Aula, ConfiguracionAula, Evento, Lectura, Vulnerabilidad } from "@/domain/types";
import type { Magnitud } from "@/domain/enums";
import { useSimulationStore } from "@/data/store/simulation-store";

function wait<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockDataSource: DataSource = {
  async listAulas(): Promise<Aula[]> {
    return wait(Object.values(useSimulationStore.getState().aulas));
  },

  async getAula(id: AulaId): Promise<Aula | null> {
    return wait(useSimulationStore.getState().aulas[id] ?? null);
  },

  subscribeLecturas(aulaId: AulaId, cb: (l: Lectura) => void): () => void {
    let prev = useSimulationStore.getState().lecturas[aulaId];
    return useSimulationStore.subscribe((state) => {
      const current = state.lecturas[aulaId];
      if (current === prev) return;
      prev = current;
      for (const magnitud of Object.keys(current) as Magnitud[]) {
        const serie = state.series[aulaId]?.[magnitud];
        const ultima = serie?.[serie.length - 1];
        if (ultima) cb(ultima);
      }
    });
  },

  async getSerieHistorica(aulaId: AulaId, magnitud: Magnitud): Promise<Lectura[]> {
    return wait(useSimulationStore.getState().series[aulaId]?.[magnitud] ?? []);
  },

  async listAlertas(filtro?: AlertaFiltro): Promise<Alerta[]> {
    let alertas = useSimulationStore.getState().alertas;
    if (filtro?.aulaId) alertas = alertas.filter((a) => a.aulaId === filtro.aulaId);
    if (filtro?.estadoAcuse) alertas = alertas.filter((a) => a.estadoAcuse === filtro.estadoAcuse);
    return wait([...alertas].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  },

  async ackAlerta(id: string, atendidaPor: string): Promise<void> {
    useSimulationStore.getState().ackAlerta(id, atendidaPor);
    return wait(undefined, 60);
  },

  subscribeAlertas(cb: (a: Alerta) => void): () => void {
    let prevLength = useSimulationStore.getState().alertas.length;
    return useSimulationStore.subscribe((state) => {
      if (state.alertas.length > prevLength) {
        for (let i = prevLength; i < state.alertas.length; i += 1) {
          cb(state.alertas[i]);
        }
      }
      prevLength = state.alertas.length;
    });
  },

  async listEventos(filtro: EventoFiltro): Promise<Evento[]> {
    let eventos = useSimulationStore.getState().eventos;
    if (filtro.aulaId) eventos = eventos.filter((e) => e.aulaId === filtro.aulaId);
    if (filtro.desde) eventos = eventos.filter((e) => e.timestamp >= filtro.desde!);
    if (filtro.hasta) eventos = eventos.filter((e) => e.timestamp <= filtro.hasta!);
    if (filtro.actor) eventos = eventos.filter((e) => e.actor.nombre.toLowerCase().includes(filtro.actor!.toLowerCase()) || e.actor.tipo === filtro.actor);
    if (filtro.severidad) eventos = eventos.filter((e) => e.severidad === filtro.severidad);
    if (filtro.tipo) eventos = eventos.filter((e) => e.tipo === filtro.tipo);
    return wait([...eventos].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  },

  async listVulnerabilidades(aulaId?: AulaId): Promise<Vulnerabilidad[]> {
    let vulns = useSimulationStore.getState().vulnerabilidades;
    if (aulaId) vulns = vulns.filter((v) => v.aulaId === aulaId);
    return wait(vulns);
  },

  async getConfiguracion(aulaId: AulaId): Promise<ConfiguracionAula> {
    return wait(useSimulationStore.getState().configuraciones[aulaId]);
  },

  async updateConfiguracion(aulaId: AulaId, patch: Partial<ConfiguracionAula>): Promise<ConfiguracionAula> {
    useSimulationStore.getState().updateConfiguracion(aulaId, patch);
    return wait(useSimulationStore.getState().configuraciones[aulaId], 200);
  },

  async importPlano(aulaId: AulaId, file: File): Promise<ImportPlanoResultado> {
    const esValido = /\.(dxf|csv)$/i.test(file.name);
    if (!esValido) {
      return wait({ ok: false, mensaje: "Formato no soportado. Sube un archivo .dxf o .csv." }, 300);
    }
    const sensoresDetectados = 3 + Math.floor(Math.random() * 6);
    useSimulationStore.getState().setPlanoImportado(aulaId, {
      nombreArchivo: file.name,
      tipo: file.name.toLowerCase().endsWith(".dxf") ? "dxf" : "csv",
      importadoEn: new Date().toISOString(),
      sensoresDetectados,
    });
    return wait(
      { ok: true, sensoresDetectados, mensaje: `Plano "${file.name}" importado. ${sensoresDetectados} posiciones de sensor detectadas.` },
      800,
    );
  },
};
