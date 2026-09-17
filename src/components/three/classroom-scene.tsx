"use client";

// LOD 2-3 classroom twin for L-419, generated from the furniture audit
// (docs/AUDITORIA_MOBILIARIO_L419.md): 3 double desk rows with monitors and
// CPU cages, 2 simple table groups by the street windows, glass corridor
// wall, floor-to-ceiling glazing, ceiling with acoustic panels, red fire
// pipes, linear lights and DATA conduits. Dollhouse rendering: walls and
// ceiling face inward, so the room reads from any orbit angle.

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { Aula, NodoId } from "@/lib/types";

export interface NodoMeta {
  etiqueta: string;
  altura: number;
  descripcion: string;
}

export const NODO_META: Record<NodoId, NodoMeta> = {
  nodoAmbiental: {
    etiqueta: "Nodo ambiental",
    altura: 2.5,
    descripcion:
      "SHT31 (temperatura/humedad), SCD41 (CO2), SEN55 (PM2.5/COV), VEML7700 (luz) e INMP441 (ruido).",
  },
  nodoPuerta: {
    etiqueta: "Nodo puerta",
    altura: 2.2,
    descripcion:
      "Reed switch de estado de puerta, PN532 (RFID/NFC) y 2x VL53L1X para conteo bidireccional.",
  },
  nodoVentana1: {
    etiqueta: "Nodo ventana 1",
    altura: 2.0,
    descripcion: "Radar mmWave LD2410C: presencia y proximidad a la ventana.",
  },
  nodoVentana2: {
    etiqueta: "Nodo ventana 2",
    altura: 2.0,
    descripcion: "Radar mmWave LD2410C: presencia y proximidad a la ventana.",
  },
  procesadorAula: {
    etiqueta: "Procesador de aula",
    altura: 2.5,
    descripcion:
      "Raspberry Pi 4: adquisicion BLE/Wi-Fi, reglas de eventos y buffer offline.",
  },
};

const C = {
  floor: "#9ea3a7",
  wallWhite: "#eceae6",
  concrete: "#b3b0ab",
  panel: "#cfc8b8",
  glass: "#a8d2e4",
  frosted: "#dbe7ec",
  mullion: "#7b8288",
  door: "#5d4a3a",
  deskTop: "#f2f1ee",
  deskFrame: "#9aa0a4",
  black: "#17181a",
  chair: "#232426",
  screenDark: "#101214",
  redPipe: "#b03a2e",
  lightFix: "#f5f7f8",
  credenza: "#f4f3f0",
  conduit: "#aab2b8",
  sensor: "#37bbec",
  sensorSelected: "#f2b705",
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
  receiveShadow = false,
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
  receiveShadow?: boolean;
}) {
  return (
    <mesh position={p} rotation={[0, rotY, 0]} castShadow={castShadow} receiveShadow={receiveShadow}>
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

/** One computer seat: monitor on stand, keyboard, CPU box, office chair. */
function Seat({ x, z, facing }: { x: number; z: number; facing: 1 | -1 }) {
  // facing = direction the user looks (towards desk center line)
  const mz = z + 0.16 * facing; // monitor near the center line
  const kz = z - 0.08 * facing;
  const chairZ = z - 0.62 * facing;
  return (
    <group>
      <Cyl p={[x, 0.755, mz]} r={0.085} h={0.015} color={C.black} />
      <Cyl p={[x, 0.86, mz]} r={0.02} h={0.2} color={C.black} />
      <Box p={[x, 1.08, mz]} s={[0.52, 0.32, 0.03]} color={C.screenDark} rough={0.35} />
      <Box p={[x, 0.76, kz]} s={[0.42, 0.015, 0.15]} color={C.black} />
      <Box p={[x + 0.42, 0.52, z]} s={[0.22, 0.42, 0.45]} color={C.black} rough={0.55} />
      {/* chair */}
      <Cyl p={[x, 0.05, chairZ]} r={0.26} h={0.03} color={C.chair} />
      <Cyl p={[x, 0.27, chairZ]} r={0.025} h={0.4} color={C.chair} />
      <Cyl p={[x, 0.48, chairZ]} r={0.23} h={0.06} color={C.chair} />
      <Box
        p={[x, 0.78, chairZ - 0.2 * facing]}
        s={[0.42, 0.45, 0.05]}
        color={C.chair}
      />
    </group>
  );
}

/** Double desk row (back-to-back) with seats on both sides + DATA conduits. */
function DoubleRow({
  x0,
  len,
  zc,
  H,
  seats,
}: {
  x0: number;
  len: number;
  zc: number;
  H: number;
  seats: number;
}) {
  const step = len / seats;
  const xs = Array.from({ length: seats }, (_, i) => x0 + step * (i + 0.5));
  return (
    <group>
      {/* two tops back-to-back */}
      <Box p={[x0 + len / 2, 0.74, zc - 0.36]} s={[len, 0.04, 0.72]} color={C.deskTop} rough={0.5} castShadow receiveShadow />
      <Box p={[x0 + len / 2, 0.74, zc + 0.36]} s={[len, 0.04, 0.72]} color={C.deskTop} rough={0.5} castShadow receiveShadow />
      {/* frame legs */}
      {[x0 + 0.1, x0 + len / 2, x0 + len - 0.1].map((lx, i) => (
        <group key={i}>
          <Box p={[lx, 0.37, zc - 0.62]} s={[0.05, 0.74, 0.05]} color={C.deskFrame} />
          <Box p={[lx, 0.37, zc + 0.62]} s={[0.05, 0.74, 0.05]} color={C.deskFrame} />
          <Box p={[lx, 0.09, zc]} s={[0.05, 0.05, 1.3]} color={C.deskFrame} />
        </group>
      ))}
      {/* seats: one per position per side */}
      {xs.map((sx) => (
        <group key={sx}>
          <Seat x={sx} z={zc - 0.36} facing={1} />
          <Seat x={sx} z={zc + 0.36} facing={-1} />
        </group>
      ))}
      {/* DATA conduits dropping to the row center */}
      {[x0 + len * 0.33, x0 + len * 0.72].map((cx, i) => (
        <group key={i}>
          <Cyl p={[cx, (H + 0.76) / 2, zc]} r={0.032} h={H - 0.76} color={C.conduit} />
          <Box p={[cx, 0.8, zc]} s={[0.16, 0.12, 0.1]} color={C.deskFrame} />
        </group>
      ))}
    </group>
  );
}

/** Simple table (no equipment) with two fixed chairs. */
function SimpleTable({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <Box p={[0, 0.74, 0]} s={[1.5, 0.04, 0.75]} color={C.deskTop} rough={0.5} castShadow />
      {[
        [-0.68, -0.3],
        [0.68, -0.3],
        [-0.68, 0.3],
        [0.68, 0.3],
      ].map(([lx, lz], i) => (
        <Box key={i} p={[lx, 0.37, lz]} s={[0.04, 0.74, 0.04]} color={"#4a4d50"} />
      ))}
      {[-0.35, 0.35].map((cx, i) => (
        <group key={i} position={[cx, 0, 0.55]}>
          <Box p={[0, 0.45, 0]} s={[0.4, 0.04, 0.4]} color={C.chair} />
          <Box p={[0, 0.75, 0.18]} s={[0.4, 0.55, 0.04]} color={C.chair} />
          {[-0.16, 0.16].map((lx2, j) => (
            <Box key={j} p={[lx2, 0.22, 0]} s={[0.03, 0.45, 0.35]} color={"#3a3c3e"} />
          ))}
        </group>
      ))}
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
  const meta = NODO_META[nodo];
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(nodo);
        }}
      >
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshStandardMaterial
          color={selected ? C.sensorSelected : C.sensor}
          emissive={selected ? C.sensorSelected : C.sensor}
          emissiveIntensity={selected ? 0.8 : 0.4}
        />
      </mesh>
      <Html center distanceFactor={10} position={[0, 0.26, 0]} style={{ pointerEvents: "none" }}>
        <span
          style={{
            whiteSpace: "nowrap",
            fontSize: "11px",
            padding: "2px 6px",
            borderRadius: "9999px",
            background: selected ? "rgba(242,183,5,0.92)" : "rgba(9,20,28,0.78)",
            color: selected ? "#1c1502" : "#e9f6fc",
          }}
        >
          {meta.etiqueta}
        </span>
      </Html>
    </group>
  );
}

export function ClassroomScene({
  aula,
  selected,
  onSelect,
}: {
  aula: Aula;
  selected: NodoId | null;
  onSelect: (n: NodoId | null) => void;
}) {
  const L = aula.largo;
  const W = aula.ancho;
  const H = aula.alto;
  const puerta = aula.posiciones.puerta;
  const doorW = 1.05;
  const doorH = 2.1;
  const hasWindows = aula.ventanas > 0;

  const acousticPanels = useMemo(() => {
    const panels: V3[] = [];
    for (let px = 1.3; px < L - 0.6; px += 2.45) {
      for (let pz = 1.05; pz < W - 0.5; pz += 1.95) {
        panels.push([px, H - 0.02, pz]);
      }
    }
    return panels;
  }, [L, W, H]);

  return (
    <Canvas
      shadows
      camera={{ position: [L * 1.1, H * 2.1, W * 1.85], fov: 46 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#0d1319"]} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#dfe9ef", "#3b3e42", 0.45]} />
      {/* daylight through the street glazing */}
      <directionalLight
        position={[L * 0.5, H * 1.6, -6]}
        intensity={1.35}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[L * 0.9, H * 2.5, W * 1.4]} intensity={0.4} />

      {/* glossy epoxy floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / 2, 0, W / 2]} receiveShadow>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color={C.floor} roughness={0.18} metalness={0.15} />
      </mesh>

      {/* ceiling slab (visible only from inside) + acoustic panels */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[L / 2, H, W / 2]}>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color={C.concrete} roughness={0.95} />
      </mesh>
      {acousticPanels.map((p, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={p}>
          <planeGeometry args={[2.3, 1.8]} />
          <meshStandardMaterial color={C.panel} roughness={0.95} />
        </mesh>
      ))}

      {/* red fire pipes + linear light fixtures */}
      {[1.2, W - 1.2].map((pz, i) => (
        <Cyl key={i} p={[L / 2, H - 0.18, pz]} r={0.025} h={L - 1} color={C.redPipe} along="x" />
      ))}
      {[1.35, 3.0, 4.65].map((lz) =>
        [2.2, 4.4, 6.6, 8.6].map((lx) => (
          <Box
            key={`${lx}-${lz}`}
            p={[lx, H - 0.38, lz]}
            s={[1.25, 0.06, 0.13]}
            color={C.lightFix}
            emissive="#ffffff"
            emissiveIntensity={1.15}
          />
        )),
      )}

      {/* street facade (z=0): floor-to-ceiling glazing with mullions */}
      {hasWindows ? (
        <group>
          <Box p={[L / 2, 0.14, 0.02]} s={[L, 0.28, 0.1]} color={C.wallWhite} />
          <mesh position={[L / 2, (H + 0.28) / 2, 0]}>
            <planeGeometry args={[L, H - 0.28]} />
            <meshStandardMaterial
              color={C.glass}
              transparent
              opacity={0.2}
              roughness={0.08}
              metalness={0.1}
              side={2}
            />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => (i * L) / 6).map((mx, i) => (
            <Box key={i} p={[mx, H / 2, 0.01]} s={[0.07, H, 0.09]} color={C.mullion} />
          ))}
          <Box p={[L / 2, H - 0.1, 0.01]} s={[L, 0.2, 0.09]} color={C.mullion} />
          {/* concrete columns interrupting the facade, as in the photos */}
          {[L / 3, (2 * L) / 3].map((cx, i) => (
            <Box key={i} p={[cx, H / 2, 0.22]} s={[0.38, H, 0.42]} color={C.concrete} />
          ))}
        </group>
      ) : (
        <mesh position={[L / 2, H / 2, 0]}>
          <planeGeometry args={[L, H]} />
          <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
        </mesh>
      )}

      {/* back wall (z=W) with long credenza */}
      <mesh position={[L / 2, H / 2, W]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[L, H]} />
        <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
      </mesh>
      <Box p={[5.4, 0.42, W - 0.26]} s={[5.4, 0.84, 0.48]} color={C.credenza} rough={0.5} castShadow />
      <Box p={[5.4, 0.855, W - 0.26]} s={[5.44, 0.03, 0.5]} color={"#e2e0dc"} />
      {/* interactive touchscreen on rolling stand */}
      <group position={[8.6, 0, W - 0.75]}>
        <Box p={[0, 0.06, 0]} s={[1.0, 0.06, 0.55]} color={C.black} />
        <Cyl p={[-0.3, 0.7, 0]} r={0.03} h={1.3} color={C.black} />
        <Cyl p={[0.3, 0.7, 0]} r={0.03} h={1.3} color={C.black} />
        <Box p={[0, 1.35, 0]} s={[1.45, 0.85, 0.06]} color={C.screenDark} rough={0.3} />
      </group>

      {/* east wall (x=L): projection screen + whiteboard */}
      <mesh position={[L, H / 2, W / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
      </mesh>
      <Box p={[L - 0.03, 1.65, 2.6]} s={[0.02, 1.55, 2.5]} color={"#fdfdfb"} rough={0.6} />
      <Box p={[L - 0.05, 1.65, 2.6]} s={[0.01, 1.65, 2.6]} color={"#c9c9c6"} />
      <Box p={[L - 0.03, 1.5, 4.8]} s={[0.02, 1.15, 1.7]} color={"#fbfbf9"} rough={0.55} />
      <Box p={[L - 0.04, 1.5, 4.8]} s={[0.01, 1.25, 1.8]} color={"#b9b9b6"} />

      {/* projector hanging from the ceiling */}
      <group position={[aula.posiciones.proyector?.x ?? 5, 0, aula.posiciones.proyector?.y ?? 2]}>
        <Cyl p={[0, H - 0.2, 0]} r={0.02} h={0.4} color={C.mullion} />
        <Box p={[0, H - 0.48, 0]} s={[0.42, 0.14, 0.3]} color={"#e8e8e6"} rough={0.5} />
        <Cyl p={[0.18, H - 0.48, 0]} r={0.05} h={0.05} color={C.screenDark} along="x" />
      </group>

      {/* corridor wall (x=0): glass partition + frosted band + brown door */}
      {puerta ? (
        <group>
          <mesh position={[0, H / 2, (W - doorW + 0) / 2 - (W - puerta.y - doorW) / 2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[puerta.y, H]} />
            <meshStandardMaterial color={C.glass} transparent opacity={0.18} roughness={0.08} side={2} />
          </mesh>
          <Box p={[0.02, 1.35, puerta.y / 2]} s={[0.03, 0.5, puerta.y]} color={C.frosted} opacity={0.55} />
          {[0, puerta.y * 0.33, puerta.y * 0.66, puerta.y].map((mz, i) => (
            <Box key={i} p={[0.01, H / 2, mz]} s={[0.08, H, 0.06]} color={C.mullion} />
          ))}
          <Box p={[0.01, H - 0.1, puerta.y / 2]} s={[0.08, 0.2, puerta.y]} color={C.mullion} />
          {/* lintel + door */}
          <Box p={[0.01, (doorH + H) / 2, puerta.y + doorW / 2]} s={[0.1, H - doorH, doorW]} color={C.wallWhite} />
          <Box p={[0.02, doorH / 2, puerta.y + doorW / 2]} s={[0.09, doorH, doorW]} color={C.door} rough={0.55} castShadow />
          <Box p={[0.07, doorH / 2, puerta.y + doorW * 0.5]} s={[0.02, 0.6, 0.14]} color={"#cfd4d8"} rough={0.3} metal={0.6} />
          <Cyl p={[0.09, 1.05, puerta.y + doorW - 0.18]} r={0.015} h={0.14} color={"#cfd4d8"} along="z" />
          {/* wall segment past the door to the back wall */}
          <mesh
            position={[0, H / 2, puerta.y + doorW + (W - puerta.y - doorW) / 2]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[Math.max(W - puerta.y - doorW, 0.01), H]} />
            <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, H / 2, W / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
        </mesh>
      )}

      {/* 3 double desk rows with computers (per the furniture audit) */}
      <DoubleRow x0={1.5} len={6} zc={1.35} H={H} seats={5} />
      <DoubleRow x0={1.5} len={6} zc={3.0} H={H} seats={5} />
      <DoubleRow x0={1.5} len={6} zc={4.65} H={H} seats={5} />

      {/* 2 simple table groups near the street windows */}
      <SimpleTable x={8.7} z={1.0} rotY={Math.PI / 2} />
      <SimpleTable x={8.7} z={2.9} rotY={Math.PI / 2} />

      {/* sensor nodes */}
      {aula.nodos.map((n) => {
        const pos = aula.posiciones[n];
        if (!pos) return null;
        return (
          <SensorMarker
            key={n}
            nodo={n}
            position={[pos.x, NODO_META[n].altura, pos.y]}
            selected={selected === n}
            onSelect={(id) => onSelect(id)}
          />
        );
      })}

      <OrbitControls
        target={[L / 2, 1.1, W / 2]}
        maxPolarAngle={Math.PI / 2.02}
        minDistance={2.5}
        maxDistance={32}
      />
    </Canvas>
  );
}
