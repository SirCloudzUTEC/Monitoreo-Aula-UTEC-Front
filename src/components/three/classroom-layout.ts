// Pure layout data for the 3D classroom twin (no three.js). Kept apart from
// classroom-scene.tsx so pages can use it without pulling three/r3f/drei into
// their bundle: only the lazily loaded scene imports those.

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
  mobiliario: boolean;
  equipos: boolean;
  sillas: boolean;
  sensores: boolean;
}

export const CAPAS_TODAS: Capas = {
  estructura: true,
  vidrios: true,
  techo: true,
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
  door: { cx: number; w: number; h: number };
  rows: RowSpec[];
  simpleTables: { x: number; z: number }[];
  teacherDesk: { x: number; z: number } | null;
  rightGlazing: boolean;
  sensores: Partial<Record<NodoId, [number, number, number]>>;
}

/** Layout for each aula. L-419 uses estimated real proportions from photos. */
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
      door: { cx: 11.85, w: 1.05, h: 2.1 },
      rows: [
        { x0: 1.3, len: 8.6, zc: 1.7, seats: 6 },
        { x0: 1.3, len: 8.6, zc: 4.15, seats: 6 },
        { x0: 1.3, len: 8.6, zc: 6.6, seats: 6 },
      ],
      simpleTables: [
        { x: 3.2, z: 7.8 },
        { x: 6.9, z: 7.8 },
      ],
      teacherDesk: { x: 10.9, z: 1.6 },
      rightGlazing: true,
      sensores: {
        nodoAmbiental: [L * 0.45, 3.05, W * 0.5],
        nodoPuerta: [11.85, 2.4, 0.2],
        nodoVentana1: [L * 0.3, 2.15, W - 0.2],
        nodoVentana2: [L * 0.62, 2.15, W - 0.2],
        procesadorAula: [0.3, 2.95, W * 0.5],
      },
    };
  }
  const L = aula.largo;
  const W = aula.ancho;
  const H = aula.alto;
  const sensores: Layout["sensores"] = {};
  if (aula.nodos.includes("nodoAmbiental")) sensores.nodoAmbiental = [L / 2, H - 0.35, W / 2];
  if (aula.nodos.includes("nodoPuerta")) sensores.nodoPuerta = [L - 0.65, 2.3, 0.2];
  if (aula.nodos.includes("procesadorAula")) procesador(sensores, L, W, H);
  if (aula.nodos.includes("nodoVentana1")) sensores.nodoVentana1 = [L * 0.3, 2, W - 0.2];
  if (aula.nodos.includes("nodoVentana2")) sensores.nodoVentana2 = [L * 0.62, 2, W - 0.2];
  return {
    L,
    W,
    H,
    estimada: false,
    door: { cx: L - 0.65 - 0, w: 1.05, h: 2.1 },
    rows: [
      { x0: 1, len: L - 3, zc: W * 0.28, seats: 5 },
      { x0: 1, len: L - 3, zc: W * 0.62, seats: 5 },
    ],
    simpleTables: [{ x: L * 0.35, z: W - 0.9 }],
    teacherDesk: { x: L - 1.4, z: W * 0.22 },
    rightGlazing: aula.ventanas > 0,
    sensores,
  };
}

function procesador(
  s: Layout["sensores"],
  L: number,
  W: number,
  H: number,
) {
  s.procesadorAula = [0.3, H - 0.45, W / 2];
}
