import { describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { guardarLogRows, cargarLogRows, borrarLog } from "@/lib/data/storage";
import { RuleEngine } from "@/lib/rules/engine";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import aulas from "@/data/aulas.json";
import umbrales from "@/data/umbrales.json";
import type { Aula } from "@/lib/types";

const makeEngine = () =>
  new RuleEngine({
    aulas: aulas as Aula[],
    umbrales,
    horario: HORARIO_DEFAULT,
  });
const t = Date.parse("2026-09-07T09:30:00-05:00");

describe("event identity across sessions", () => {
  it("does not resolve a save before its readwrite transaction completes", async () => {
    let committed = false;
    const original = IDBDatabase.prototype.transaction;
    const spy = vi
      .spyOn(IDBDatabase.prototype, "transaction")
      .mockImplementation(function (
        this: IDBDatabase,
        ...args: Parameters<IDBDatabase["transaction"]>
      ) {
        const transaction = original.apply(this, args);
        if (args[1] === "readwrite")
          transaction.addEventListener("complete", () => {
            committed = true;
          });
        return transaction;
      });
    try {
      await guardarLogRows([
        makeEngine().inyectar("L-419", "aforo_excedido", t, "administrador")
          .evento,
      ]);
      expect(committed).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
  it("waits for the IndexedDB transaction to finish before resolving", async () => {
    await borrarLog();
    const ev = makeEngine().inyectar(
      "L-419",
      "aforo_excedido",
      t,
      "administrador",
    ).evento;
    await guardarLogRows([ev]);
    expect(
      (await cargarLogRows()).some((row) => row.id_evento === ev.id_evento),
    ).toBe(true);
  });
  it("restores the same acknowledged event and ID into a fresh engine", () => {
    const engine = makeEngine();
    const ev = engine
      .process({
        ts: "2026-09-07T09:30:00-05:00",
        aula: "L-419",
        nodo: "nodoPuerta",
        magnitud: "ocupacion",
        valor: 45,
        unidad: "personas",
      })
      .find((e) => e.accion === "abrir")!.evento;
    engine.acusar("L-419", ev.id_evento, "administrador", t + 5000);
    const restored = makeEngine();
    restored.restore(engine.snapshot());
    expect(restored.eventosAbiertos()[0].id_evento).toBe(ev.id_evento);
    expect(restored.eventosAbiertos()[0].acuse?.actor).toBe("administrador");
    expect(restored.getEstado("L-419", new Date(t + 10_000))).toBe("EnClase");
    restored.process({
      ts: "2026-09-07T09:30:10-05:00",
      aula: "L-419",
      nodo: "nodoPuerta",
      magnitud: "ocupacion",
      valor: 45,
      unidad: "personas",
    });
    expect(restored.eventosAbiertos()).toHaveLength(1);
  });
  it("does not overwrite event IDs when a new browser session starts", () => {
    const first = makeEngine().inyectar(
      "L-419",
      "aforo_excedido",
      t,
      "administrador",
    );
    const second = makeEngine().inyectar(
      "L-419",
      "aforo_excedido",
      t,
      "administrador",
    );
    expect(first.evento.id_evento).not.toBe(second.evento.id_evento);
  });
});
