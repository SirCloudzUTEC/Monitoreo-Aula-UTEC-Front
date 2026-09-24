// Pure layout data for the 3D classroom twin (no three.js). Kept apart from
// classroom-scene.tsx so pages can use it without pulling three/r3f/drei into
// their bundle: only the lazily loaded scene imports those.
//
// L-419 geometry follows the corner-by-corner photo audit (see the header of
// classroom-scene.tsx and docs/AUDITORIA_MOBILIARIO_L419.md).

import type { Aula, NodoId } from "@/lib/types";

export interface NodoMeta {
  etiqueta: string;
  descripcion: string;
}

export const NODO_META: Record<NodoId, NodoMeta> = {
  nodoAmbiental: {
    etiqueta: "Nodo ambiental",
    descripcion:
      "SHT31 (temperatura/humedad), SCD41 (CO2), SEN55 (PM2.5/COV), VEML7700 (luz) e INMP441 (ruido).",
  },
  nodoPuerta: {
    etiqueta: "Nodo puerta",
    descripcion:
      "Reed switch de estado de puerta, PN532 (RFID/NFC) y 2x VL53L1X para conteo bidireccional.",
  },
  nodoVentana1: {
    etiqueta: "Nodo ventana 1",
    descripcion: "Radar mmWave LD2410C: presencia y proximidad a la ventana.",
  },
  nodoVentana2: {
    etiqueta: "Nodo ventana 2",
    descripcion: "Radar mmWave LD2410C: presencia y proximidad a la ventana.",
  },
  procesadorAula: {
    etiqueta: "Procesador de aula",
    descripcion:
      "Raspberry Pi 4: adquisicion BLE/Wi-Fi, reglas de eventos y buffer offline.",
  },
};

export interface Capas {
  estructura: boolean;
  vidrios: boolean;
  techo: boolean;
  luminarias: boolean;
  ventilacion: boolean;
  contraincendios: boolean;
  mobiliario: boolean;
  equipos: boolean;
  sillas: boolean;
  sensores: boolean;
}

export const CAPAS_TODAS: Capas = {
  estructura: true,
  vidrios: true,
  techo: true,
  luminarias: true,
  ventilacion: true,
  contraincendios: true,
  mobiliario: true,
  equipos: true,
  sillas: true,
  sensores: true,
};

export interface RowSpec {
  x0: number;
  len: number;
  zc: number;
  seats: number;
}

export interface Layout {
  L: number;
  W: number;
  H: number;
  estimada: boolean;
  /** door on the LEFT wall, near the BACK corner (entry) */
  door: { cx: number; w: number; h: number };
  /** interior glass (luna interna) span on the left wall */
  leftGlass: { x0: number; x1: number };
  /** concrete column between door and glass start */
  entryColumnX?: number;
  /** ventilation grille + electrical box on the front-left white segment */
  leftVent?: { x: number; w: number };
  /** recessed back-right corner: wall pulled in by `depth` for x < `len` */
  alcove?: { len: number; depth: number };
  /** street windows with sill (right wall); absent = solid wall */
  streetWindows?: {
    sill: number;
    head: number;
    piers: number[];
    bays: [number, number][];
  };
  /** white metal cabinets along the back wall (entry corner, to its right) */
  cabinets?: { z0: number; z1: number };
  /** mobile whiteboard near the front-left */
  mobileBoard?: { x: number; z: number; rot: number };
  /** free-standing concrete column (separated from walls, per user photo) */
  freeColumn?: { x: number; z: number };
  /** wall-attached vertical concrete columns (user plan, purple marks) */
  wallColumns?: { x: number; z: number }[];
  /** ceiling light fixtures: linear bars (long axis along x) */
  lights: { x: number; z: number }[];
  rows: RowSpec[];
  simpleTables: { x: number; z: number }[];
  teacherDesk: { x: number; z: number } | null;
  proyector: { x: number; z: number };
  sensores: Partial<Record<NodoId, [number, number, number]>>;
}

/** Layout for each aula. L-419 follows the corner photo audit. */
export function buildLayout(aula: Aula): Layout {
  if (aula.codigo === "L-419") {
    const L = 12.5;
    const W = 8.6;
    const H = 3.4;
    return {
      L,
      W,
      H,
      estimada: true,
      door: { cx: 1.15, w: 1.05, h: 2.1 },
      leftGlass: { x0: 2.15, x1: 10.7 },
      entryColumnX: 1.9,
      leftVent: { x: 11.75, w: 1.15 },
      alcove: { len: 2.3, depth: 0.95 },
      streetWindows: {
        sill: 0.95,
        head: 2.55,
        piers: [5.5, 8.8],
        bays: [
          [2.55, 5.25],
          [5.75, 8.55],
          [9.05, 12.0],
        ],
      },
      cabinets: { z0: 1.35, z1: 6.35 },
      freeColumn: { x: 10.7, z: 7.3 },
      // 3 columnas verticales pegadas (marcas moradas del plano): junto a la
      // puerta, en la esquina interior de la cavidad, y en la esquina
      // frontal-derecha; las vigas perimetrales (verdes) las conectan.
      wallColumns: [
        { x: 1.9, z: 0.3 },
        { x: 2.3, z: 8.1 },
        { x: 12.15, z: 8.25 },
      ],
      // 19 luminarias reales: 3 filas de 5 (la primera junto al escritorio del
      // profesor) + la fila cercana a la puerta con solo 4 (la cavidad de la
      // esquina hundida le quita el espacio de la quinta).
      lights: [
        ...[9.7, 7.7, 4.9].flatMap((lx) =>
          [1.0, 2.6, 4.2, 5.8, 7.4].map((lz) => ({ x: lx, z: lz })),
        ),
        ...[1.0, 2.6, 4.2, 5.8].map((lz) => ({ x: 2.1, z: lz })),
      ],
      rows: [
        { x0: 1.3, len: 8.6, zc: 1.7, seats: 5 },
        { x0: 1.3, len: 8.6, zc: 4.15, seats: 5 },
        { x0: 1.3, len: 8.6, zc: 6.6, seats: 5 },
      ],
      simpleTables: [
        { x: 3.2, z: 7.8 },
        { x: 6.9, z: 7.8 },
      ],
      teacherDesk: { x: 10.9, z: 1.6 },
      proyector: { x: 8.2, z: 3.9 },
      sensores: {
        nodoAmbiental: [5.6, 3.05, 4.3],
        nodoPuerta: [1.15, 2.35, 0.22],
        nodoVentana1: [4.0, 2.1, W - 0.22],
        nodoVentana2: [7.2, 2.1, W - 0.22],
        procesadorAula: [0.3, 2.95, 4.3],
      },
    };
  }
  // Generic layout (A-1001 and future aulas) driven by the aula spec.
  const L = aula.largo;
  const W = aula.ancho;
  const H = aula.alto;
  const sensores: Layout["sensores"] = {};
  if (aula.nodos.includes("nodoAmbiental")) sensores.nodoAmbiental = [L / 2, H - 0.35, W / 2];
  if (aula.nodos.includes("nodoPuerta")) sensores.nodoPuerta = [0.8, 2.3, 0.22];
  if (aula.nodos.includes("procesadorAula")) sensores.procesadorAula = [0.3, H - 0.45, W / 2];
  if (aula.nodos.includes("nodoVentana1")) sensores.nodoVentana1 = [L * 0.3, 2, W - 0.22];
  if (aula.nodos.includes("nodoVentana2")) sensores.nodoVentana2 = [L * 0.62, 2, W - 0.22];
  const conVentanas = aula.ventanas > 0;
  return {
    L,
    W,
    H,
    estimada: false,
    door: { cx: 0.8, w: 1.05, h: 2.1 },
    leftGlass: { x0: 1.72, x1: L - 1.2 },
    entryColumnX: 1.5,
    streetWindows: conVentanas
      ? {
          sill: 0.95,
          head: Math.min(2.55, H - 0.4),
          piers: [L / 2],
          bays: [
            [1.2, L / 2 - 0.3],
            [L / 2 + 0.3, L - 1.2],
          ],
        }
      : undefined,
    rows: [
      { x0: 1, len: L - 3, zc: W * 0.28, seats: 5 },
      { x0: 1, len: L - 3, zc: W * 0.62, seats: 5 },
    ],
    simpleTables: [{ x: L * 0.35, z: W - 0.9 }],
    teacherDesk: { x: L - 1.4, z: W * 0.22 },
    proyector: { x: L * 0.6, z: W * 0.45 },
    lights: [L * 0.25, L * 0.5, L * 0.75].flatMap((lx) =>
      [W * 0.25, W * 0.5, W * 0.75].map((lz) => ({ x: lx, z: lz })),
    ),
    sensores,
  };
}
