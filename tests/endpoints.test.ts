import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAccessToken } from "@/lib/api/client";
import {
  estadoAula,
  eventoDeWire,
  listarEventos,
  obtenerHorario,
  serieAula,
} from "@/lib/api/endpoints";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  setAccessToken("t");
});
afterEach(() => vi.unstubAllGlobals());

describe("wire mapping", () => {
  it("maps a backend event onto the SYS-10.1 row shape", () => {
    const ev = eventoDeWire({
      ts: "2026-09-03T14:05:00-05:00",
      aula: "L-419",
      idEvento: "EV-abc-00001",
      tipo: "co2_alerta",
      severidad: "critico",
      fuente: "nodoAmbiental",
      valor: "1350",
      umbral: "1200",
      actor: "motorReglas",
      estadoResultante: "Alerta",
      acuse: { actor: "ana@utec.edu.pe", ts: "2026-09-03T14:06:00-05:00" },
      cerrado: false,
    });
    expect(ev).toMatchObject({
      id_evento: "EV-abc-00001",
      estado_resultante: "Alerta",
      acuse: { actor: "ana@utec.edu.pe" },
      cerrado: false,
    });
  });

  it("fills the fields Jackson omits when null (non_null inclusion)", () => {
    const ev = eventoDeWire({
      ts: "2026-09-03T14:05:00-05:00",
      aula: "A-1001",
      idEvento: "EV-abc-00002",
      tipo: "ingreso",
      severidad: "info",
      estadoResultante: "EnClase",
      cerrado: false,
    });
    expect(ev).toMatchObject({ valor: "", umbral: "", fuente: "", actor: "", acuse: null });
  });

  it("derives per-magnitude values (numeric and door state) from the latest readings", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        aula: "L-419",
        estado: "EnClase",
        ts: "2026-09-03T14:05:00-05:00",
        ultimaLectura: [
          { ts: "2026-09-03T14:05:00-05:00", aula: "L-419", nodo: "nodoAmbiental", magnitud: "co2", valor: 812, unidad: "ppm" },
          { ts: "2026-09-03T14:05:00-05:00", aula: "L-419", nodo: "nodoPuerta", magnitud: "puerta", valor: "cerrada", unidad: "estado" },
        ],
      }),
    );
    const e = await estadoAula("L-419");
    expect(e.estado).toBe("EnClase");
    expect(e.valores).toEqual({ co2: 812, puerta: "cerrada" });
    expect(e.tsMs).toBe(Date.parse("2026-09-03T14:05:00-05:00"));
  });

  it("normalizes schedule times to HH:mm and defaults missing classrooms to no blocks", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ "L-419": [{ dia: 1, inicio: "08:00:00", fin: "10:00", curso: "Cálculo II" }] }),
    );
    const h = await obtenerHorario(["L-419", "A-1001"]);
    expect(h["L-419"][0]).toEqual({ dia: 1, inicio: "08:00", fin: "10:00", curso: "Cálculo II" });
    expect(h["A-1001"]).toEqual([]);
  });

  it("requests a series window and returns numeric timestamps", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ aula: "L-419", magnitud: "temperatura", puntos: [{ ts: "2026-09-03T14:05:00-05:00", valor: 24.5 }] }),
    );
    const desde = new Date("2026-09-03T18:00:00Z");
    const hasta = new Date("2026-09-03T19:00:00Z");
    const p = await serieAula("L-419", "temperatura", desde, hasta, 60_000);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/aulas/L-419/serie");
    expect(url.searchParams.get("magnitud")).toBe("temperatura");
    expect(url.searchParams.get("desde")).toBe(desde.toISOString());
    expect(url.searchParams.get("pasoMs")).toBe("60000");
    expect(p).toEqual([{ ts: "2026-09-03T14:05:00-05:00", t: Date.parse("2026-09-03T14:05:00-05:00"), valor: 24.5 }]);
  });

  it("sends event filters as query params and maps the page content", async () => {
    fetchMock.mockResolvedValueOnce(json({ content: [], totalElements: 0, page: 2, size: 50 }));
    await listarEventos({ aula: "L-419", severidad: "critico", abierto: true, page: 2, size: 50 });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      aula: "L-419",
      severidad: "critico",
      abierto: "true",
      page: "2",
      size: "50",
    });
  });
});
