import { L418 as M } from "./l418-layout";

export type VectorL418 = [number, number, number];
export interface CajaL418 {
  p: VectorL418;
  s: VectorL418;
}

/** Closed shell only: no observed interior or assumed contents. */
export function crearReservadoL418(): {
  muros: CajaL418[];
  tapa: CajaL418;
  base: CajaL418;
} {
  const r = M.reservado;
  const puerta = M.puertas.find((p) => p.uso === "zonaReservada")!;
  const t = r.espesor;
  const ancho = r.x1 - r.x0;
  const fondo = r.z1 - r.z0;
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  // The rough opening includes both jambs and the top of the black frame.
  const izquierda = puerta.x - puerta.ancho / 2 - 0.07;
  const derecha = puerta.x + puerta.ancho / 2 + 0.07;
  const dintel = puerta.alto + 0.08;
  return {
    muros: [
      { p: [r.x0 + t / 2, r.alto / 2, cz], s: [t, r.alto, fondo] },
      { p: [r.x1 - t / 2, r.alto / 2, cz], s: [t, r.alto, fondo] },
      { p: [cx, r.alto / 2, r.z0 + t / 2], s: [ancho - 2 * t, r.alto, t] },
      {
        p: [(r.x0 + t + izquierda) / 2, r.alto / 2, r.z1 - t / 2],
        s: [izquierda - r.x0 - t, r.alto, t],
      },
      {
        p: [(derecha + r.x1 - t) / 2, r.alto / 2, r.z1 - t / 2],
        s: [r.x1 - t - derecha, r.alto, t],
      },
      {
        p: [puerta.x, (dintel + r.alto) / 2, r.z1 - t / 2],
        s: [derecha - izquierda, r.alto - dintel, t],
      },
    ],
    tapa: { p: [cx, r.alto - t / 2, cz], s: [ancho, t, fondo] },
    base: { p: [cx, -0.12, cz], s: [ancho, 0.24, fondo] },
  };
}

/** Mount the reserved leaf inside its wall; hardware always faces the classroom. */
export function crearGeometriaPuertaL418(puerta: (typeof M.puertas)[number]): {
  hoja: CajaL418;
  marcos: CajaL418[];
  protector: CajaL418;
  manilla: VectorL418;
} {
  const { x, ancho, alto } = puerta;
  const reservada = puerta.uso === "zonaReservada";
  const z = puerta.z - (reservada ? M.reservado.espesor / 2 : 0);
  const cara = reservada ? 1 : -1;
  return {
    hoja: { p: [x, alto / 2, z], s: [ancho, alto, 0.075] },
    marcos: [
      ...[-1, 1].map((lado): CajaL418 => ({
        p: [
          x + lado * (ancho / 2 + 0.035),
          (alto + (reservada ? 0.08 : 0)) / 2,
          z,
        ],
        s: [0.07, alto + 0.08, 0.15],
      })),
      { p: [x, alto + 0.04, z], s: [ancho + 0.14, 0.08, 0.15] },
    ],
    protector: {
      p: [x, 0.11, z + cara * 0.043],
      s: [ancho - 0.03, 0.18, 0.012],
    },
    manilla: [x - ancho * 0.31, 1.02, z + cara * 0.08],
  };
}

/** Only the corridor facade has a general door; the exterior bay has no hole. */
export function crearMurosLateralesL418(indice: number): {
  muros: CajaL418[];
  puerta?: (typeof M.puertas)[number];
} {
  const { x0, x1, z } = M.vidrios[indice];
  const puerta = M.puertas.find((p) => p.z === z);
  const tramos = puerta
    ? [
        [0, puerta.x - puerta.ancho / 2],
        [puerta.x + puerta.ancho / 2, x0],
        [x1, M.L],
      ]
    : [
        [0, x0],
        [x1, M.L],
      ];
  const muros: CajaL418[] = tramos.map(([a, b]) => ({
    p: [(a + b) / 2, M.H / 2, z],
    s: [b - a, M.H, 0.2],
  }));
  if (puerta)
    muros.push({
      p: [puerta.x, (puerta.alto + M.H) / 2, z],
      s: [puerta.ancho, M.H - puerta.alto, 0.2],
    });
  return { muros, puerta };
}

/** Approximate slabs: their union is the L-shaped usable classroom only. */
export function crearSuelosL418(): CajaL418[] {
  return M.suelosUtiles.map(({ x0, x1, z0, z1 }) => ({
    p: [(x0 + x1) / 2, -0.12, (z0 + z1) / 2],
    s: [x1 - x0, 0.24, z1 - z0],
  }));
}
