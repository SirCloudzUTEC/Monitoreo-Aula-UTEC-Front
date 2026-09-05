import { describe, expect, it } from "vitest";
import { RuleEngine } from "@/lib/rules/engine";
import { HORARIO_DEFAULT } from "@/lib/schedule";
import aulas from "@/data/aulas.json";
import umbrales from "@/data/umbrales.json";
import type { Aula } from "@/lib/types";

const makeEngine = () => new RuleEngine({ aulas: aulas as Aula[], umbrales, horario: HORARIO_DEFAULT });
const t = Date.parse("2026-09-07T09:30:00-05:00");

describe("event identity across sessions", () => {
  it("does not overwrite event IDs when a new browser session starts", () => {
    const first = makeEngine().inyectar("L-419", "aforo_excedido", t, "administrador");
    const second = makeEngine().inyectar("L-419", "aforo_excedido", t, "administrador");
    expect(first.evento.id_evento).not.toBe(second.evento.id_evento);
  });
});
