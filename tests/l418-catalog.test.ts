import { describe, expect, it } from "vitest";
import { AULAS, CODIGOS_AULA, getAula } from "@/lib/aulas";

describe("catálogo fotográfico separado del contrato Spring", () => {
  it("registra L-418 como modelo sin activar solicitudes de monitoreo para ella", () => {
    const modelo = getAula("L-418");
    expect(modelo.codigo).toBe("L-418");
    expect(modelo.datosEstimados?.sensoresPropuestos).toBe(true);
    expect(CODIGOS_AULA).toEqual(["L-419", "A-1001"]);
    expect(AULAS.map((a) => a.codigo)).toEqual(CODIGOS_AULA);
  });
});
