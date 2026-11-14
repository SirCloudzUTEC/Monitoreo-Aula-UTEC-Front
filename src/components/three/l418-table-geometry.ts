import { ExtrudeGeometry, Shape } from "three";
import { L418 } from "./l418-layout";

/** Horizontal trapezoidal top: dimensions remain photo estimates. */
export function crearGeometriaMesaL418(): ExtrudeGeometry {
  const shape = new Shape();
  L418.mesa.contorno.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -0.0175, 0);
  return geometry;
}
