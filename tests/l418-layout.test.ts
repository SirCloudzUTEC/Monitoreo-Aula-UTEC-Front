import { describe, expect, it } from "vitest";
import { L418 } from "../src/components/three/l418-layout";

describe("L-418 · distribución confirmada en fotografías", () => {
  it("mantiene el tablero docente separado de los marcos de las pizarras móviles", () => {
    const escritorio = [L418.escritorio.x, 0.785, L418.escritorio.z];
    const tamano = [0.74, 0.04, 1.22];
    for (const z of L418.pizarras) {
      const marco = [0.52, 1.45, z];
      const dimensiones = [0.065, 1.35, 1.04];
      const solapa = escritorio.every(
        (p, eje) =>
          Math.abs(p - marco[eje]) < (tamano[eje] + dimensiones[eje]) / 2,
      );
      expect(solapa, `Tablero docente contra pizarra en z=${z}`).toBe(false);
    }
  });
  it("conserva la separación entre grupos y deja una franja amplia junto al ventanal exterior", () => {
    const centros = [0, 1].map((grupo) => {
      const puestos = L418.puestos.filter((p) => p.grupo === grupo);
      return puestos.reduce((sum, p) => sum + p.z, 0) / puestos.length;
    });
    expect(centros[1] - centros[0]).toBeCloseTo(4.2);
    const pasoExterior = Math.min(...L418.sillas.map((s) => s.z)) - 0.31;
    expect(pasoExterior).toBeGreaterThanOrEqual(1.5);
  });
  it("distingue el único acceso junto al tacho de la puerta reservada junto al escritorio", () => {
    const accesos = L418.puertas.filter((p) => p.uso === "entradaSalida");
    const reservadas = L418.puertas.filter((p) => p.uso === "zonaReservada");
    expect(accesos).toHaveLength(1);
    expect(reservadas).toHaveLength(1);
    expect(Math.abs(L418.tacho.z - accesos[0].z)).toBeLessThan(0.6);
    expect(Math.abs(L418.escritorio.z - reservadas[0].z)).toBeLessThan(1.5);
    expect(Math.abs(L418.escritorio.z - L418.tacho.z)).toBeGreaterThan(5);
    expect(L418.escritorio.x + 0.74 / 2).toBeLessThan(
      reservadas[0].x - reservadas[0].ancho / 2,
    );
  });

  it("separa el respaldo docente del equipo mural sin salir del ancho del escritorio ni invadir la puerta reservada", () => {
    const silla = L418.sillaDocente;
    const limites = (
      centro: [number, number, number],
      tamano: [number, number, number],
    ) =>
      centro.map((valor, eje) => [
        valor - tamano[eje] / 2,
        valor + tamano[eje] / 2,
      ]);
    const respaldo = limites(
      [silla.x - 0.2, 0.85, silla.z],
      [0.08, 0.65, 0.46],
    );
    const equipo = limites(
      [L418.equipoMural.x, L418.equipoMural.y, L418.equipoMural.z],
      [0.13, 0.85, 0.55],
    );
    const solapan = respaldo.every(
      ([min, max], eje) => min < equipo[eje][1] && max > equipo[eje][0],
    );
    expect(solapan, JSON.stringify({ respaldo, equipo })).toBe(false);

    // Include the 0.6 m chair base, not just the narrower backrest.
    expect(silla.x).toBeCloseTo(L418.escritorio.x - 0.5);
    expect(silla.z - 0.3).toBeGreaterThan(L418.escritorio.z - 1.22 / 2);
    expect(silla.z + 0.3).toBeLessThan(L418.escritorio.z + 1.22 / 2);
    expect(silla.z).toBeLessThan(L418.W / 2);
    const reservada = L418.puertas.find((p) => p.uso === "zonaReservada")!;
    expect(silla.x + 0.3).toBeLessThan(reservada.x - reservada.ancho / 2);
    expect(silla.z + 0.3).toBeLessThan(Math.min(...L418.pizarras) - 1.04 / 2);
  });

  it("modela el tablero trapezoidal con dos bases paralelas de distinta longitud", () => {
    expect(L418.mesa.contorno).toHaveLength(4);
    const [a, b, c, d] = L418.mesa.contorno;
    expect(a[1]).toBe(b[1]);
    expect(c[1]).toBe(d[1]);
    expect(b[0] - a[0]).toBeCloseTo(L418.mesa.largo);
    expect(c[0] - d[0]).toBeCloseTo(L418.mesa.baseCorta);
    expect(L418.mesa.largo).toBeGreaterThan(L418.mesa.baseCorta);
  });
  it("encaja ocho trapecios alternados por lado compartiendo sus aristas", () => {
    const vertices = (p: (typeof L418.puestos)[number]) =>
      L418.mesa.contorno.map(([x, z]) => [
        p.x + x * Math.cos(p.rot) + z * Math.sin(p.rot),
        p.z - x * Math.sin(p.rot) + z * Math.cos(p.rot),
      ]);
    for (const grupo of [0, 1]) {
      for (const lado of [-1, 1]) {
        const fila = L418.puestos.filter(
          (p) => p.grupo === grupo && p.lado === lado,
        );
        for (const [i, puesto] of fila.entries()) {
          expect(puesto.rot).toBeCloseTo(
            ((i + (lado === 1 ? 1 : 0)) % 2) * Math.PI,
          );
          if (i === 0) continue;
          const anterior = vertices(fila[i - 1]);
          const compartidos = vertices(puesto).filter(([x, z]) =>
            anterior.some(([ax, az]) => Math.hypot(x - ax, z - az) < 1e-8),
          );
          expect(compartidos).toHaveLength(2);
        }
      }
    }
  });

  it("representa 32 mesas individuales: dos grupos con ocho por cada lado", () => {
    expect(L418.puestos).toHaveLength(32);
    for (const grupo of [0, 1]) {
      for (const lado of [-1, 1]) {
        expect(
          L418.puestos.filter((p) => p.grupo === grupo && p.lado === lado),
        ).toHaveLength(8);
      }
    }
  });

  it("sitúa una silla y una laptop cerrada por mesa, fuera del pasillo central", () => {
    expect(L418.sillas).toHaveLength(32);
    expect(L418.laptops).toHaveLength(32);
    for (const [i, puesto] of L418.puestos.entries()) {
      expect(L418.laptops[i]).toMatchObject({
        x: puesto.x,
        z: puesto.z,
        cerrada: true,
      });
      expect(L418.sillas[i].x).toBe(puesto.x);
      expect(L418.sillas[i].z).toBeCloseTo(puesto.z + puesto.lado * 0.76);
      const centroPasillo =
        L418.puestos.reduce((sum, p) => sum + p.z, 0) / L418.puestos.length;
      expect(Math.abs(L418.sillas[i].z - centroPasillo)).toBeGreaterThan(0.6);
    }
  });

  it("tiene dos puertas, dos ventanales y sensores propuestos dentro del aula estimada", () => {
    expect(L418.estimada).toBe(true);
    expect(L418.puertas).toHaveLength(2);
    expect(L418.vidrios).toHaveLength(2);
    for (const pos of Object.values(L418.sensores)) {
      expect(pos[0]).toBeGreaterThanOrEqual(0);
      expect(pos[0]).toBeLessThanOrEqual(L418.L);
      expect(pos[1]).toBeGreaterThan(0);
      expect(pos[1]).toBeLessThanOrEqual(L418.H);
      expect(pos[2]).toBeGreaterThanOrEqual(0);
      expect(pos[2]).toBeLessThanOrEqual(L418.W);
    }
    for (const p of L418.puestos) {
      expect(p.x - L418.mesa.largo / 2).toBeGreaterThan(1.6);
      expect(p.x + L418.mesa.largo / 2).toBeLessThan(L418.L - 1);
      expect(p.z - L418.mesa.fondo / 2).toBeGreaterThan(0);
      expect(p.z + L418.mesa.fondo / 2).toBeLessThan(L418.W);
    }
  });

  it("no superpone las puertas ni sus marcos con las columnas", () => {
    for (const puerta of L418.puertas) {
      for (const columna of L418.columnas) {
        // El marco sobresale 0.07 m por lado y tiene 0.15 m de fondo.
        const solapaX =
          Math.abs(puerta.x - columna.x) <
          puerta.ancho / 2 + 0.07 + columna.largo / 2;
        const solapaZ =
          Math.abs(puerta.z - columna.z) < 0.15 / 2 + columna.fondo / 2;
        expect(
          solapaX && solapaZ,
          `Puerta en z=${puerta.z} y columna en x=${columna.x}, z=${columna.z}`,
        ).toBe(false);
      }
    }
  });

  it("no superpone columnas con las sillas de los 32 puestos", () => {
    for (const silla of L418.sillas) {
      for (const columna of L418.columnas) {
        const solapaX =
          Math.abs(silla.x - columna.x) < columna.largo / 2 + 0.31;
        const solapaZ =
          Math.abs(silla.z - columna.z) < columna.fondo / 2 + 0.31;
        expect(solapaX && solapaZ).toBe(false);
      }
    }
  });

  it("mantiene los tres armarios dentro de la envolvente del aula", () => {
    expect(L418.armarios).toHaveLength(3);
    for (const a of L418.armarios) {
      expect(a.x + 0.24).toBeLessThan(L418.L);
      expect(a.z - 0.46).toBeGreaterThan(0);
      expect(a.z + 0.46).toBeLessThan(L418.W);
    }
  });
});
