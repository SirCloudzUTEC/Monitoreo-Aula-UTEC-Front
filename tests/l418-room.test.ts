import { describe, expect, it } from "vitest";
import { L418 } from "../src/components/three/l418-layout";

describe("L-418 · recinto reservado y planta útil", () => {
  it("mantiene los muebles y nodos observables fuera del volumen reservado y deja el ensanche ante el vidrio libre", () => {
    const r = L418.reservado;
    const fuera = (x: number, z: number, dx: number, dz: number) =>
      x + dx <= r.x0 || x - dx >= r.x1 || z + dz <= r.z0 || z - dz >= r.z1;
    for (const p of L418.puestos)
      expect(fuera(p.x, p.z, L418.mesa.largo / 2, L418.mesa.fondo / 2)).toBe(
        true,
      );
    for (const p of L418.sillas) expect(fuera(p.x, p.z, 0.31, 0.31)).toBe(true);
    expect(
      fuera(L418.escritorio.x, L418.escritorio.z, 0.74 / 2, 1.22 / 2),
    ).toBe(true);
    expect(fuera(L418.sillaDocente.x, L418.sillaDocente.z, 0.3, 0.3)).toBe(
      true,
    );
    expect(
      fuera(L418.equipoMural.x, L418.equipoMural.z, 0.13 / 2, 0.55 / 2),
    ).toBe(true);
    for (const [x, , z] of Object.values(L418.sensores))
      expect(fuera(x, z, 0, 0)).toBe(true);
    const bahia = L418.suelosUtiles.find((f) => f.z0 === 0)!;
    expect(bahia.x0).toBe(r.x1);
    expect(bahia.x1).toBeGreaterThanOrEqual(L418.vidrios[0].x1);
    expect(bahia.z1).toBe(r.z1);
    expect(
      Math.min(...L418.sillas.map((s) => s.z)) - 0.31,
    ).toBeGreaterThanOrEqual(1.5);
  });
  it("sitúa la puerta reservada en el tabique interior con el puesto docente fuera del recinto", () => {
    const r = L418.reservado;
    const puerta = L418.puertas.find((p) => p.uso === "zonaReservada")!;
    expect(puerta.z).toBe(r.z1);
    expect(puerta.z).toBeGreaterThan(0);
    expect(puerta.z).toBeLessThan(L418.W);
    expect(puerta.x - puerta.ancho / 2 - 0.07).toBeGreaterThan(
      r.x0 + r.espesor,
    );
    expect(puerta.x + puerta.ancho / 2 + 0.07).toBeLessThan(r.x1 - r.espesor);
    expect(L418.escritorio.z - 1.22 / 2).toBeGreaterThan(r.z1);
    expect(L418.sillaDocente.z - 0.3).toBeGreaterThan(r.z1);
    expect(r.dimensionesEstimadas).toBe(true);
    expect(r.interiorLevantado).toBe(false);
  });
  it("recorta el recinto de la planta útil y forma un entrante real, no otro rectángulo", () => {
    expect(L418.reservado).toBeDefined();
    const r = L418.reservado;
    const p = L418.plantaUtil;
    expect(p).toHaveLength(6);
    const giros = p.map(([x, z], i) => {
      const b = p[(i + 1) % p.length];
      const c = p[(i + 2) % p.length];
      return (b[0] - x) * (c[1] - b[1]) - (b[1] - z) * (c[0] - b[0]);
    });
    expect(giros.filter((g) => g < 0)).toHaveLength(1);
    const area =
      p.reduce((s, a, i) => {
        const b = p[(i + 1) % p.length];
        return s + a[0] * b[1] - b[0] * a[1];
      }, 0) / 2;
    expect(area).toBeCloseTo(L418.L * L418.W - (r.x1 - r.x0) * (r.z1 - r.z0));
    expect(L418.suelosUtiles).toHaveLength(2);
    expect(
      L418.suelosUtiles.reduce((s, f) => s + (f.x1 - f.x0) * (f.z1 - f.z0), 0),
    ).toBeCloseTo(area);
    for (const [i, a] of L418.suelosUtiles.entries()) {
      expect(
        Math.min(a.x1, r.x1) - Math.max(a.x0, r.x0) > 0 &&
          Math.min(a.z1, r.z1) - Math.max(a.z0, r.z0) > 0,
      ).toBe(false);
      for (const b of L418.suelosUtiles.slice(i + 1)) {
        expect(
          Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0 &&
            Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 0,
        ).toBe(false);
      }
    }
  });
});
