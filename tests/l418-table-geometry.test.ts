import { expect, it } from "vitest";
import { crearGeometriaMesaL418 } from "../src/components/three/l418-table-geometry";
import { L418 } from "../src/components/three/l418-layout";

it("extruye el trapecio real en vez de renderizar un tablero rectangular", () => {
  const geometry = crearGeometriaMesaL418();
  geometry.computeBoundingBox();
  const positions = geometry.getAttribute("position");
  const xsEnBorde = (z: number) =>
    Array.from({ length: positions.count }, (_, i) => i)
      .filter((i) => Math.abs(positions.getZ(i) - z) < 1e-5)
      .map((i) => positions.getX(i));
  const largo = xsEnBorde(-L418.mesa.fondo / 2);
  const corto = xsEnBorde(L418.mesa.fondo / 2);
  expect(Math.max(...largo) - Math.min(...largo)).toBeCloseTo(L418.mesa.largo);
  expect(Math.max(...corto) - Math.min(...corto)).toBeCloseTo(
    L418.mesa.baseCorta,
  );
  expect(geometry.boundingBox!.max.y - geometry.boundingBox!.min.y).toBeCloseTo(
    0.035,
  );
  geometry.dispose();
});
