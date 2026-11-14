import { describe, expect, it } from "vitest";
import * as layout from "../src/components/three/l418-layout";

describe("L-418 · fondo y distancia al ventanal vinculados", () => {
  it("aplica el fondo ampliado estimado a los dos bancos, el aula y el paso real de las sillas", () => {
    const m = layout.L418;
    expect(m.reservado.z1).toBe(2.4);
    expect(m.reservado.dimensionesEstimadas).toBe(true);
    const transversal = layout.crearTransversalL418(m.reservado.z1);
    expect(m.W).toBe(transversal.W);
    for (const grupo of [0, 1]) {
      const fila = m.puestos.filter((p) => p.grupo === grupo);
      expect(fila.reduce((s, p) => s + p.z, 0) / fila.length).toBeCloseTo(
        transversal.centrosBancos[grupo],
      );
    }
    expect(Math.min(...m.sillas.map((p) => p.z)) - 0.31).toBeCloseTo(
      transversal.pasoExterior,
    );
  });
  it("rechaza fondos no positivos o no finitos", () => {
    for (const fondo of [0, -1, NaN, Infinity]) {
      expect(() => layout.crearTransversalL418(fondo)).toThrow(RangeError);
    }
  });
  it("aumenta el paso exterior en la misma cantidad que el fondo sin estrechar otros pasillos", () => {
    expect(typeof layout.crearTransversalL418).toBe("function");
    const anterior = layout.crearTransversalL418(1.6);
    const ampliada = layout.crearTransversalL418(2.4);
    const aumento = 2.4 - 1.6;
    expect(ampliada.pasoExterior - anterior.pasoExterior).toBeCloseTo(aumento);
    expect(ampliada.W - anterior.W).toBeCloseTo(aumento);
    for (const i of [0, 1])
      expect(ampliada.centrosBancos[i] - anterior.centrosBancos[i]).toBeCloseTo(
        aumento,
      );
    expect(ampliada.centrosBancos[1] - ampliada.centrosBancos[0]).toBeCloseTo(
      4.2,
    );
    expect(ampliada.W - ampliada.centrosBancos[1]).toBeCloseTo(
      anterior.W - anterior.centrosBancos[1],
    );
    expect(ampliada.proyeccionZ - anterior.proyeccionZ).toBeCloseTo(aumento);
    expect(anterior.W).toBeCloseTo(9.6);
    expect(anterior.centrosBancos).toEqual([3.3, 7.5]);
  });
});
