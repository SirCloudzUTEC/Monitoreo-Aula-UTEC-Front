// Pure geometry for the A-1001 digital twin (no three.js). Built from the
// six photos taken on site (September 2026); every number is an estimate
// in meters unless it comes from aulas.json.
//
// Reference frame (same convention as the rest of the app):
//   x = 0  back wall (white panels, roll-down screen)  ->  x = L  front wall
//          (exposed concrete, whiteboards, interactive display)
//   z = 0  LEFT wall when facing the front: fixed floor-to-ceiling glazing
//          with the city view                              ->  z = W  RIGHT
//          wall: corridor side, white, high frosted strip and the 2 doors
//   y = 0  floor (teal vinyl)                              ->  y = H  ceiling
//
//            z = 0 (ventanal fijo)
//   x=0  +---------------------------------+  x=L
//   FONDO|  [pantalla enrollable]           |FRENTE
//        |  carpetas 5 filas x 4 pares      |  pizarra izq.
//        |                                  |  pantalla interactiva
//        |  puerta 2 (fondo)   puerta 1 -> |  pizarra der. + podio
//        +---------------------------------+
//            z = W (pasillo, franja alta)

import type { NodoId } from "@/lib/types";

export interface XZ {
  x: number;
  z: number;
}

/** A door in the RIGHT wall (z = W). `cx` is the door center along x. */
export interface PuertaA1001 {
  cx: number;
  w: number;
  h: number;
  /** clear-glass transom over the leaf (photo 4) */
  transom: boolean;
}

export interface LayoutA1001 {
  L: number;
  W: number;
  H: number;
  /** proportions estimated from photos, not surveyed */
  estimada: true;

  /** fixed curtain wall on the left wall (z = 0) */
  ventanal: {
    x0: number;
    x1: number;
    /** vertical mullion pitch */
    paso: number;
    /** heights of the horizontal transoms */
    travesanos: number[];
  };
  /** concrete pier at the back-left corner and column at the front-left corner */
  pilarFondo: { x0: number; x1: number; z0: number; z1: number };
  columnaFrente: { x0: number; x1: number; z0: number; z1: number };

  /** corridor wall (z = W) */
  pasillo: {
    /** frosted clerestory strip */
    franjaAlta: { x0: number; x1: number; y0: number; y1: number; paso: number };
    puertas: PuertaA1001[];
    /** wall-attached concrete column between the doors */
    columnaX: number;
  };

  /** front wall (x = L) */
  frente: {
    /** protruding concrete section that carries the right whiteboard */
    resalte: { z0: number; z1: number; fondo: number };
    pizarras: { z0: number; z1: number; y0: number; y1: number }[];
    /** interactive display on its rolling stand, facing the students */
    pantallaInteractiva: { z: number; ancho: number; alto: number; yCentro: number };
    /** small black loudspeaker high on the left end */
    parlantePared: { z: number; y: number };
    /** black amplifier/connection box under the left whiteboard */
    cajaNegra: { z: number; y: number };
    /** "no comer" / "silencio" signs over the display */
    senales: { z: number; y: number }[];
    tomacorrientes: number[];
  };

  /** back wall (x = 0) */
  fondo: {
    pantallaEnrollable: { cz: number; ancho: number; y0: number; y1: number };
    letrero: { z: number; y: number };
  };

  /** exposed concrete beams under the acoustic ceiling */
  vigas: ({ eje: "x"; z: number } | { eje: "z"; x: number })[];
  /** galvanized cable trays hanging next to the beams */
  bandejas: ({ eje: "x"; z: number; x0: number; x1: number } | { eje: "z"; x: number; z0: number; z1: number })[];
  /** suspended linear LED bars (long axis along x) */
  luminarias: XZ[];
  proyectores: { x: number; z: number; mira: "frente" | "fondo" }[];
  parlantesTecho: XZ[];
  detectoresHumo: XZ[];
  /** white wall unit on the front-left column (looks like a split A/C indoor unit) */
  unidadPared: { x: number; y: number; z: number };
  /** small wall TV on the front-left column */
  tvPared: { x: number; y: number; z: number };

  /** one entry per student desk; chairs sit behind each desk (toward x = 0) */
  carpetas: XZ[];
  carpeta: { ancho: number; fondo: number; alto: number };
  podio: { x: number; z: number; ancho: number; fondo: number; alto: number };
  sillaDocente: XZ;
  tacho: XZ;

  sensores: Partial<Record<NodoId, [number, number, number]>>;
}

const L = 10;
const W = 8;
const H = 3.2;

/** 5 rows facing the front, 4 desk pairs per row (8 desks), 40 in total. */
function gridCarpetas(): XZ[] {
  const filas = [2.05, 3.3, 4.55, 5.8, 7.05];
  const pares = [1.3, 2.7, 5.3, 6.7];
  const out: XZ[] = [];
  for (const x of filas) {
    for (const c of pares) {
      out.push({ x, z: c - 0.31 });
      out.push({ x, z: c + 0.31 });
    }
  }
  return out;
}

export const A1001: LayoutA1001 = {
  L,
  W,
  H,
  estimada: true,

  ventanal: { x0: 0.5, x1: 9.3, paso: 1.1, travesanos: [0.72, 2.45] },
  pilarFondo: { x0: 0, x1: 0.5, z0: 0, z1: 0.36 },
  columnaFrente: { x0: 9.3, x1: L, z0: 0, z1: 0.58 },

  pasillo: {
    franjaAlta: { x0: 0.35, x1: 9.65, y0: 2.4, y1: 2.95, paso: 1.15 },
    puertas: [
      { cx: L - 0.9, w: 0.95, h: 2.1, transom: true },
      { cx: 0.9, w: 0.95, h: 2.1, transom: true },
    ],
    columnaX: 6.1,
  },

  frente: {
    resalte: { z0: 5.05, z1: 7.6, fondo: 0.18 },
    pizarras: [
      { z0: 0.75, z1: 3.85, y0: 0.95, y1: 2.15 },
      { z0: 5.3, z1: 7.4, y0: 0.95, y1: 2.15 },
    ],
    pantallaInteractiva: { z: 4.4, ancho: 1.72, alto: 0.98, yCentro: 1.55 },
    parlantePared: { z: 0.55, y: 2.75 },
    cajaNegra: { z: 1.35, y: 1.15 },
    senales: [
      { z: 4.12, y: 2.5 },
      { z: 4.4, y: 2.5 },
    ],
    tomacorrientes: [0.95, 2.4, 3.55, 6.85],
  },

  fondo: {
    pantallaEnrollable: { cz: 2.4, ancho: 2.0, y0: 0.95, y1: 2.55 },
    letrero: { z: 6.4, y: 1.75 },
  },

  // longitudinal beam carrying the cable tray, transverse beam by the front
  // wall, and the concrete lintel that caps the glazing (photos 1, 3, 5)
  vigas: [
    { eje: "x", z: 2.85 },
    { eje: "z", x: 8.35 },
    { eje: "x", z: 0.2 },
  ],
  bandejas: [
    { eje: "z", x: 8.0, z0: 0.6, z1: 7.45 },
    { eje: "x", z: 3.15, x0: 0.6, x1: 8.0 },
  ],
  // 3 bars over the back rows + 2 over the front zone (user count)
  luminarias: [
    { x: 2.7, z: 1.55 },
    { x: 2.7, z: 4.0 },
    { x: 2.7, z: 6.45 },
    { x: 7.0, z: 2.45 },
    { x: 7.0, z: 5.55 },
  ],
  proyectores: [
    { x: 8.05, z: 4.05, mira: "fondo" },
    { x: 1.55, z: 4.2, mira: "frente" },
  ],
  parlantesTecho: [
    { x: 3.0, z: 5.6 },
    { x: 7.3, z: 2.1 },
  ],
  detectoresHumo: [
    { x: 2.2, z: 2.3 },
    { x: 5.9, z: 6.3 },
    { x: 8.7, z: 4.7 },
  ],
  unidadPared: { x: 9.65, y: 2.62, z: 0.58 },
  tvPared: { x: 9.65, y: 1.95, z: 0.58 },

  carpetas: gridCarpetas(),
  carpeta: { ancho: 0.6, fondo: 0.5, alto: 0.74 },
  podio: { x: 8.85, z: 1.0, ancho: 0.95, fondo: 0.6, alto: 1.05 },
  sillaDocente: { x: 8.85, z: 1.85 },
  tacho: { x: L - 0.45, z: W - 0.8 },

  sensores: {
    nodoAmbiental: [5.0, H - 0.3, 4.0],
    nodoPuerta: [L - 0.9, 2.3, W - 0.24],
    procesadorAula: [0.35, H - 0.45, W - 1.1],
  },
};
