"use client";

// LOD 3 classroom twin for L-419, corrected corner-by-corner from the user's
// four corner photos (viewpoint = center of the room):
//   FRONT-LEFT  : teacher desk, spiral duct + louver grille, mobile whiteboard,
//                 concrete column where the interior glass (luna interna) ends.
//   FRONT-RIGHT : big concrete corner column; street windows have a ~0.95 m
//                 sill and dark frames (NOT floor-to-ceiling glazing).
//   BACK-RIGHT  : recessed corner (esquina hundida) with ventilation ducts.
//   BACK-LEFT   : the ENTRY — brown door + SALIDA sign, entry column, and the
//                 white metal cabinets (casilleros) along the back wall.
// Axes: x=0 back wall -> x=L front wall (screen); z=0 left wall (corridor
// glass) -> z=W right wall (street windows).

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { Aula, NodoId } from "@/lib/types";
import { NODO_META, buildLayout, type Capas } from "@/components/three/classroom-layout";

const C = {
  floor: "#a4a8ab",
  wallWhite: "#edebe7",
  concrete: "#b6b3ae",
  panel: "#cec7b6",
  glass: "#a8d2e4",
  frosted: "#dbe7ec",
  mullion: "#787f85",
  winFrame: "#2f3235",
  door: "#4a3b30",
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
  duct: "#c6cbd0",
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
      <cylinderGeometry args={[r, r, h, 14]} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}

/** Black polyurethane task chair modeled after the user's reference photo:
 *  5-star base with casters, gas lift, contoured seat, coil spring, backrest
 *  with handle cutout and adjustable T-armrests. ~0.95 m tall, seat ~0.50 m. */
function Chair({ x, z, facing }: { x: number; z: number; facing: 1 | -1 }) {
  return (
    <group position={[x, 0, z]}>
      {/* 5-star base + casters */}
      {[0, 72, 144, 216, 288].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return (
          <group key={deg}>
            <Box
              p={[0.2 * Math.cos(a), 0.075, 0.2 * Math.sin(a)]}
              s={[0.34, 0.045, 0.07]}
              color={C.chairDark}
              rotY={-a}
            />
            <mesh position={[0.33 * Math.cos(a), 0.035, 0.33 * Math.sin(a)]}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshStandardMaterial color="#1b1d1f" roughness={0.45} />
            </mesh>
          </group>
        );
      })}
      {/* gas lift (outer + piston) */}
      <Cyl p={[0, 0.26, 0]} r={0.045} h={0.28} color={C.chairDark} />
      <Cyl p={[0, 0.42, 0]} r={0.026} h={0.12} color={"#54585c"} rough={0.35} />
      {/* contoured seat with waffle top */}
      <Box p={[0, 0.5, 0]} s={[0.46, 0.075, 0.43]} color={C.chair} rough={0.9} castShadow />
      <Box p={[0, 0.545, -0.02 * facing]} s={[0.4, 0.02, 0.35]} color={C.chairDark} rough={0.95} />
      {/* coil spring linking seat and backrest */}
      <Cyl p={[0, 0.63, 0.17 * facing]} r={0.032} h={0.16} color={"#3d4043"} />
      {[0.585, 0.635, 0.685].map((sy, i) => (
        <Cyl key={i} p={[0, sy, 0.17 * facing]} r={0.044} h={0.016} color={"#26282a"} />
      ))}
      {/* backrest with handle cutout near the top */}
      <Box p={[0, 0.8, 0.215 * facing]} s={[0.41, 0.35, 0.05]} color={C.chair} rough={0.9} castShadow />
      <Box p={[0, 0.905, 0.215 * facing]} s={[0.13, 0.035, 0.064]} color={"#0b0c0d"} />
      {/* adjustable T-armrests */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box p={[0.25 * side, 0.6, 0.03 * facing]} s={[0.04, 0.21, 0.045]} color={C.chairDark} />
          <Box p={[0.25 * side, 0.715, -0.01 * facing]} s={[0.055, 0.035, 0.25]} color={C.chairDark} rough={0.85} />
        </group>
      ))}
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
  const { L, W, H, door, leftGlass, alcove, streetWindows } = lay;
  const doorX0 = door.cx - door.w / 2;
  const doorX1 = door.cx + door.w / 2;
  const alcoveLen = alcove?.len ?? 0;
  const alcoveZ = alcove ? W - alcove.depth : W;

  const seatSpots = useMemo(() => {
    // 10 computers per double row (5 per side), INTERCALATED: one side sits at
    // the first half of each bay, the other side at the second half, so no
    // computer faces another directly (per the user's correction).
    const spots: { x: number; z: number; facing: 1 | -1 }[] = [];
    for (const row of lay.rows) {
      const step = row.len / row.seats;
      for (let i = 0; i < row.seats; i++) {
        spots.push({ x: row.x0 + step * (i + 0.25), z: row.zc - 0.36, facing: 1 });
        spots.push({ x: row.x0 + step * (i + 0.75), z: row.zc + 0.36, facing: -1 });
      }
    }
    return spots;
  }, [lay]);

  const acousticPanels = useMemo(() => {
    // full acoustic-panel ceiling like the photo: square panels with thin
    // seams, covering the room (concrete shows only at the seams/edges).
    const panels: V3[] = [];
    for (let px = 0.65; px < L - 0.25; px += 1.22) {
      for (let pz = 0.65; pz < W - 0.25; pz += 1.22) {
        panels.push([px, H - 0.03, pz]);
      }
    }
    return panels;
  }, [L, W, H]);

  const glassMullions = useMemo(() => {
    const xs: number[] = [];
    const n = Math.max(2, Math.round((leftGlass.x1 - leftGlass.x0) / 1.15));
    for (let i = 0; i <= n; i++) xs.push(leftGlass.x0 + ((leftGlass.x1 - leftGlass.x0) * i) / n);
    return xs;
  }, [leftGlass]);

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

        {/* FRONT wall (x=L): screen + whiteboards */}
        <mesh position={[L, H / 2, W / 2]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
        </mesh>

        {/* BACK wall (x=0) */}
        <mesh position={[0, H / 2, W / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
        </mesh>

        {/* LEFT wall — ENTRY corner (back-left): pier, brown door, SALIDA */}
        <Box p={[doorX0 / 2, H / 2, 0.05]} s={[Math.max(doorX0, 0.01), H, 0.1]} color={C.wallWhite} />
        <Box p={[door.cx, (door.h + H) / 2, 0.05]} s={[door.w, H - door.h, 0.1]} color={C.wallWhite} />
        <Box p={[door.cx, door.h / 2, 0.06]} s={[door.w, door.h, 0.08]} color={C.door} rough={0.55} castShadow />
        <Box p={[door.cx + door.w * 0.3, 1.05, 0.12]} s={[0.14, 0.6, 0.02]} color={"#cfd4d8"} rough={0.3} metal={0.6} />
        <Box
          p={[door.cx, door.h + 0.28, 0.12]}
          s={[0.4, 0.2, 0.04]}
          color={C.exitGreen}
          emissive={C.exitGreen}
          emissiveIntensity={0.7}
        />
        {/* entry concrete column between door and glass */}
        {lay.entryColumnX !== undefined && (
          <Box p={[lay.entryColumnX, H / 2, 0.17]} s={[0.35, H, 0.38]} color={C.concrete} />
        )}
        {/* wall strip between door and column */}
        <Box
          p={[(doorX1 + (lay.entryColumnX ?? leftGlass.x0)) / 2, H / 2, 0.05]}
          s={[Math.max((lay.entryColumnX ?? leftGlass.x0) - doorX1, 0.01), H, 0.1]}
          color={C.wallWhite}
        />
        {/* wall past the interior glass (no attached column: the free column
            stands separated; the glass simply ends at a mullion) */}
        <mesh position={[(leftGlass.x1 + L) / 2, H / 2, 0]}>
          <planeGeometry args={[Math.max(L - leftGlass.x1, 0.01), H]} />
          <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
        </mesh>
        {/* electrical box on the front-left wall (photo 1) */}
        {lay.leftVent && (
          <Box p={[11.05, 1.68, 0.1]} s={[0.5, 0.62, 0.16]} color={"#1d1f21"} rough={0.5} />
        )}

        {/* RIGHT wall — street side with sill windows, or solid */}
        {streetWindows ? (
          <group>
            {/* sill + header walls over the main span (past the alcove) */}
            <Box
              p={[(alcoveLen + L) / 2, streetWindows.sill / 2, W - 0.06]}
              s={[L - alcoveLen, streetWindows.sill, 0.12]}
              color={C.wallWhite}
            />
            <Box
              p={[(alcoveLen + L) / 2, (streetWindows.head + H) / 2, W - 0.06]}
              s={[L - alcoveLen, H - streetWindows.head, 0.12]}
              color={C.wallWhite}
            />
            {/* concrete piers between bays + big front-right corner column */}
            {streetWindows.piers.map((px) => (
              <Box key={px} p={[px, H / 2, W - 0.17]} s={[0.42, H, 0.34]} color={C.concrete} />
            ))}
          </group>
        ) : (
          <mesh position={[L / 2, H / 2, W]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[L, H]} />
            <meshStandardMaterial color={C.wallWhite} roughness={0.9} />
          </mesh>
        )}

        {/* BACK-RIGHT recessed corner (esquina hundida): solid walls with real
            thickness so the niche never reads as a void, plus a roof cap */}
        {alcove && (
          <group>
            <Box
              p={[alcove.len / 2, H / 2, alcoveZ - 0.06]}
              s={[alcove.len, H, 0.14]}
              color={C.wallWhite}
            />
            <Box
              p={[alcove.len - 0.06, H / 2, (alcoveZ + W) / 2]}
              s={[0.14, H, W - alcoveZ]}
              color={C.wallWhite}
            />
            {/* roof cap over the niche so the top view shows solid, not a hole */}
            <Box
              p={[alcove.len / 2, H - 0.03, (alcoveZ + W) / 2]}
              s={[alcove.len, 0.07, W - alcoveZ]}
              color={C.concrete}
            />
            {/* louver grille moved to the ventilation layer */}
          </group>
        )}

        {/* --- Estructura corregida con la foto de la usuaria: SIN columnas
            en las esquinas (las paredes se encuentran limpias). Una sola
            columna EXENTA a la derecha del escritorio del profesor, separada
            de las paredes, con una viga transversal que cruza hacia los
            ventanales. Vigas perimetrales según el plano. --- */}
        {lay.freeColumn && (
          <group>
            <Box
              p={[lay.freeColumn.x, H / 2, lay.freeColumn.z]}
              s={[0.55, H, 0.85]}
              color={C.concrete}
              castShadow
            />
            {/* transverse beam from the left wall across to the street glazing */}
            <Box p={[lay.freeColumn.x, H - 0.2, W / 2]} s={[0.45, 0.4, W]} color={C.concrete} />
          </group>
        )}
        {/* 3 wall-attached vertical columns (purple marks in the user's plan) */}
        {lay.wallColumns?.map((col, i) => (
          <Box
            key={`wcol-${i}`}
            p={[col.x, H / 2, col.z]}
            s={[0.5, H, 0.5]}
            color={C.concrete}
            castShadow
          />
        ))}
        {/* ring beams (0.35 wide x 0.4 deep) */}
        <Box p={[L / 2, H - 0.2, 0.18]} s={[L, 0.4, 0.35]} color={C.concrete} />
        <Box p={[L - 0.18, H - 0.2, W / 2]} s={[0.35, 0.4, W]} color={C.concrete} />
        <Box p={[0.18, H - 0.2, alcoveZ / 2]} s={[0.35, 0.4, alcoveZ]} color={C.concrete} />
        <Box
          p={[(alcoveLen + L) / 2, H - 0.2, W - 0.18]}
          s={[L - alcoveLen, 0.4, 0.35]}
          color={C.concrete}
        />
        {alcove && (
          <group>
            {/* beams skirting the recessed void */}
            <Box p={[alcove.len / 2, H - 0.2, alcoveZ - 0.18]} s={[alcove.len, 0.4, 0.35]} color={C.concrete} />
            <Box
              p={[alcove.len + 0.18, H - 0.2, (alcoveZ + W) / 2]}
              s={[0.35, 0.4, W - alcoveZ]}
              color={C.concrete}
            />
          </group>
        )}
      </group>

      {/* ============ VIDRIOS ============ */}
      <group visible={capas.vidrios}>
        {/* interior glass (luna interna) with frosted band */}
        <mesh position={[(leftGlass.x0 + leftGlass.x1) / 2, H / 2, 0]}>
          <planeGeometry args={[leftGlass.x1 - leftGlass.x0, H]} />
          <meshStandardMaterial color={C.glass} transparent opacity={0.16} roughness={0.08} side={2} />
        </mesh>
        <Box
          p={[(leftGlass.x0 + leftGlass.x1) / 2, 1.3, 0.03]}
          s={[leftGlass.x1 - leftGlass.x0, 0.5, 0.02]}
          color={C.frosted}
          opacity={0.5}
        />
        {glassMullions.map((mx, i) => (
          <Box key={i} p={[mx, H / 2, 0.02]} s={[0.07, H, 0.07]} color={C.mullion} />
        ))}
        <Box p={[(leftGlass.x0 + leftGlass.x1) / 2, H - 0.08, 0.02]} s={[leftGlass.x1 - leftGlass.x0, 0.16, 0.07]} color={C.mullion} />
        <Box p={[(leftGlass.x0 + leftGlass.x1) / 2, 0.08, 0.02]} s={[leftGlass.x1 - leftGlass.x0, 0.16, 0.07]} color={C.mullion} />

        {/* street windows: dark frames, sill height ~0.95 m (photos 2-3) */}
        {streetWindows &&
          streetWindows.bays.map(([bx0, bx1], i) => {
            const bw = bx1 - bx0;
            const bcx = (bx0 + bx1) / 2;
            const wh = streetWindows.head - streetWindows.sill;
            const wcy = (streetWindows.head + streetWindows.sill) / 2;
            return (
              <group key={i}>
                <mesh position={[bcx, wcy, W - 0.04]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[bw, wh]} />
                  <meshStandardMaterial color={C.glass} transparent opacity={0.2} roughness={0.08} side={2} />
                </mesh>
                {/* dark frame */}
                <Box p={[bcx, streetWindows.sill + 0.03, W - 0.07]} s={[bw, 0.07, 0.09]} color={C.winFrame} />
                <Box p={[bcx, streetWindows.head - 0.03, W - 0.07]} s={[bw, 0.07, 0.09]} color={C.winFrame} />
                <Box p={[bx0 + 0.03, wcy, W - 0.07]} s={[0.07, wh, 0.09]} color={C.winFrame} />
                <Box p={[bx1 - 0.03, wcy, W - 0.07]} s={[0.07, wh, 0.09]} color={C.winFrame} />
                <Box p={[bcx, wcy, W - 0.07]} s={[0.06, wh, 0.08]} color={C.winFrame} />
                {/* white sill board */}
                <Box p={[bcx, streetWindows.sill - 0.02, W - 0.14]} s={[bw, 0.05, 0.22]} color={"#f7f7f5"} />
              </group>
            );
          })}
      </group>

      {/* ============ TECHO (losa y paneles acústicos) ============ */}
      <group visible={capas.techo}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[L / 2, H, W / 2]}>
          <planeGeometry args={[L, W]} />
          <meshStandardMaterial color={C.concrete} roughness={0.95} />
        </mesh>
        {acousticPanels.map((p, i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={p}>
            <planeGeometry args={[1.16, 1.16]} />
            <meshStandardMaterial color={C.panel} roughness={0.95} />
          </mesh>
        ))}
        {/* cable tray along the back (photos 3-4) */}
        <Box p={[0.55, H - 0.35, W / 2 - 0.4]} s={[0.3, 0.08, W - 2]} color={"#6b7076"} rough={0.5} />
        {/* electrical conduits climbing the free column face (photo) */}
        {lay.freeColumn && (
          <group>
            {[-0.09, 0.09].map((dz, i) => (
              <Cyl
                key={i}
                p={[lay.freeColumn!.x - 0.31, H / 2 + 0.3, lay.freeColumn!.z + dz]}
                r={0.022}
                h={H - 0.6}
                color={"#c0c6cb"}
                rough={0.4}
              />
            ))}
            <Box
              p={[lay.freeColumn.x - 0.31, 1.35, lay.freeColumn.z - 0.09]}
              s={[0.07, 0.12, 0.09]}
              color={"#e8eaec"}
            />
          </group>
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
        {/* projector */}
        <group position={[lay.proyector.x, 0, lay.proyector.z]}>
          <Cyl p={[0, H - 0.2, 0]} r={0.02} h={0.4} color={C.mullion} />
          <Box p={[0, H - 0.47, 0]} s={[0.42, 0.14, 0.3]} color={"#e8e8e6"} rough={0.5} />
        </group>
      </group>

      {/* ============ LUMINARIAS ============ */}
      <group visible={capas.luminarias}>
        {lay.lights.map((li, i) => (
          <group key={i}>
            {/* black power cable on one end, gray cord on the other (photo) */}
            <Cyl p={[li.x - 0.55, H - 0.19, li.z]} r={0.008} h={0.32} color={"#141618"} />
            <Cyl p={[li.x + 0.55, H - 0.19, li.z]} r={0.006} h={0.32} color={"#9aa0a4"} />
            <Box
              p={[li.x, H - 0.36, li.z]}
              s={[1.35, 0.07, 0.14]}
              color={C.lightFix}
              emissive="#ffffff"
              emissiveIntensity={1.2}
            />
          </group>
        ))}
      </group>

      {/* ============ VENTILACION ============ */}
      <group visible={capas.ventilacion}>
        {/* front-left spiral duct + louver grille (photo 1) */}
        {lay.leftVent && (
          <group>
            <Cyl p={[11.35, 2.8, 1.15]} r={0.16} h={2.3} color={C.duct} along="z" rough={0.4} />
            <Box p={[lay.leftVent.x, 2.35, 0.05]} s={[lay.leftVent.w, 0.5, 0.06]} color={"#e4e7e9"} />
            {[0.14, 0.02, -0.1].map((dy, i) => (
              <Box
                key={i}
                p={[lay.leftVent!.x, 2.35 + dy, 0.085]}
                s={[lay.leftVent!.w - 0.1, 0.03, 0.015]}
                color={"#b9bec2"}
              />
            ))}
          </group>
        )}
        {/* back-right alcove ventilation + louver grille (photo 3) */}
        {alcove && (
          <group>
            <Box p={[0.7, 2.75, alcoveZ - 0.6]} s={[0.35, 0.3, 1.9]} color={C.duct} rough={0.5} />
            <Cyl p={[1.5, 2.6, alcoveZ - 0.75]} r={0.14} h={1.7} color={C.duct} along="z" rough={0.4} />
            <Box p={[1.1, 2.62, alcoveZ - 0.28]} s={[0.8, 0.5, 0.5]} color={"#d4d8db"} rough={0.5} />
            <Box p={[1.15, 2.3, alcoveZ + 0.03]} s={[1.1, 0.45, 0.05]} color={"#dfe3e6"} />
          </group>
        )}
      </group>

      {/* ============ CONTRAINCENDIOS ============ */}
      <group visible={capas.contraincendios}>
        {[2.1, W - 2.1].map((pz, i) => (
          <Cyl key={i} p={[L / 2, H - 0.12, pz]} r={0.028} h={L - 0.8} color={C.redPipe} along="x" />
        ))}
        {/* red fire alarm on the free column (photo) */}
        {lay.freeColumn && (
          <group>
            <Box
              p={[lay.freeColumn.x - 0.3, 1.5, lay.freeColumn.z + 0.18]}
              s={[0.09, 0.12, 0.12]}
              color={"#c22e20"}
              emissive="#c22e20"
              emissiveIntensity={0.35}
            />
            <Cyl
              p={[lay.freeColumn.x - 0.31, 1.68, lay.freeColumn.z + 0.18]}
              r={0.05}
              h={0.05}
              color={"#d84335"}
              along="z"
            />
          </group>
        )}
        {/* sprinkler drops */}
        {[2.5, 5.0, 7.5, 10.0].map((sx) =>
          [2.1, W - 2.1].map((pz) => (
            <group key={`${sx}-${pz}`}>
              <Cyl p={[sx, H - 0.17, pz]} r={0.012} h={0.1} color={C.redPipe} />
              <Cyl p={[sx, H - 0.23, pz]} r={0.03} h={0.03} color={"#c8ccd0"} />
            </group>
          )),
        )}
      </group>

      {/* ============ MOBILIARIO ============ */}
      <group visible={capas.mobiliario}>
        {/* 3 double rows */}
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
        {/* simple tables by the street windows */}
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
        {/* teacher desk, front-left (photo 1) */}
        {lay.teacherDesk && (
          <group position={[lay.teacherDesk.x, 0, lay.teacherDesk.z]}>
            <Box p={[0, 0.75, 0]} s={[0.8, 0.05, 1.6]} color={C.deskTop} rough={0.5} castShadow />
            <Box p={[0, 0.38, -0.72]} s={[0.75, 0.7, 0.05]} color={"#e7e6e3"} />
            <Box p={[0, 0.38, 0.72]} s={[0.75, 0.7, 0.05]} color={"#e7e6e3"} />
            <Box p={[0.3, 0.38, 0]} s={[0.06, 0.7, 1.4]} color={"#e7e6e3"} />
          </group>
        )}
        {/* white metal cabinets along the BACK wall, right of the entry (photo 4) */}
        {lay.cabinets && (
          <group>
            <Box
              p={[0.27, 0.44, (lay.cabinets.z0 + lay.cabinets.z1) / 2]}
              s={[0.5, 0.88, lay.cabinets.z1 - lay.cabinets.z0]}
              color={C.credenza}
              rough={0.5}
              castShadow
            />
            <Box
              p={[0.27, 0.9, (lay.cabinets.z0 + lay.cabinets.z1) / 2]}
              s={[0.54, 0.04, lay.cabinets.z1 - lay.cabinets.z0 + 0.04]}
              color={"#e2e0dc"}
            />
            {/* door seams */}
            {Array.from(
              { length: Math.floor((lay.cabinets.z1 - lay.cabinets.z0) / 0.62) },
              (_, i) => lay.cabinets!.z0 + 0.62 * (i + 1),
            ).map((sz, i) => (
              <Box key={i} p={[0.53, 0.44, sz]} s={[0.01, 0.8, 0.015]} color={"#d0cec9"} />
            ))}
          </group>
        )}
        {/* mobile whiteboard near the front-left (photo 1) */}
        {lay.mobileBoard && (
          <group
            position={[lay.mobileBoard.x, 0, lay.mobileBoard.z]}
            rotation={[0, lay.mobileBoard.rot, 0]}
          >
            {[-0.6, 0.6].map((lx, i) => (
              <group key={i}>
                <Box p={[lx, 0.9, 0]} s={[0.05, 1.8, 0.05]} color={"#8a9095"} />
                <Box p={[lx, 0.03, 0]} s={[0.08, 0.06, 0.6]} color={"#8a9095"} />
              </group>
            ))}
            <Box p={[0, 1.25, 0.01]} s={[1.56, 1.06, 0.02]} color={"#c9c9c6"} />
            <Box p={[0, 1.25, 0.025]} s={[1.5, 1.0, 0.02]} color={"#fdfdfb"} rough={0.55} />
          </group>
        )}
        {/* FRONT wall: lit projection screen + whiteboards */}
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
        {/* one CPU box under each desk, at the user's RIGHT-hand side */}
        {seatSpots.map((s, i) => (
          <Box
            key={`cpu-${i}`}
            p={[s.x - 0.48 * s.facing, 0.34, s.z + 0.04 * s.facing]}
            s={[0.24, 0.56, 0.5]}
            color={C.black}
            rough={0.55}
          />
        ))}
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
          <Chair key={i} x={s.x} z={s.z - 0.62 * s.facing} facing={-s.facing as 1 | -1} />
        ))}
        {lay.simpleTables.map((t, i) => (
          <group key={i}>
            <Chair x={t.x - 0.4} z={t.z - 0.75} facing={-1} />
            <Chair x={t.x + 0.4} z={t.z - 0.75} facing={-1} />
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
