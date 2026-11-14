import { describe, expect, it } from "vitest";
import { Children, isValidElement, type ReactNode } from "react";
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from "three";
import { L418Scene } from "../src/components/three/l418-scene";
import type { Aula } from "../src/lib/types";
import { L418 as M } from "../src/components/three/l418-layout";

import * as geometry from "../src/components/three/l418-room-geometry";
import type { CajaL418 as Caja } from "../src/components/three/l418-room-geometry";

const bounds = ({ p, s }: Caja) => ({
  x0: p[0] - s[0] / 2,
  x1: p[0] + s[0] / 2,
  y0: p[1] - s[1] / 2,
  y1: p[1] + s[1] / 2,
  z0: p[2] - s[2] / 2,
  z1: p[2] + s[2] / 2,
});
const overlapsXZ = (a: ReturnType<typeof bounds>, b: typeof M.reservado) =>
  a.x0 < b.x1 - 1e-9 &&
  a.x1 > b.x0 + 1e-9 &&
  a.z0 < b.z1 - 1e-9 &&
  a.z1 > b.z0 + 1e-9;

function expectValidBoxes(boxes: Caja[]) {
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.p.every(Number.isFinite)).toBe(true);
    expect(box.s.every((n) => Number.isFinite(n) && n > 0)).toBe(true);
  }
}

type Layers = Parameters<typeof L418Scene>[0]["capas"];
const hiddenLayers: Layers = {
  estructura: false,
  vidrios: false,
  techo: false,
  luminarias: false,
  ventilacion: false,
  contraincendios: false,
  mobiliario: false,
  equipos: false,
  sillas: false,
  sensores: false,
};

/** Inspect the real JSX box props without mounting Canvas or hook components. */
function sceneBoxes(
  capas: Partial<Layers>,
  origin?: Caja["p"],
): (Caja & { cutaway: boolean })[] {
  const result: (Caja & { cutaway: boolean })[] = [];
  const pureComponents = new Set([
    "Lateral",
    "Servicios",
    "Puerta",
    "Pizarra",
    "Armario",
    "Ventilador",
  ]);
  const walk = (node: ReactNode, parent: Matrix4, cutaway: boolean) => {
    Children.forEach(node, (child) => {
      if (!isValidElement<Record<string, unknown>>(child)) return;
      const props = child.props;
      if (props.visible === false) return;
      const name =
        typeof child.type === "function" ? child.type.name : child.type;
      const emit = (box: Caja & { rot?: number }) => {
        if (
          origin?.some((n, i) => Math.abs(parent.elements[12 + i] - n) > 1e-9)
        )
          return;
        const rotation = new Matrix4().makeRotationY(box.rot ?? 0);
        rotation.setPosition(...box.p);
        const world = parent.clone().multiply(rotation);
        const b = new Box3(
          new Vector3(...box.s).multiplyScalar(-0.5),
          new Vector3(...box.s).multiplyScalar(0.5),
        ).applyMatrix4(world);
        result.push({
          p: b.getCenter(new Vector3()).toArray() as Caja["p"],
          s: b.getSize(new Vector3()).toArray() as Caja["s"],
          cutaway,
        });
      };
      if (name === "Box") {
        emit(props as unknown as Caja);
        return;
      }
      if (name === "Tubo") {
        const diameter = 2 * ((props.r as number | undefined) ?? 0.02);
        const sizes: Caja["s"] = [diameter, diameter, diameter];
        sizes[props.eje === "x" ? 0 : props.eje === "z" ? 2 : 1] =
          props.h as number;
        emit({ p: props.p as Caja["p"], s: sizes });
        return;
      }
      if (name === "Cajas") {
        (props.items as Caja[]).forEach(emit);
        return;
      }
      if (typeof name === "string" && pureComponents.has(name)) {
        walk(
          (child.type as (p: typeof props) => ReactNode)(props),
          parent,
          cutaway,
        );
        return;
      }
      const transform = parent.clone();
      if (name === "group") {
        transform.multiply(
          new Matrix4().compose(
            new Vector3(...((props.position as Caja["p"]) ?? [0, 0, 0])),
            new Quaternion().setFromEuler(
              new Euler(...((props.rotation as Caja["p"]) ?? [0, 0, 0])),
            ),
            new Vector3(1, 1, 1),
          ),
        );
      }
      walk(props.children as ReactNode, transform, cutaway || name === "Corte");
    });
  };
  walk(
    L418Scene({
      aula: { nodos: [] } as unknown as Aula,
      capas: { ...hiddenLayers, ...capas },
      selected: null,
      onSelect: () => {},
    }),
    new Matrix4(),
    false,
  );
  return result;
}

describe("L-418 approximate classroom box geometry", () => {
  it("covers exactly the concave main floor without the reserved footprint", () => {
    const floors = geometry.crearSuelosL418();
    expectValidBoxes(floors);
    expect(floors).toHaveLength(M.suelosUtiles.length);
    expect(
      floors.reduce((area, box) => area + box.s[0] * box.s[2], 0),
    ).toBeCloseTo(
      M.L * M.W -
        (M.reservado.x1 - M.reservado.x0) * (M.reservado.z1 - M.reservado.z0),
    );
    floors.forEach((floor, i) => {
      const b = bounds(floor);
      const expected = M.suelosUtiles[i];
      for (const key of ["x0", "x1", "z0", "z1"] as const)
        expect(b[key]).toBeCloseTo(expected[key]);
      expect(b.y1).toBeCloseTo(0);
      expect(overlapsXZ(b, M.reservado)).toBe(false);
    });
    const [first, second] = floors.map(bounds);
    expect(overlapsXZ(first, { ...M.reservado, ...second })).toBe(false);
    // The exterior-window bay remains usable, rather than filled by a block.
    expect(
      floors.some((floor) => {
        const b = bounds(floor);
        return b.x0 <= M.vidrios[0].x0 && b.x1 >= M.vidrios[0].x1 && b.z0 === 0;
      }),
    ).toBe(true);
  });

  it("keeps four opaque sides, a fixed cap and base within the reserved footprint", () => {
    const shell = geometry.crearReservadoL418();
    const r = M.reservado;
    const door = M.puertas.find((p) => p.uso === "zonaReservada")!;
    const all = [...shell.muros, shell.tapa, shell.base];
    expectValidBoxes(all);
    for (const box of all) {
      const b = bounds(box);
      expect(b.x0).toBeGreaterThanOrEqual(r.x0 - 1e-9);
      expect(b.x1).toBeLessThanOrEqual(r.x1 + 1e-9);
      expect(b.z0).toBeGreaterThanOrEqual(r.z0 - 1e-9);
      expect(b.z1).toBeLessThanOrEqual(r.z1 + 1e-9);
    }
    for (const [box, top] of [
      [shell.tapa, r.alto],
      [shell.base, 0],
    ] as const) {
      const b = bounds(box);
      expect(b.x0).toBeCloseTo(r.x0);
      expect(b.x1).toBeCloseTo(r.x1);
      expect(b.z0).toBeCloseTo(r.z0);
      expect(b.z1).toBeCloseTo(r.z1);
      expect(b.y1).toBeCloseTo(top);
    }
    expect(shell.tapa.s[1]).toBeCloseTo(r.espesor);
    const covers = (x: number, y: number, z: number) =>
      shell.muros.some((box) => {
        const b = bounds(box);
        return (
          x >= b.x0 - 1e-9 &&
          x <= b.x1 + 1e-9 &&
          y >= b.y0 - 1e-9 &&
          y <= b.y1 + 1e-9 &&
          z >= b.z0 - 1e-9 &&
          z <= b.z1 + 1e-9
        );
      });
    // Both outer walls survive removal of the classroom's cutaway walls.
    for (const y of [0.1, 1.5, r.alto - 0.1]) {
      expect(covers(r.x0 + r.espesor / 2, y, (r.z0 + r.z1) / 2)).toBe(true);
      expect(covers(r.x1 - r.espesor / 2, y, (r.z0 + r.z1) / 2)).toBe(true);
      expect(covers((r.x0 + r.x1) / 2, y, r.z0 + r.espesor / 2)).toBe(true);
      for (const x of [r.x0 + 0.3, r.x1 - 0.2])
        expect(covers(x, y, r.z1 - r.espesor / 2)).toBe(true);
    }
    expect(covers(door.x, r.alto - 0.2, r.z1 - r.espesor / 2)).toBe(true);
    expect(covers((r.x0 + r.x1) / 2, 1, (r.z0 + r.z1) / 2)).toBe(false);
    // Leave the complete leaf + frame opening empty below its lintel.
    const opening = {
      x0: door.x - door.ancho / 2 - 0.07,
      x1: door.x + door.ancho / 2 + 0.07,
      y0: 0,
      y1: door.alto + 0.08,
      z0: r.z1 - r.espesor,
      z1: r.z1,
    };
    for (const box of shell.muros) {
      const b = bounds(box);
      expect(
        overlapsXZ(b, { ...r, ...opening }) &&
          b.y0 < opening.y1 - 1e-9 &&
          b.y1 > opening.y0 + 1e-9,
      ).toBe(false);
    }
  });

  it("seals the internal opening with an inset door whose frame clears the return face", () => {
    const crearPuerta = geometry.crearGeometriaPuertaL418;
    const r = M.reservado;
    const door = M.puertas.find((p) => p.uso === "zonaReservada")!;
    const result = crearPuerta(door);
    const shell = geometry.crearReservadoL418();
    const doorBoxes = [result.hoja, ...result.marcos];
    expectValidBoxes([...doorBoxes, result.protector]);
    expect(result.marcos).toHaveLength(3);
    expect(result.hoja.p[2]).toBeCloseTo(r.z1 - r.espesor / 2);
    expect(result.hoja.s).toEqual([door.ancho, door.alto, 0.075]);
    for (const box of doorBoxes) {
      const a = bounds(box);
      expect(a.x1).toBeLessThan(r.x1 - r.espesor);
      expect(a.y0).toBeGreaterThanOrEqual(-1e-9);
      for (const wall of shell.muros) {
        const b = bounds(wall);
        expect(
          overlapsXZ(a, { ...r, ...b }) &&
            a.y0 < b.y1 - 1e-9 &&
            a.y1 > b.y0 + 1e-9,
        ).toBe(false);
      }
    }
    // A horizontal/vertical section through the wall is closed by leaf + frame.
    for (const y of [0.01, 1, door.alto + 0.04]) {
      for (
        let x = door.x - door.ancho / 2 - 0.069;
        x < door.x + door.ancho / 2 + 0.07;
        x += 0.02
      ) {
        expect(
          doorBoxes.some((box) => {
            const b = bounds(box);
            return (
              x >= b.x0 - 1e-9 &&
              x <= b.x1 + 1e-9 &&
              y >= b.y0 - 1e-9 &&
              y <= b.y1 + 1e-9
            );
          }),
        ).toBe(true);
      }
    }
    expect(result.protector.p[2]).toBeGreaterThan(result.hoja.p[2]);
    expect(result.manilla[2]).toBeGreaterThan(r.z1);
    const general = crearPuerta(
      M.puertas.find((p) => p.uso === "entradaSalida")!,
    );
    expect(general.hoja.p[2]).toBe(M.W);
    expect(general.protector.p[2]).toBeLessThan(M.W);
    expect(general.manilla[2]).toBeLessThan(M.W);
  });

  it("has no phantom exterior doorway while preserving the corridor doorway", () => {
    const exterior = geometry.crearMurosLateralesL418(0);
    expect(exterior.puerta).toBeUndefined();
    expectValidBoxes(exterior.muros);
    expect(exterior.muros).toHaveLength(2);
    const front = bounds(exterior.muros[0]);
    expect(front.x0).toBeCloseTo(0);
    expect(front.x1).toBeCloseTo(M.vidrios[0].x0);
    expect(front.y0).toBeCloseTo(0);
    expect(front.y1).toBeCloseTo(M.H);
    const corridor = geometry.crearMurosLateralesL418(1);
    expect(corridor.puerta?.uso).toBe("entradaSalida");
    expectValidBoxes(corridor.muros);
    expect(corridor.muros).toHaveLength(4);
    const door = corridor.puerta!;
    expect(
      corridor.muros.some((box) => {
        const b = bounds(box);
        return b.x0 < door.x && b.x1 > door.x && b.y0 < door.alto - 1e-9;
      }),
    ).toBe(false);
  });

  it("renders the real concave slabs and sealed shell even with Techo hidden", () => {
    const boxes = sceneBoxes({ estructura: true });
    const hasBox = (expected: Caja, uncut = false) =>
      boxes.some(
        (box) =>
          (!uncut || !box.cutaway) &&
          box.p.every((n, i) => Math.abs(n - expected.p[i]) < 1e-9) &&
          box.s.every((n, i) => Math.abs(n - expected.s[i]) < 1e-9),
      );
    for (const floor of geometry.crearSuelosL418())
      expect(hasBox(floor, true)).toBe(true);
    const shell = geometry.crearReservadoL418();
    for (const box of [...shell.muros, shell.tapa, shell.base])
      expect(hasBox(box, true)).toBe(true);
    const door = geometry.crearGeometriaPuertaL418(
      M.puertas.find((p) => p.uso === "zonaReservada")!,
    );
    for (const box of [door.hoja, ...door.marcos])
      expect(hasBox(box, true)).toBe(true);
    expect(boxes.filter((box) => bounds(box).y1 <= 1e-9)).toHaveLength(
      M.suelosUtiles.length + 1,
    );
  });

  it("clips suspended services to the usable bay without entering the closed shell", () => {
    const boxes = sceneBoxes({
      techo: true,
      ventilacion: true,
      contraincendios: true,
    });
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    const trays = boxes.filter(
      (box) => near(box.s[0], 0.28) && near(box.s[1], 0.055),
    );
    expect(trays).toHaveLength(2);
    expect(bounds(trays[0]).z0).toBeGreaterThan(M.reservado.z1);
    expect(bounds(trays[0]).z1).toBeCloseTo(M.W - 0.2);
    const slats = boxes.filter(
      (box) => near(box.s[0], 0.29) && near(box.s[1], 0.015),
    );
    const duct = boxes.filter(
      (box) => near(box.s[1], 0.27) && near(box.s[2], 0.34),
    );
    expect(duct).toHaveLength(1);
    expect(bounds(duct[0]).x0).toBeGreaterThan(M.reservado.x1);
    expect(bounds(duct[0]).x1).toBeCloseTo(9.7);
    const branches = boxes.filter(
      (box) => near(box.s[0], 0.042) && near(box.s[1], 0.042),
    );
    expect(branches).toHaveLength(3);
    expect(branches[0].p[0]).toBeCloseTo(M.reservado.x1 + 0.15);
    expectValidBoxes([...trays, ...slats, ...duct, ...branches]);
    for (const box of [...trays, ...slats, ...duct, ...branches])
      expect(overlapsXZ(bounds(box), M.reservado)).toBe(false);
  });

  it("leaves real teacher-chair legroom under the supported, unchanged desktop", () => {
    const desk = sceneBoxes({ mobiliario: true }, [
      M.escritorio.x,
      0,
      M.escritorio.z,
    ]);
    const chair = sceneBoxes({ sillas: true }, [
      M.sillaDocente.x,
      0,
      M.sillaDocente.z,
    ]);
    expectValidBoxes(desk);
    // Seat, backrest, column and both rolling-base bars: none may be omitted.
    expect(chair).toHaveLength(5);
    const collides = (a: Caja, b: Caja) => {
      const aa = bounds(a);
      const bb = bounds(b);
      return (
        overlapsXZ(aa, { ...M.reservado, ...bb }) &&
        aa.y0 < bb.y1 - 1e-9 &&
        aa.y1 > bb.y0 + 1e-9
      );
    };
    const intersections = chair.flatMap((part) =>
      desk.filter((box) => collides(part, box)).map((box) => ({ part, box })),
    );
    expect(intersections).toEqual([]);

    const top = desk.find((box) => Math.abs(box.p[1] - 0.785) < 1e-9)!;
    expect(top.p).toEqual([M.escritorio.x, 0.785, M.escritorio.z]);
    top.s.forEach((n, i) => expect(n).toBeCloseTo([0.74, 0.04, 1.22][i]));
    const supports = desk.filter((box) => box.s[1] > 0.5);
    expect(supports).toHaveLength(3);
    const legs = supports.filter((box) => bounds(box).y0 < 0.02);
    expect(legs).toHaveLength(2);
    for (const leg of legs) {
      expect(bounds(leg).y1).toBeCloseTo(bounds(top).y0);
      expect(bounds(leg).z0).toBeGreaterThan(bounds(top).z0);
      expect(bounds(leg).z1).toBeLessThan(bounds(top).z1);
    }
    // Face strips remain attached to solid backing, not floating over legroom.
    for (const detail of desk.filter((box) => box.s[1] < 0.02))
      expect(supports.some((support) => collides(detail, support))).toBe(true);

    const obstacles = sceneBoxes({ estructura: true }).filter(
      (box) => bounds(box).y1 > 1e-9,
    );
    for (const part of [...desk, ...chair]) {
      expect(overlapsXZ(bounds(part), M.reservado)).toBe(false);
      expect(obstacles.filter((box) => collides(part, box))).toEqual([]);
    }
  });

  it("mounts the classroom fixtures on the usable front without private-area furniture", () => {
    const boxes = sceneBoxes({ mobiliario: true, equipos: true, sillas: true });
    expectValidBoxes(boxes);
    for (const box of boxes.filter((box) => bounds(box).y1 > 1e-9))
      expect(overlapsXZ(bounds(box), M.reservado), JSON.stringify(box)).toBe(
        false,
      );
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    const mural = boxes.find(
      (box) => near(box.s[0], 0.13) && near(box.s[1], 0.85),
    )!;
    [M.equipoMural.x, M.equipoMural.y, M.equipoMural.z].forEach((value, i) =>
      expect(mural.p[i]).toBeCloseTo(value),
    );
    const decal = boxes.find(
      (box) => near(box.s[0], 0.015) && near(box.s[1], 0.22),
    )!;
    expect(decal.p[0]).toBeCloseTo(M.equipoMural.x + 0.07);
    expect(decal.p[1]).toBeCloseTo(M.equipoMural.y);
    expect(decal.p[2]).toBeCloseTo(M.equipoMural.z);
    for (const [x, y, z] of [
      [0.16, 1.7, M.proyeccionZ],
      [0.194, 1.72, M.proyeccionZ],
      [0.18, 2.65, M.proyeccionZ],
      [0.21, 0.64, M.proyeccionZ],
      [2.5, M.H - 0.6, M.proyeccionZ],
      [2.5, M.H - 0.25, M.proyeccionZ],
      [2.31, M.H - 0.6, M.proyeccionZ + 0.06],
    ])
      expect(
        boxes.some(
          (box) => near(box.p[0], x) && near(box.p[1], y) && near(box.p[2], z),
        ),
      ).toBe(true);
  });
});
