"use client";

// LOD 2.5 classroom twin for L-419, rebuilt from the user's photo audit.
// Reference frame = the user's photo viewpoint, standing at the BACK wall:
//   +x runs from the back wall (x=0) to the FRONT wall (projection screen).
//   z=0 is the LEFT wall (glass partition to the corridor + brown door).
//   z=W is the RIGHT wall (floor-to-ceiling street glazing).
// Layer toggles (capas) let the user strip the room down to the shell.

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
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

interface RowSpec {
  x0: number;
  len: number;
  zc: number;
  seats: number;
}

interface Layout {
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

const C = {
  floor: "#a4a8ab",
  wallWhite: "#edebe7",
  concrete: "#b6b3ae",
  panel: "#cec7b6",
  glass: "#a8d2e4",
  frosted: "#dbe7ec",
  mullion: "#787f85",
  door: "#5d4a3a",
  deskTop: "#f1f0ed",
  deskFrame: "#9aa0a4",
  black: "#141618",
  chair: "#35383c",
  chairDark: "#232527",
  screenDark: "#0e1113",
  redPipe: "#b03a2e",
  lightFix: "#f6f8f9",
  credenza: "#f4f3f0",
  conduit: "#b3bac0",
  sensor: "#37bbec",
  sensorSelected: "#f2b705",
  exitGreen: "#1f8a4c",
};

type V3 = [number, number, number];

function Box({
  p,
  s,
  color,
  rough = 0.8,
  metal = 0,
  opacity,
  emissive,
  emissiveIntensity,
  rotY = 0,
  castShadow = false,
}: {
  p: V3;
  s: V3;
  color: string;
  rough?: number;
  metal?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  rotY?: number;
  castShadow?: boolean;
}) {
  return (
    <mesh position={p} rotation={[0, rotY, 0]} castShadow={castShadow} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={rough}
        metalness={metal}
        transparent={opacity !== undefined}
        opacity={opacity}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissiveIntensity ?? 0}
      />
    </mesh>
  );
}

function Cyl({
  p,
  r,
  h,
  color,
  along = "y",
  rough = 0.6,
}: {
  p: V3;
  r: number;
  h: number;
  color: string;
  along?: "x" | "y" | "z";
  rough?: number;
}) {
  const rot: V3 =
    along === "x" ? [0, 0, Math.PI / 2] : along === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={p} rotation={rot}>
      <cylinderGeometry args={[r, r, h, 12]} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}

/** Office chair with visible high backrest (photo: black task chairs). */
function Chair({ x, z, facing }: { x: number; z: number; facing: 1 | -1 }) {
  return (
    <group position={[x, 0, z]}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <Box
          key={deg}
          p={[0.24 * Math.cos((deg * Math.PI) / 180), 0.03, 0.24 * Math.sin((deg * Math.PI) / 180)]}
          s={[0.3, 0.04, 0.07]}
          color={C.chairDark}
          rotY={(-deg * Math.PI) / 180}
        />
      ))}
      <Cyl p={[0, 0.26, 0]} r={0.028} h={0.42} color={C.chairDark} />
      <Cyl p={[0, 0.49, 0]} r={0.245} h={0.07} color={C.chair} rough={0.85} />
      <Box p={[0, 0.83, 0.2 * facing]} s={[0.46, 0.55, 0.07]} color={C.chair} rough={0.85} castShadow />
    </group>
  );
}

/** Monitor + keyboard for one seat; screen faces the seated user. */
function Workstation({ x, z, facing }: { x: number; z: number; facing: 1 | -1 }) {
  const mz = z + 0.2 * facing;
  return (
    <group>
      <Cyl p={[x, 0.765, mz]} r={0.09} h={0.015} color={C.black} />
      <Cyl p={[x, 0.87, mz]} r={0.02} h={0.2} color={C.black} />
      <Box p={[x, 1.11, mz]} s={[0.56, 0.35, 0.03]} color={C.screenDark} rough={0.35} />
      <Box p={[x, 0.77, z - 0.16 * facing]} s={[0.44, 0.016, 0.15]} color={C.black} />
    </group>
  );
}

function SensorMarker({
  nodo,
  position,
  selected,
  onSelect,
}: {
  nodo: NodoId;
  position: V3;
  selected: boolean;
  onSelect: (n: NodoId) => void;
}) {
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(nodo);
        }}
      >
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial
          color={selected ? C.sensorSelected : C.sensor}
          emissive={selected ? C.sensorSelected : C.sensor}
          emissiveIntensity={selected ? 0.85 : 0.45}
        />
      </mesh>
      {selected && (
        <Html center distanceFactor={9} position={[0, 0.3, 0]} style={{ pointerEvents: "none" }}>
          <span
            style={{
              whiteSpace: "nowrap",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "9999px",
              background: "rgba(242,183,5,0.94)",
              color: "#1c1502",
              fontWeight: 600,
            }}
          >
            {NODO_META[nodo].etiqueta}
          </span>
        </Html>
      )}
    </group>
  );
}

export function ClassroomScene({
  aula,
  capas,
  selected,
  onSelect,
}: {
  aula: Aula;
  capas: Capas;
  selected: NodoId | null;
  onSelect: (n: NodoId | null) => void;
}) {
  const lay = useMemo(() => buildLayout(aula), [aula]);
  const { L, W, H, door } = lay;
  const doorX0 = door.cx - door.w / 2;
  const doorX1 = door.cx + door.w / 2;

  // Per-seat positions for equipment/chairs, derived once from the rows.
  const seatSpots = useMemo(() => {
    const spots: { x: number; z: number; facing: 1 | -1 }[] = [];
    for (const row of lay.rows) {
      const step = row.len / row.seats;
      for (let i = 0; i < row.seats; i++) {
        const sx = row.x0 + step * (i + 0.5);
        spots.push({ x: sx, z: row.zc - 0.36, facing: 1 });
        spots.push({ x: sx, z: row.zc + 0.36, facing: -1 });
      }
    }
    return spots;
  }, [lay]);

  const acousticPanels = useMemo(() => {
    const panels: V3[] = [];
    for (let px = 1.4; px < L - 0.7; px += 2.6) {
      for (let pz = 1.15; pz < W - 0.6; pz += 2.1) {
        panels.push([px, H - 0.02, pz]);
      }
    }
    return panels;
  }, [L, W, H]);

  return (
    <Canvas
      shadows
      camera={{ position: [-4.5, 6.2, 1.2], fov: 48 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#0d1319"]} />
      <ambientLight intensity={0.52} />
      <hemisphereLight args={["#e2ebf1", "#3b3e42", 0.45]} />
      <directionalLight
        position={[L * 0.5, H * 1.8, W + 6]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-4, H * 2.4, -3]} intensity={0.35} />

      {/* ============ ESTRUCTURA ============ */}
      <group visible={capas.estructura}>
        {/* epoxy floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / 2, 0, W / 2]} receiveShadow>
          <planeGeometry args={[L, W]} />
          <meshStandardMaterial color={C.floor} roughness={0.22} metalness={0.12} />
        </mesh>
        {/* FRONT wall (x=L): screen + whiteboards live here */}
        <mesh position={[L, H / 2, W / 2]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
        </mesh>
        {/* BACK wall (x=0) */}
        <mesh position={[0, H / 2, W / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
        </mesh>
        {/* LEFT wall: only the solid pieces (glass partition is in vidrios) */}
        <Box p={[door.cx, (door.h + H) / 2, 0.05]} s={[door.w, H - door.h, 0.1]} color={C.wallWhite} />
        {doorX1 < L && (
          <mesh position={[(doorX1 + L) / 2, H / 2, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={[L - doorX1, H]} />
            <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
          </mesh>
        )}
        {/* brown door + handle + exit sign */}
        <Box p={[door.cx, door.h / 2, 0.06]} s={[door.w, door.h, 0.08]} color={C.door} rough={0.55} castShadow />
        <Box p={[door.cx - door.w * 0.32, 1.05, 0.12]} s={[0.14, 0.6, 0.02]} color={"#cfd4d8"} rough={0.3} metal={0.6} />
        <Box
          p={[door.cx, door.h + 0.28, 0.12]}
          s={[0.4, 0.2, 0.04]}
          color={C.exitGreen}
          emissive={C.exitGreen}
          emissiveIntensity={0.7}
        />
        {/* RIGHT wall: solid only when there is no glazing */}
        {!lay.rightGlazing && (
          <mesh position={[L / 2, H / 2, W]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[L, H]} />
            <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
          </mesh>
        )}
        {/* concrete columns on the glazed side */}
        {lay.rightGlazing &&
          [L / 3, (2 * L) / 3].map((cx, i) => (
            <Box key={i} p={[cx, H / 2, W - 0.24]} s={[0.4, H, 0.45]} color={C.concrete} />
          ))}
      </group>

      {/* ============ VIDRIOS ============ */}
      <group visible={capas.vidrios}>
        {/* LEFT glass partition to the corridor (0 → door) */}
        <mesh position={[doorX0 / 2, H / 2, 0]}>
          <planeGeometry args={[doorX0, H]} />
          <meshStandardMaterial color={C.glass} transparent opacity={0.16} roughness={0.08} side={2} />
        </mesh>
        <Box p={[doorX0 / 2, 1.35, 0.03]} s={[doorX0, 0.5, 0.02]} color={C.frosted} opacity={0.5} />
        {Array.from({ length: 8 }, (_, i) => (i * doorX0) / 7).map((mx, i) => (
          <Box key={i} p={[mx, H / 2, 0.02]} s={[0.07, H, 0.07]} color={C.mullion} />
        ))}
        <Box p={[doorX0 / 2, H - 0.08, 0.02]} s={[doorX0, 0.16, 0.07]} color={C.mullion} />
        <Box p={[doorX0 / 2, 0.08, 0.02]} s={[doorX0, 0.16, 0.07]} color={C.mullion} />
        {/* RIGHT street glazing, floor to ceiling */}
        {lay.rightGlazing && (
          <group>
            <Box p={[L / 2, 0.13, W - 0.03]} s={[L, 0.26, 0.08]} color={C.wallWhite} />
            <mesh position={[L / 2, (H + 0.26) / 2, W]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[L, H - 0.26]} />
              <meshStandardMaterial color={C.glass} transparent opacity={0.18} roughness={0.08} side={2} />
            </mesh>
            {Array.from({ length: 8 }, (_, i) => (i * L) / 7).map((mx, i) => (
              <Box key={i} p={[mx, H / 2, W - 0.02]} s={[0.07, H, 0.07]} color={C.mullion} />
            ))}
            <Box p={[L / 2, H - 0.08, W - 0.02]} s={[L, 0.16, 0.07]} color={C.mullion} />
          </group>
        )}
      </group>

      {/* ============ TECHO E INSTALACIONES ============ */}
      <group visible={capas.techo}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[L / 2, H, W / 2]}>
          <planeGeometry args={[L, W]} />
          <meshStandardMaterial color={C.concrete} roughness={0.95} />
        </mesh>
        {acousticPanels.map((p, i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={p}>
            <planeGeometry args={[2.4, 1.9]} />
            <meshStandardMaterial color={C.panel} roughness={0.95} />
          </mesh>
        ))}
        {/* concrete beams across the width */}
        {[L * 0.33, L * 0.66].map((bx, i) => (
          <Box key={i} p={[bx, H - 0.19, W / 2]} s={[0.45, 0.38, W]} color={C.concrete} />
        ))}
        {/* red fire pipes along the length */}
        {[2.1, W - 2.1].map((pz, i) => (
          <Cyl key={i} p={[L / 2, H - 0.12, pz]} r={0.028} h={L - 0.8} color={C.redPipe} along="x" />
        ))}
        {/* suspended linear LED fixtures above each row */}
        {lay.rows.map((row) =>
          [0.22, 0.5, 0.78].map((f) => {
            const lx = row.x0 + row.len * f;
            return (
              <group key={`${row.zc}-${f}`}>
                <Cyl p={[lx, H - 0.14, row.zc]} r={0.008} h={0.24} color={C.mullion} />
                <Box
                  p={[lx, H - 0.28, row.zc]}
                  s={[1.35, 0.07, 0.14]}
                  color={C.lightFix}
                  emissive="#ffffff"
                  emissiveIntensity={1.2}
                />
              </group>
            );
          }),
        )}
        {/* DATA conduits dropping to each double row */}
        {lay.rows.map((row) =>
          [0.33, 0.72].map((f) => {
            const cx = row.x0 + row.len * f;
            return (
              <group key={`${row.zc}-c${f}`}>
                <Cyl p={[cx, (H + 0.78) / 2, row.zc]} r={0.035} h={H - 0.78} color={C.conduit} />
                <Box p={[cx, H - 0.35, row.zc]} s={[0.18, 0.14, 0.12]} color={C.conduit} />
                <Box p={[cx, 0.82, row.zc]} s={[0.18, 0.13, 0.11]} color={C.deskFrame} />
              </group>
            );
          }),
        )}
        {/* projector near the front, centered */}
        <group position={[L - 2.6, 0, W / 2]}>
          <Cyl p={[0, H - 0.2, 0]} r={0.02} h={0.4} color={C.mullion} />
          <Box p={[0, H - 0.47, 0]} s={[0.42, 0.14, 0.3]} color={"#e8e8e6"} rough={0.5} />
        </group>
      </group>

      {/* ============ MOBILIARIO ============ */}
      <group visible={capas.mobiliario}>
        {/* 3 double rows: two tops back-to-back + steel frames */}
        {lay.rows.map((row) => (
          <group key={row.zc}>
            <Box p={[row.x0 + row.len / 2, 0.745, row.zc - 0.36]} s={[row.len, 0.045, 0.72]} color={C.deskTop} rough={0.5} castShadow />
            <Box p={[row.x0 + row.len / 2, 0.745, row.zc + 0.36]} s={[row.len, 0.045, 0.72]} color={C.deskTop} rough={0.5} castShadow />
            <Box p={[row.x0 + row.len / 2, 0.4, row.zc]} s={[row.len, 0.68, 0.05]} color={"#e7e6e3"} />
            {Array.from({ length: Math.ceil(row.len / 1.45) + 1 }, (_, i) =>
              Math.min(row.x0 + i * 1.45, row.x0 + row.len - 0.06),
            ).map((lx, i) => (
              <group key={i}>
                <Box p={[lx, 0.37, row.zc - 0.62]} s={[0.05, 0.74, 0.05]} color={C.deskFrame} />
                <Box p={[lx, 0.37, row.zc + 0.62]} s={[0.05, 0.74, 0.05]} color={C.deskFrame} />
                <Box p={[lx, 0.06, row.zc]} s={[0.05, 0.05, 1.3]} color={C.deskFrame} />
              </group>
            ))}
          </group>
        ))}
        {/* 2 simple table groups by the street windows (RIGHT side) */}
        {lay.simpleTables.map((t, i) => (
          <group key={i} position={[t.x, 0, t.z]}>
            <Box p={[0, 0.74, 0]} s={[1.8, 0.045, 0.8]} color={C.deskTop} rough={0.5} castShadow />
            {[
              [-0.82, -0.33],
              [0.82, -0.33],
              [-0.82, 0.33],
              [0.82, 0.33],
            ].map(([lx, lz], j) => (
              <Box key={j} p={[lx, 0.37, lz]} s={[0.045, 0.74, 0.045]} color={"#4a4d50"} />
            ))}
          </group>
        ))}
        {/* teacher desk, FRONT-LEFT, facing the students */}
        {lay.teacherDesk && (
          <group position={[lay.teacherDesk.x, 0, lay.teacherDesk.z]}>
            <Box p={[0, 0.75, 0]} s={[0.8, 0.05, 1.6]} color={C.deskTop} rough={0.5} castShadow />
            <Box p={[0, 0.38, -0.72]} s={[0.75, 0.7, 0.05]} color={"#e7e6e3"} />
            <Box p={[0, 0.38, 0.72]} s={[0.75, 0.7, 0.05]} color={"#e7e6e3"} />
            <Box p={[0.3, 0.38, 0]} s={[0.06, 0.7, 1.4]} color={"#e7e6e3"} />
          </group>
        )}
        {/* credenza + rolling touchscreen on the back wall */}
        <Box p={[4.2, 0.42, 0.26]} s={[5, 0.84, 0.48]} color={C.credenza} rough={0.5} castShadow />
        <Box p={[4.2, 0.86, 0.27]} s={[5.04, 0.03, 0.5]} color={"#e2e0dc"} />
        <group position={[0.8, 0, W - 1.1]} rotation={[0, Math.PI / 2, 0]}>
          <Box p={[0, 0.06, 0]} s={[1.0, 0.06, 0.55]} color={C.black} />
          <Cyl p={[-0.3, 0.7, 0]} r={0.03} h={1.3} color={C.black} />
          <Cyl p={[0.3, 0.7, 0]} r={0.03} h={1.3} color={C.black} />
          <Box p={[0, 1.35, 0]} s={[1.45, 0.85, 0.06]} color={C.screenDark} rough={0.3} />
        </group>
        {/* FRONT wall: projection screen (lit) + whiteboards each side */}
        <Box p={[L - 0.04, 1.7, W * 0.5]} s={[0.02, 1.6, 2.6]} color={"#f4f6f7"} emissive="#dfe9f2" emissiveIntensity={0.35} />
        <Box p={[L - 0.06, 1.7, W * 0.5]} s={[0.01, 1.7, 2.7]} color={"#c9c9c6"} />
        <Box p={[L - 0.04, 1.55, W * 0.22]} s={[0.02, 1.2, 1.9]} color={"#fbfbf9"} rough={0.55} />
        <Box p={[L - 0.05, 1.55, W * 0.22]} s={[0.01, 1.3, 2.0]} color={"#b9b9b6"} />
        <Box p={[L - 0.04, 1.55, W * 0.78]} s={[0.02, 1.2, 1.9]} color={"#fbfbf9"} rough={0.55} />
        <Box p={[L - 0.05, 1.55, W * 0.78]} s={[0.01, 1.3, 2.0]} color={"#b9b9b6"} />
      </group>

      {/* ============ EQUIPOS DE COMPUTO ============ */}
      <group visible={capas.equipos}>
        {seatSpots.map((s, i) => (
          <Workstation key={i} x={s.x} z={s.z} facing={s.facing} />
        ))}
        {/* CPU boxes under the row center, like the photo */}
        {lay.rows.map((row) => {
          const step = row.len / row.seats;
          return Array.from({ length: row.seats }, (_, i) => row.x0 + step * (i + 0.5)).map((cx) => (
            <Box key={`${row.zc}-${cx}`} p={[cx, 0.34, row.zc]} s={[0.5, 0.56, 0.58]} color={C.black} rough={0.55} />
          ));
        })}
        {lay.teacherDesk && (
          <group position={[lay.teacherDesk.x, 0, lay.teacherDesk.z]}>
            <Cyl p={[-0.05, 0.77, 0]} r={0.09} h={0.015} color={C.black} />
            <Cyl p={[-0.05, 0.88, 0]} r={0.02} h={0.2} color={C.black} />
            <Box p={[-0.05, 1.12, 0]} s={[0.03, 0.35, 0.56]} color={C.screenDark} rough={0.35} />
            <Box p={[0.12, 0.34, 0.5]} s={[0.22, 0.45, 0.45]} color={C.black} />
          </group>
        )}
      </group>

      {/* ============ SILLAS ============ */}
      <group visible={capas.sillas}>
        {seatSpots.map((s, i) => (
          <Chair key={i} x={s.x} z={s.z + 0.62 * s.facing} facing={-s.facing as 1 | -1} />
        ))}
        {lay.simpleTables.map((t, i) => (
          <group key={i}>
            <Chair x={t.x - 0.4} z={t.z + 0.7} facing={-1} />
            <Chair x={t.x + 0.4} z={t.z + 0.7} facing={-1} />
          </group>
        ))}
        {lay.teacherDesk && (
          <Chair x={lay.teacherDesk.x - 0.75} z={lay.teacherDesk.z} facing={1} />
        )}
      </group>

      {/* ============ SENSORES ============ */}
      <group visible={capas.sensores}>
        {aula.nodos.map((n) => {
          const pos = lay.sensores[n];
          if (!pos) return null;
          return (
            <SensorMarker
              key={n}
              nodo={n}
              position={pos}
              selected={selected === n}
              onSelect={(id) => onSelect(id)}
            />
          );
        })}
      </group>

      <OrbitControls
        target={[L / 2 - 0.5, 0.9, W / 2]}
        maxPolarAngle={Math.PI / 2.02}
        minDistance={2}
        maxDistance={38}
      />
    </Canvas>
  );
}
