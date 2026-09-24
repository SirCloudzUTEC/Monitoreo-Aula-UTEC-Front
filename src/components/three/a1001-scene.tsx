"use client";

// 3D twin of aula A-1001 (teaching classroom, 10th floor), modelled from
// scratch out of the six site photos:
//   - front wall of exposed concrete with two acrylic whiteboards and the
//     interactive display on its rolling stand; teacher podium by the window
//   - fixed floor-to-ceiling glazing on the left (city view), corridor wall
//     on the right with a frosted high strip and two doors (front and back)
//   - acoustic ceiling between exposed beams, galvanized cable trays,
//     5 suspended LED bars (3 back, 2 front), 2 projectors, round speakers
//   - 40 single desks in 5 rows x 4 pairs with black sled chairs
// It shares only the viewer, the layer ids and the sensor names with the
// rest of the app; its geometry lives in a1001-layout.ts.

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { Aula, NodoId } from "@/lib/types";
import { NODO_META, type Capas } from "@/components/three/classroom-layout";
import { A1001, type LayoutA1001, type XZ } from "@/components/three/a1001-layout";

type V3 = [number, number, number];

// Palette sampled from the photos (white panel walls, exposed concrete,
// black sled chairs, dark aluminium glazing frames). The vinyl floor reads
// blue-green in the photos; it is drawn light grey by the owner's choice.
const P = {
  piso: "#a9adb0",
  blanco: "#eceae5",
  concreto: "#bab6ae",
  concretoClaro: "#c9c5bd",
  panel: "#e4e1da",
  junta: "#cfcbc3",
  vidrio: "#a9d3e6",
  esmerilado: "#e3ecf0",
  marco: "#26292c",
  puerta: "#5a4030",
  tablero: "#e8e6e1",
  estructura: "#8d9297",
  negro: "#141618",
  silla: "#1f2123",
  pantalla: "#0b0e11",
  luminaria: "#f6f8f9",
  bandeja: "#a9b0b6",
  parlante: "#f2f2ef",
  acero: "#b8bcc0",
  sensor: "#37bbec",
  sensorSel: "#f2b705",
  verde: "#1f8a4c",
};

function Bloque({
  p,
  s,
  color,
  rough = 0.8,
  metal = 0,
  opacity,
  emissive,
  emissiveIntensity = 0,
  rotY = 0,
  rotX = 0,
  sombra = false,
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
  rotX?: number;
  sombra?: boolean;
}) {
  return (
    <mesh position={p} rotation={[rotX, rotY, 0]} castShadow={sombra} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={rough}
        metalness={metal}
        transparent={opacity !== undefined}
        opacity={opacity}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

function Tubo({
  p,
  r,
  h,
  color,
  eje = "y",
  rough = 0.5,
}: {
  p: V3;
  r: number;
  h: number;
  color: string;
  eje?: "x" | "y" | "z";
  rough?: number;
}) {
  const rot: V3 = eje === "x" ? [0, 0, Math.PI / 2] : eje === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={p} rotation={rot}>
      <cylinderGeometry args={[r, r, h, 16]} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}

/** Vertical plane (wall face) drawn once, facing the room. */
function Pared({
  p,
  w,
  h,
  rotY,
  color,
  rough = 0.9,
}: {
  p: V3;
  w: number;
  h: number;
  rotY: number;
  color: string;
  rough?: number;
}) {
  return (
    <mesh position={p} rotation={[0, rotY, 0]} receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}

/** Single student desk: laminated top, lower shelf and a grey tubular frame
 *  (foot runner + two uprights per side). Faces +x. */
function Carpeta({ x, z, lay }: { x: number; z: number; lay: LayoutA1001 }) {
  const { ancho, fondo, alto } = lay.carpeta;
  return (
    <group position={[x, 0, z]}>
      <Bloque p={[0, alto - 0.015, 0]} s={[fondo, 0.03, ancho]} color={P.tablero} rough={0.45} sombra />
      <Bloque p={[0.02, alto - 0.2, 0]} s={[fondo - 0.12, 0.02, ancho - 0.1]} color={"#d9d7d2"} />
      {[-1, 1].map((lado) => {
        const lz = lado * (ancho / 2 - 0.03);
        return (
          <group key={lado}>
            <Bloque p={[0, 0.02, lz]} s={[fondo - 0.05, 0.03, 0.03]} color={P.estructura} rough={0.4} metal={0.3} />
            <Bloque p={[-fondo / 2 + 0.04, alto / 2, lz]} s={[0.03, alto - 0.03, 0.03]} color={P.estructura} rough={0.4} metal={0.3} />
            <Bloque p={[fondo / 2 - 0.04, alto / 2, lz]} s={[0.03, alto - 0.03, 0.03]} color={P.estructura} rough={0.4} metal={0.3} />
          </group>
        );
      })}
    </group>
  );
}

/** Black polypropylene sled chair (cantilever runners), facing +x. */
function SillaTrineo({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <Bloque p={[0, 0.45, 0]} s={[0.43, 0.04, 0.43]} color={P.silla} rough={0.85} sombra />
      <Bloque p={[-0.2, 0.68, 0]} s={[0.035, 0.36, 0.42]} color={P.silla} rough={0.85} rotX={0} sombra />
      {[-1, 1].map((lado) => {
        const lz = lado * 0.19;
        return (
          <group key={lado}>
            {/* sled runner on the floor */}
            <Bloque p={[0, 0.015, lz]} s={[0.5, 0.03, 0.03]} color={P.estructura} rough={0.35} metal={0.4} />
            {/* rear post up to the backrest, front post under the seat */}
            <Bloque p={[-0.22, 0.4, lz]} s={[0.03, 0.78, 0.03]} color={P.estructura} rough={0.35} metal={0.4} />
            <Bloque p={[0.2, 0.23, lz]} s={[0.03, 0.44, 0.03]} color={P.estructura} rough={0.35} metal={0.4} />
          </group>
        );
      })}
    </group>
  );
}

function Podio({ lay }: { lay: LayoutA1001 }) {
  const { x, z, ancho, fondo, alto } = lay.podio;
  return (
    <group position={[x, 0, z]}>
      <Bloque p={[0, alto / 2, 0]} s={[fondo, alto, ancho]} color={"#dedcd7"} rough={0.6} sombra />
      <Bloque p={[0, alto + 0.015, 0]} s={[fondo + 0.06, 0.03, ancho + 0.06]} color={"#c8c6c1"} rough={0.5} />
    </group>
  );
}

/** Laptop on the podium (equipment layer). */
function Laptop({ lay }: { lay: LayoutA1001 }) {
  const { x, z, alto } = lay.podio;
  return (
    <group position={[x - 0.05, alto + 0.03, z]}>
      <Bloque p={[0, 0.01, 0]} s={[0.24, 0.02, 0.34]} color={"#3a3d40"} rough={0.4} metal={0.3} />
      <Bloque p={[-0.13, 0.12, 0]} s={[0.02, 0.22, 0.34]} color={"#3a3d40"} rough={0.4} metal={0.3} rotX={0} />
      <Bloque p={[-0.118, 0.12, 0]} s={[0.005, 0.19, 0.31]} color={P.pantalla} emissive="#1b3a55" emissiveIntensity={0.5} />
    </group>
  );
}

/** Interactive display on its black rolling stand, screen facing -x. */
function PantallaInteractiva({ lay }: { lay: LayoutA1001 }) {
  const { z, ancho, alto, yCentro } = lay.frente.pantallaInteractiva;
  const x = lay.L - 0.55;
  return (
    <group position={[x, 0, z]}>
      {/* screen + bezel */}
      <Bloque p={[0, yCentro, 0]} s={[0.07, alto + 0.06, ancho + 0.06]} color={"#0f1214"} rough={0.5} sombra />
      <Bloque p={[-0.04, yCentro, 0]} s={[0.005, alto, ancho]} color={P.pantalla} rough={0.25} emissive="#0d1420" emissiveIntensity={0.35} />
      {/* posts, shelf, feet with casters */}
      {[-0.32, 0.32].map((dz) => (
        <Bloque key={dz} p={[0.06, 0.95, dz]} s={[0.05, 1.9, 0.05]} color={P.negro} rough={0.5} />
      ))}
      <Bloque p={[0.03, 0.72, 0]} s={[0.3, 0.03, 0.62]} color={P.negro} rough={0.5} />
      {[-0.36, 0.36].map((dz) => (
        <Bloque key={dz} p={[0.06, 0.06, dz]} s={[0.78, 0.05, 0.06]} color={P.negro} rough={0.5} />
      ))}
      {[-0.36, 0.36].flatMap((dz) =>
        [-0.36, 0.36].map((dx) => (
          <mesh key={`${dx}-${dz}`} position={[0.06 + dx, 0.03, dz]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#1b1d1f" roughness={0.45} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Pizarra({
  lay,
  z0,
  z1,
  y0,
  y1,
  sobreResalte,
}: {
  lay: LayoutA1001;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  sobreResalte: boolean;
}) {
  const x = lay.L - (sobreResalte ? lay.frente.resalte.fondo : 0);
  return (
    <group>
      <Bloque p={[x - 0.02, (y0 + y1) / 2, (z0 + z1) / 2]} s={[0.02, y1 - y0 + 0.04, z1 - z0 + 0.04]} color={"#b9b9b6"} />
      <Bloque p={[x - 0.035, (y0 + y1) / 2, (z0 + z1) / 2]} s={[0.01, y1 - y0, z1 - z0]} color={"#fbfbf9"} rough={0.35} />
    </group>
  );
}

function Puerta({ lay, cx, w, h, transom }: { lay: LayoutA1001; cx: number; w: number; h: number; transom: boolean }) {
  const z = lay.W - 0.06;
  const yFranja = lay.pasillo.franjaAlta.y0;
  return (
    <group>
      {/* leaf with a narrow vision panel and a steel handle */}
      <Bloque p={[cx, h / 2, z]} s={[w, h, 0.07]} color={P.puerta} rough={0.55} sombra />
      <Bloque p={[cx + w * 0.22, h * 0.62, z - 0.045]} s={[0.14, 0.7, 0.01]} color={P.vidrio} opacity={0.5} rough={0.1} />
      <Bloque p={[cx - w * 0.3, 1.05, z - 0.06]} s={[0.12, 0.03, 0.03]} color={P.acero} rough={0.3} metal={0.6} />
      {/* frame */}
      <Bloque p={[cx - w / 2 - 0.03, h / 2, z]} s={[0.06, h, 0.1]} color={P.marco} />
      <Bloque p={[cx + w / 2 + 0.03, h / 2, z]} s={[0.06, h, 0.1]} color={P.marco} />
      <Bloque p={[cx, h + 0.03, z]} s={[w + 0.12, 0.06, 0.1]} color={P.marco} />
      {/* clear transom up to the frosted strip */}
      {transom && (
        <Bloque p={[cx, (h + 0.06 + yFranja) / 2, z]} s={[w, yFranja - h - 0.06, 0.02]} color={P.vidrio} opacity={0.35} rough={0.1} />
      )}
    </group>
  );
}

function Nodo({
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
          color={selected ? P.sensorSel : P.sensor}
          emissive={selected ? P.sensorSel : P.sensor}
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

function rango(a: number, b: number, paso: number): number[] {
  const out: number[] = [];
  for (let v = a; v <= b + 1e-6; v += paso) out.push(v);
  return out;
}

export function A1001Scene({
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
  const lay = A1001;
  const { L, W, H } = lay;
  const vigaAlto = 0.42;
  const vidrioTop = H - vigaAlto; // glazing stops under the concrete lintel

  const mullions = useMemo(
    () => rango(lay.ventanal.x0, lay.ventanal.x1, lay.ventanal.paso),
    [lay],
  );
  const franjaMullions = useMemo(
    () => rango(lay.pasillo.franjaAlta.x0, lay.pasillo.franjaAlta.x1, lay.pasillo.franjaAlta.paso),
    [lay],
  );
  const juntasX = useMemo(() => rango(0.61, L - 0.3, 0.61), [L]);
  const juntasZ = useMemo(() => rango(0.61, W - 0.3, 0.61), [W]);
  const juntasFondo = useMemo(() => rango(1.22, W - 0.6, 1.22), [W]);

  // corridor wall segments between the doors (lower band)
  const puertas = [...lay.pasillo.puertas].sort((a, b) => a.cx - b.cx);
  const tramos: [number, number][] = [];
  let cursor = 0;
  for (const d of puertas) {
    tramos.push([cursor, d.cx - d.w / 2 - 0.06]);
    cursor = d.cx + d.w / 2 + 0.06;
  }
  tramos.push([cursor, L]);
  const yFranja0 = lay.pasillo.franjaAlta.y0;
  const yFranja1 = lay.pasillo.franjaAlta.y1;

  const sillas: XZ[] = lay.carpetas.map((c) => ({ x: c.x - lay.carpeta.fondo / 2 - 0.2, z: c.z }));

  return (
    <Canvas
      shadows
      camera={{ position: [-4.8, 6.4, 1.4], fov: 48 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#0d1319"]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#e6eef4", "#3a3f44", 0.45]} />
      {/* daylight comes through the glazing on the z = 0 side */}
      <directionalLight
        position={[L * 0.45, H * 1.9, -6]}
        intensity={1.3}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-4, H * 2.4, W + 3]} intensity={0.3} />

      {/* ============ ESTRUCTURA ============ */}
      <group visible={capas.estructura}>
        {/* vinyl floor (light grey) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / 2, 0, W / 2]} receiveShadow>
          <planeGeometry args={[L, W]} />
          <meshStandardMaterial color={P.piso} roughness={0.3} metalness={0.06} />
        </mesh>

        {/* back wall: white panels, open toward the default camera */}
        <Pared p={[0, H / 2, W / 2]} w={W} h={H} rotY={Math.PI / 2} color={P.blanco} />
        {/* front wall: exposed concrete, with the protruding section on the right */}
        <Pared p={[L, H / 2, W / 2]} w={W} h={H} rotY={-Math.PI / 2} color={P.concretoClaro} rough={0.95} />
        <Bloque
          p={[L - lay.frente.resalte.fondo / 2, H / 2, (lay.frente.resalte.z0 + lay.frente.resalte.z1) / 2]}
          s={[lay.frente.resalte.fondo, H, lay.frente.resalte.z1 - lay.frente.resalte.z0]}
          color={P.concreto}
          rough={0.95}
        />
        {/* signs and sockets on the front wall */}
        {lay.frente.senales.map((s, i) => (
          <Bloque key={i} p={[L - 0.01, s.y, s.z]} s={[0.01, 0.2, 0.16]} color={i === 0 ? "#c8352a" : "#2b6cb0"} />
        ))}
        {lay.frente.tomacorrientes.map((tz, i) => (
          <Bloque key={i} p={[L - 0.015, 0.35, tz]} s={[0.02, 0.08, 0.08]} color={"#f4f4f2"} />
        ))}
        {/* white panel joints on the back wall (faces the room only) */}
        {juntasFondo.map((jz) => (
          <Pared key={`jf${jz}`} p={[0.005, H / 2, jz]} w={0.015} h={H} rotY={Math.PI / 2} color={"#d8d6d0"} />
        ))}
        {/* small dark sign on the back wall (faces the room only) */}
        <Pared p={[0.01, lay.fondo.letrero.y, lay.fondo.letrero.z]} w={0.26} h={0.12} rotY={Math.PI / 2} color={"#2a2d30"} rough={0.6} />

        {/* glazing side: back pier, front column (concrete) */}
        <Bloque
          p={[(lay.pilarFondo.x0 + lay.pilarFondo.x1) / 2, H / 2, (lay.pilarFondo.z0 + lay.pilarFondo.z1) / 2]}
          s={[lay.pilarFondo.x1 - lay.pilarFondo.x0, H, lay.pilarFondo.z1 - lay.pilarFondo.z0]}
          color={P.concreto}
        />
        <Bloque
          p={[(lay.columnaFrente.x0 + lay.columnaFrente.x1) / 2, H / 2, (lay.columnaFrente.z0 + lay.columnaFrente.z1) / 2]}
          s={[lay.columnaFrente.x1 - lay.columnaFrente.x0, H, lay.columnaFrente.z1 - lay.columnaFrente.z0]}
          color={P.concreto}
          sombra
        />
        {/* low sill under the glazing */}
        <Bloque p={[(lay.ventanal.x0 + lay.ventanal.x1) / 2, 0.03, 0.05]} s={[lay.ventanal.x1 - lay.ventanal.x0, 0.06, 0.1]} color={P.marco} />

        {/* corridor wall (z = W): lower band between doors, header, end pieces */}
        {tramos.map(([x0, x1], i) =>
          x1 - x0 > 0.01 ? (
            <Bloque key={i} p={[(x0 + x1) / 2, yFranja0 / 2, W - 0.06]} s={[x1 - x0, yFranja0, 0.12]} color={P.blanco} />
          ) : null,
        )}
        <Bloque p={[L / 2, (yFranja1 + H) / 2, W - 0.06]} s={[L, H - yFranja1, 0.12]} color={P.blanco} />
        <Bloque p={[lay.pasillo.franjaAlta.x0 / 2, (yFranja0 + yFranja1) / 2, W - 0.06]} s={[lay.pasillo.franjaAlta.x0, yFranja1 - yFranja0, 0.12]} color={P.blanco} />
        <Bloque p={[(lay.pasillo.franjaAlta.x1 + L) / 2, (yFranja0 + yFranja1) / 2, W - 0.06]} s={[L - lay.pasillo.franjaAlta.x1, yFranja1 - yFranja0, 0.12]} color={P.blanco} />
        {/* concrete column attached to the corridor wall */}
        <Bloque p={[lay.pasillo.columnaX, H / 2, W - 0.2]} s={[0.45, H, 0.4]} color={P.concreto} sombra />
        {/* doors */}
        {lay.pasillo.puertas.map((d, i) => (
          <Puerta key={i} lay={lay} cx={d.cx} w={d.w} h={d.h} transom={d.transom} />
        ))}

        {/* exposed concrete beams */}
        {lay.vigas.map((v, i) =>
          v.eje === "x" ? (
            <Bloque key={i} p={[L / 2, H - vigaAlto / 2, v.z]} s={[L, vigaAlto, 0.4]} color={P.concreto} rough={0.95} />
          ) : (
            <Bloque key={i} p={[v.x, H - vigaAlto / 2, W / 2]} s={[0.4, vigaAlto, W]} color={P.concreto} rough={0.95} />
          ),
        )}
      </group>

      {/* ============ VIDRIOS ============ */}
      <group visible={capas.vidrios}>
        {/* fixed curtain wall: clear glass, dark mullions and two transoms */}
        <mesh position={[(lay.ventanal.x0 + lay.ventanal.x1) / 2, vidrioTop / 2, 0]}>
          <planeGeometry args={[lay.ventanal.x1 - lay.ventanal.x0, vidrioTop]} />
          <meshStandardMaterial color={P.vidrio} transparent opacity={0.16} roughness={0.06} side={2} />
        </mesh>
        {mullions.map((mx) => (
          <Bloque key={mx} p={[mx, vidrioTop / 2, 0.02]} s={[0.06, vidrioTop, 0.08]} color={P.marco} rough={0.4} metal={0.3} />
        ))}
        {lay.ventanal.travesanos.map((ty) => (
          <Bloque key={ty} p={[(lay.ventanal.x0 + lay.ventanal.x1) / 2, ty, 0.02]} s={[lay.ventanal.x1 - lay.ventanal.x0, 0.07, 0.08]} color={P.marco} rough={0.4} metal={0.3} />
        ))}
        <Bloque p={[(lay.ventanal.x0 + lay.ventanal.x1) / 2, vidrioTop - 0.03, 0.02]} s={[lay.ventanal.x1 - lay.ventanal.x0, 0.06, 0.08]} color={P.marco} />

        {/* frosted high strip on the corridor wall */}
        <Bloque
          p={[(lay.pasillo.franjaAlta.x0 + lay.pasillo.franjaAlta.x1) / 2, (yFranja0 + yFranja1) / 2, W - 0.05]}
          s={[lay.pasillo.franjaAlta.x1 - lay.pasillo.franjaAlta.x0, yFranja1 - yFranja0, 0.02]}
          color={P.esmerilado}
          opacity={0.55}
          rough={0.2}
        />
        {franjaMullions.map((mx) => (
          <Bloque key={mx} p={[mx, (yFranja0 + yFranja1) / 2, W - 0.06]} s={[0.05, yFranja1 - yFranja0, 0.09]} color={"#e9e9e6"} />
        ))}
        <Bloque p={[(lay.pasillo.franjaAlta.x0 + lay.pasillo.franjaAlta.x1) / 2, yFranja0, W - 0.06]} s={[lay.pasillo.franjaAlta.x1 - lay.pasillo.franjaAlta.x0, 0.05, 0.1]} color={"#e9e9e6"} />
        <Bloque p={[(lay.pasillo.franjaAlta.x0 + lay.pasillo.franjaAlta.x1) / 2, yFranja1, W - 0.06]} s={[lay.pasillo.franjaAlta.x1 - lay.pasillo.franjaAlta.x0, 0.05, 0.1]} color={"#e9e9e6"} />
      </group>

      {/* ============ TECHO (paneles, bandejas, proyectores, parlantes) ============ */}
      <group visible={capas.techo}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[L / 2, H, W / 2]}>
          <planeGeometry args={[L, W]} />
          <meshStandardMaterial color={P.panel} roughness={0.95} />
        </mesh>
        {/* panel seams (0.61 m grid), drawn downward-facing like the panels */}
        {juntasX.map((jx) => (
          <mesh key={`jx${jx}`} rotation={[Math.PI / 2, 0, 0]} position={[jx, H - 0.004, W / 2]}>
            <planeGeometry args={[0.012, W]} />
            <meshStandardMaterial color={P.junta} roughness={0.95} />
          </mesh>
        ))}
        {juntasZ.map((jz) => (
          <mesh key={`jz${jz}`} rotation={[Math.PI / 2, 0, 0]} position={[L / 2, H - 0.004, jz]}>
            <planeGeometry args={[L, 0.012]} />
            <meshStandardMaterial color={P.junta} roughness={0.95} />
          </mesh>
        ))}
        {/* galvanized perforated cable trays with hangers */}
        {lay.bandejas.map((b, i) =>
          b.eje === "z" ? (
            <group key={i}>
              <Bloque p={[b.x, H - 0.6, (b.z0 + b.z1) / 2]} s={[0.3, 0.08, b.z1 - b.z0]} color={P.bandeja} rough={0.5} metal={0.4} />
              {rango(b.z0 + 0.5, b.z1 - 0.3, 1.5).map((hz) => (
                <Tubo key={hz} p={[b.x, H - 0.3, hz]} r={0.012} h={0.56} color={P.bandeja} />
              ))}
            </group>
          ) : (
            <group key={i}>
              <Bloque p={[(b.x0 + b.x1) / 2, H - 0.6, b.z]} s={[b.x1 - b.x0, 0.08, 0.3]} color={P.bandeja} rough={0.5} metal={0.4} />
              {rango(b.x0 + 0.5, b.x1 - 0.3, 1.5).map((hx) => (
                <Tubo key={hx} p={[hx, H - 0.3, b.z]} r={0.012} h={0.56} color={P.bandeja} />
              ))}
            </group>
          ),
        )}
        {/* projectors: one by the front beam aiming at the back screen, one by the back aiming at the front */}
        {lay.proyectores.map((pr, i) => {
          const dir = pr.mira === "fondo" ? -1 : 1;
          return (
            <group key={i} position={[pr.x, 0, pr.z]}>
              <Tubo p={[0, H - 0.18, 0]} r={0.02} h={0.36} color={P.estructura} />
              <Bloque p={[0, H - 0.43, 0]} s={[0.4, 0.13, 0.3]} color={"#eaeae6"} rough={0.5} />
              <Tubo p={[dir * 0.2, H - 0.43, 0.06]} r={0.035} h={0.02} color={"#1e2124"} eje="x" />
            </group>
          );
        })}
        {/* round ceiling speakers */}
        {lay.parlantesTecho.map((sp, i) => (
          <Tubo key={i} p={[sp.x, H - 0.03, sp.z]} r={0.16} h={0.06} color={P.parlante} rough={0.7} />
        ))}
      </group>

      {/* ============ LUMINARIAS ============ */}
      <group visible={capas.luminarias}>
        {lay.luminarias.map((li, i) => (
          <group key={i}>
            {[-0.6, 0.6].map((dx) => (
              <Tubo key={dx} p={[li.x + dx, H - 0.17, li.z]} r={0.007} h={0.34} color={P.negro} />
            ))}
            <Bloque p={[li.x, H - 0.37, li.z]} s={[1.5, 0.06, 0.12]} color={P.luminaria} emissive="#ffffff" emissiveIntensity={1.15} />
          </group>
        ))}
      </group>

      {/* ============ VENTILACION (unidad de pared en la columna del ventanal) ============ */}
      <group visible={capas.ventilacion}>
        <Bloque
          p={[lay.unidadPared.x, lay.unidadPared.y, lay.unidadPared.z + 0.11]}
          s={[0.82, 0.3, 0.22]}
          color={"#f4f4f1"}
          rough={0.5}
        />
        <Bloque p={[lay.unidadPared.x, lay.unidadPared.y - 0.1, lay.unidadPared.z + 0.225]} s={[0.7, 0.05, 0.01]} color={"#d9d9d5"} />
      </group>

      {/* ============ CONTRAINCENDIOS (detectores y señalética de salida) ============ */}
      <group visible={capas.contraincendios}>
        {lay.detectoresHumo.map((d, i) => (
          <Tubo key={i} p={[d.x, H - 0.02, d.z]} r={0.06} h={0.04} color={"#f7f7f4"} />
        ))}
        {lay.pasillo.puertas.map((d, i) => (
          <Bloque
            key={i}
            p={[d.cx, d.h + 0.24, W - 0.13]}
            s={[0.36, 0.18, 0.03]}
            color={P.verde}
            emissive={P.verde}
            emissiveIntensity={0.7}
          />
        ))}
      </group>

      {/* ============ MOBILIARIO ============ */}
      <group visible={capas.mobiliario}>
        {lay.carpetas.map((c, i) => (
          <Carpeta key={i} x={c.x} z={c.z} lay={lay} />
        ))}
        <Podio lay={lay} />
        {lay.frente.pizarras.map((pz, i) => (
          <Pizarra key={i} lay={lay} z0={pz.z0} z1={pz.z1} y0={pz.y0} y1={pz.y1} sobreResalte={i === 1} />
        ))}
        {/* roll-down projection screen on the back wall: housing strip + canvas,
            both facing the room only so the cutaway view stays clear */}
        <Pared
          p={[0.05, lay.fondo.pantallaEnrollable.y1 + 0.05, lay.fondo.pantallaEnrollable.cz]}
          w={lay.fondo.pantallaEnrollable.ancho + 0.12}
          h={0.1}
          rotY={Math.PI / 2}
          color={"#d9d8d3"}
          rough={0.5}
        />
        <Pared
          p={[0.05, (lay.fondo.pantallaEnrollable.y0 + lay.fondo.pantallaEnrollable.y1) / 2, lay.fondo.pantallaEnrollable.cz]}
          w={lay.fondo.pantallaEnrollable.ancho}
          h={lay.fondo.pantallaEnrollable.y1 - lay.fondo.pantallaEnrollable.y0}
          rotY={Math.PI / 2}
          color={"#fbfbf9"}
          rough={0.6}
        />
        {/* steel bin by the front door */}
        <Tubo p={[lay.tacho.x, 0.3, lay.tacho.z]} r={0.16} h={0.6} color={P.acero} rough={0.3} />
        <Tubo p={[lay.tacho.x, 0.62, lay.tacho.z]} r={0.165} h={0.04} color={"#2b2e31"} />
      </group>

      {/* ============ EQUIPOS ============ */}
      <group visible={capas.equipos}>
        <PantallaInteractiva lay={lay} />
        <Laptop lay={lay} />
        {/* small wall TV on the front-left column */}
        <Bloque p={[lay.tvPared.x, lay.tvPared.y, lay.tvPared.z + 0.03]} s={[0.56, 0.34, 0.05]} color={"#0f1214"} rough={0.4} />
        <Bloque p={[lay.tvPared.x, lay.tvPared.y, lay.tvPared.z + 0.056]} s={[0.52, 0.3, 0.005]} color={P.pantalla} emissive="#10202e" emissiveIntensity={0.4} />
        {/* black loudspeaker and connection box on the front wall */}
        <Bloque p={[L - 0.12, lay.frente.parlantePared.y, lay.frente.parlantePared.z]} s={[0.22, 0.34, 0.24]} color={"#1a1c1e"} rough={0.6} />
        <Bloque p={[L - 0.07, lay.frente.cajaNegra.y, lay.frente.cajaNegra.z]} s={[0.12, 0.24, 0.2]} color={"#1e2124"} rough={0.5} />
      </group>

      {/* ============ SILLAS ============ */}
      <group visible={capas.sillas}>
        {sillas.map((s, i) => (
          <SillaTrineo key={i} x={s.x} z={s.z} />
        ))}
        <SillaTrineo x={lay.sillaDocente.x} z={lay.sillaDocente.z} rotY={Math.PI} />
      </group>

      {/* ============ SENSORES ============ */}
      <group visible={capas.sensores}>
        {aula.nodos.map((n) => {
          const pos = lay.sensores[n];
          if (!pos) return null;
          return (
            <Nodo key={n} nodo={n} position={pos} selected={selected === n} onSelect={(id) => onSelect(id)} />
          );
        })}
      </group>

      <OrbitControls
        target={[L / 2 - 0.4, 0.9, W / 2]}
        maxPolarAngle={Math.PI / 2.02}
        minDistance={2}
        maxDistance={36}
      />
    </Canvas>
  );
}
