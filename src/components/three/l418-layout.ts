// L-418: axes x=0 projection/front -> x=L rear; z=0 exterior -> z=W corridor.
// 32 separate tables, 2 groups of16 / 8 per side, and closed laptops were
// confirmed by the owner. Dimensions and other inventory are photo estimates.
export interface PuestoL418 {
  x: number;
  z: number;
  grupo: number;
  lado: -1 | 1;
  rot: number;
}

const largo = 1.16;
const baseCorta = 0.72;
const fondo = 0.72;
const mesa = {
  largo,
  baseCorta,
  fondo,
  alto: 0.75,
  contorno: [
    [-largo / 2, -fondo / 2],
    [largo / 2, -fondo / 2],
    [baseCorta / 2, fondo / 2],
    [-baseCorta / 2, fondo / 2],
  ] as [number, number][],
};

// Shared transverse geometry: increasing the reserved depth adds the SAME
// distance to the window-side circulation; bank spacing/corridor margin stay.
export function crearTransversalL418(fondoReservado: number) {
  if (!Number.isFinite(fondoReservado) || fondoReservado <= 0) {
    throw new RangeError("El fondo reservado debe ser positivo y finito");
  }
  const redondear = (n: number) => Number(n.toFixed(6));
  const W = redondear(fondoReservado + 8);
  const centrosBancos: [number, number] = [
    redondear(fondoReservado + 1.7),
    redondear(fondoReservado + 5.9),
  ];
  return {
    W,
    centrosBancos,
    centroBancos: redondear((centrosBancos[0] + centrosBancos[1]) / 2),
    proyeccionZ: redondear((fondoReservado + W) / 2),
    pasoExterior: redondear(centrosBancos[0] - mesa.fondo / 2 - 0.76 - 0.31),
  };
}

// Preserve the original 4.2 m group-to-group spacing. The added width is a
// photo-estimated envelope, not a narrower central aisle. The usable outline
// also excludes the protruding reserved volume; it is NOT a plain rectangle.
const L = 11.8;
// Visible enclosure at the front/exterior corner. Only its shell is modeled;
// these extents are estimates, not a survey or a claim about the hidden use.
const reservado = {
  x0: 0,
  x1: 2.6,
  z0: 0,
  z1: 2.4,
  alto: 3.3,
  espesor: 0.12,
  dimensionesEstimadas: true,
  interiorLevantado: false,
};
const { W, centrosBancos, centroBancos, proyeccionZ, pasoExterior } =
  crearTransversalL418(reservado.z1);

function crearPuestos(): PuestoL418[] {
  const puestos: PuestoL418[] = [];
  for (const [grupo, centro] of centrosBancos.entries()) {
    for (const lado of [-1, 1] as const) {
      for (let i = 0; i < 8; i++) {
        puestos.push({
          x: 2.26 + (i * (largo + baseCorta)) / 2,
          z: centro + lado * 0.36,
          grupo,
          lado,
          rot: ((i + (lado === 1 ? 1 : 0)) % 2) * Math.PI,
        });
      }
    }
  }
  return puestos;
}

const puestos = crearPuestos();
const escritorio = { x: 0.8, z: reservado.z1 + 0.75 };

export const L418 = {
  L,
  W,
  H: 3.3,
  estimada: true,
  reservado,
  pasoExterior,
  plantaUtil: [
    [0, reservado.z1],
    [reservado.x1, reservado.z1],
    [reservado.x1, 0],
    [L, 0],
    [L, W],
    [0, W],
  ] as [number, number][],
  suelosUtiles: [
    { x0: 0, x1: L, z0: reservado.z1, z1: W },
    { x0: reservado.x1, x1: L, z0: 0, z1: reservado.z1 },
  ],
  camara: [18, 12, Number((W + 8.4).toFixed(6))] as [number, number, number],
  escritorio,
  // Clear the wall equipment without moving the desk or leaving its width.
  sillaDocente: { x: escritorio.x - 0.5, z: escritorio.z + 0.2 },
  equipoMural: { x: 0.08, y: 1.35, z: escritorio.z - 0.4 },
  tacho: { x: 0.65, z: Number((W - 0.45).toFixed(6)) },
  proyeccionZ,
  pizarras: [proyeccionZ - 2.1, proyeccionZ + 2.15],
  mesa,
  puestos,
  sillas: puestos.map((p) => ({
    x: p.x,
    z: p.z + p.lado * 0.76,
    rot: p.lado === -1 ? 0 : Math.PI,
  })),
  laptops: puestos.map((p) => ({ x: p.x, z: p.z, cerrada: true as const })),
  puertas: [
    {
      uso: "entradaSalida",
      x: 0.85,
      z: W,
      ancho: 1.02,
      alto: 2.2,
      mirilla: true,
    },
    {
      uso: "zonaReservada",
      x: 1.75,
      z: reservado.z1,
      ancho: 1.02,
      alto: 2.2,
      mirilla: false,
    },
  ],
  vidrios: [
    { x0: 3.25, x1: 9.4, z: 0, alto: 2.85, pasillo: false },
    { x0: 2.35, x1: 9.35, z: W, alto: 2.8, pasillo: true },
  ],
  columnas: [
    { x: 2.9, z: 0.275, largo: 0.65, fondo: 0.55 },
    { x: 8.82, z: 0.325, largo: 0.7, fondo: 0.65 },
    { x: 1.78, z: W - 0.3, largo: 0.62, fondo: 0.6 },
    { x: 9.68, z: W - 0.27, largo: 0.58, fondo: 0.54 },
  ],
  armarios: [1.25, 2.2, 3.15].map((z) => ({ x: 11.45, z })),
  luminarias: [0.95, 3.55, 6.15, 8.75].flatMap((x) =>
    [reservado.z1 + 0.35, reservado.z1 + 3.2, W - 1.35].map((z) => ({ x, z })),
  ),
  enrolladores: [2.64, 4.6, 6.56, 8.52].flatMap((x) =>
    centrosBancos.map((z) => ({ x, z })),
  ),
  // Design proposal only: these nodes were NOT identified in the photographs.
  sensores: {
    nodoAmbiental: [5.6, 2.95, centroBancos],
    nodoPuerta: [0.85, 2.37, W - 0.22],
    nodoVentana1: [5.5, 1.4, 0.18],
    nodoVentana2: [5.5, 1.4, W - 0.18],
    procesadorAula: [0.3, 1.25, Number((W - 1.8).toFixed(6))],
  } satisfies Record<string, [number, number, number]>,
};
