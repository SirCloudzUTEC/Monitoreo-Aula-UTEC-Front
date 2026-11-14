"use client";

// Dedicated photographic reconstruction. Confirmed: 32 separate tables and
// closed laptops. All dimensions are approximate; IoT nodes are proposals.
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import {
  Object3D,
  Vector3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
} from "three";
import type { Aula, NodoId } from "@/lib/types";
import { NODO_META, type Capas } from "./classroom-layout";
import { L418 as M } from "./l418-layout";
import { crearGeometriaMesaL418 } from "./l418-table-geometry";
import {
  crearGeometriaPuertaL418,
  crearMurosLateralesL418,
  crearReservadoL418,
  crearSuelosL418,
} from "./l418-room-geometry";

type V3 = [number, number, number];
type Caja = { p: V3; s: V3; rot?: number };
const suelos = crearSuelosL418();
const reservado = crearReservadoL418();
const murosReservados = [...reservado.muros, reservado.tapa];
const puertaReservada = M.puertas.find((p) => p.uso === "zonaReservada")!;
const C = {
  piso: "#a9afb3",
  muro: "#eeece7",
  concreto: "#b8b5ac",
  panel: "#d7d0bd",
  tablero: "#e5e1d6",
  negro: "#26282a",
  metal: "#aeb6ba",
  vidrio: "#bedce3",
  marco: "#c5cbcb",
  puerta: "#403c37",
  rojo: "#b23c43",
};

function Box({
  p,
  s,
  color,
  rot = 0,
  opacity = 1,
  glow = false,
}: Caja & { color: string; opacity?: number; glow?: boolean }) {
  return (
    <mesh position={p} rotation={[0, rot, 0]} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={0.72}
        metalness={0.08}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity === 1}
        emissive={glow ? color : "#000000"}
        emissiveIntensity={glow ? 0.9 : 0}
      />
    </mesh>
  );
}

/** Repeated furniture is instanced instead of issuing 800+ draw calls. */
function Cajas({
  items,
  color,
  geometry,
}: {
  items: Caja[];
  color: string;
  geometry?: BufferGeometry;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const obj = new Object3D();
    items.forEach((item, i) => {
      obj.position.set(...item.p);
      obj.scale.set(...item.s);
      obj.rotation.set(0, item.rot ?? 0, 0);
      obj.updateMatrix();
      mesh.current!.setMatrixAt(i, obj.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [items, invalidate]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      frustumCulled={false}
      receiveShadow
    >
      {geometry ? (
        <primitive object={geometry} attach="geometry" />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.12} />
    </instancedMesh>
  );
}

function Tubo({
  p,
  h,
  r = 0.02,
  color,
  eje = "y",
}: {
  p: V3;
  h: number;
  r?: number;
  color: string;
  eje?: "x" | "y" | "z";
}) {
  const rotation: V3 =
    eje === "x"
      ? [0, 0, Math.PI / 2]
      : eje === "z"
        ? [Math.PI / 2, 0, 0]
        : [0, 0, 0];
  return (
    <mesh position={p} rotation={rotation}>
      <cylinderGeometry args={[r, r, h, 12]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.15} />
    </mesh>
  );
}

/** Nearest walls disappear for inspection; remaining walls have thickness. */
function Corte({
  eje,
  limite,
  positivo,
  children,
}: {
  eje: "x" | "z";
  limite: number;
  positivo: boolean;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (group.current)
      group.current.visible = positivo
        ? camera.position[eje] >= limite
        : camera.position[eje] <= limite;
  });
  return <group ref={group}>{children}</group>;
}

function Puerta({ puerta }: { puerta: (typeof M.puertas)[number] }) {
  const { x, z, mirilla } = puerta;
  const { hoja, marcos, protector, manilla } = crearGeometriaPuertaL418(puerta);
  return (
    <group>
      <Box {...hoja} color={C.puerta} />
      {marcos.map((marco, i) => (
        <Box key={i} {...marco} color={C.negro} />
      ))}
      <Box {...protector} color={C.metal} />
      {mirilla && (
        <>
          <Box
            p={[x - 0.17, 1.25, z - 0.046]}
            s={[0.14, 1.32, 0.025]}
            color={C.metal}
          />
          <Box
            p={[x - 0.17, 1.25, z - 0.062]}
            s={[0.1, 1.24, 0.012]}
            color={C.vidrio}
          />
        </>
      )}
      <Tubo p={manilla} h={0.15} r={0.018} color={C.metal} eje="x" />
    </group>
  );
}

function Lateral({ indice, capas }: { indice: number; capas: Capas }) {
  const v = M.vidrios[indice];
  const { muros, puerta } = crearMurosLateralesL418(indice);
  const { x0, x1, z, alto, pasillo } = v;
  const ancho = x1 - x0;
  return (
    <Corte eje="z" limite={z} positivo={z === 0}>
      <group visible={capas.estructura}>
        {muros.map((muro, i) => (
          <Box key={i} {...muro} color={C.muro} />
        ))}
        <Box
          p={[(x0 + x1) / 2, (alto + M.H) / 2, z]}
          s={[ancho, M.H - alto, 0.24]}
          color={C.concreto}
        />
        {puerta && <Puerta puerta={puerta} />}
      </group>
      <group visible={capas.vidrios}>
        <Box
          p={[(x0 + x1) / 2, alto / 2, z]}
          s={[ancho, alto, 0.018]}
          color={C.vidrio}
          opacity={0.15}
        />
        {Array.from({ length: 7 }, (_, i) => x0 + (ancho * i) / 6).map((x) => (
          <Box
            key={x}
            p={[x, alto / 2, z]}
            s={[0.055, alto, 0.085]}
            color={C.marco}
          />
        ))}
        {[0.04, 0.92, pasillo ? 2.27 : 2.8].map((y) => (
          <Box
            key={y}
            p={[(x0 + x1) / 2, y, z]}
            s={[ancho, 0.048, 0.08]}
            color={C.marco}
          />
        ))}
        {pasillo ? (
          <>
            <Box
              p={[(x0 + x1) / 2, 1.12, z]}
              s={[ancho, 0.13, 0.022]}
              color="#e5ebea"
              opacity={0.6}
            />
            {Array.from({ length: 7 }, (_, i) => 2.34 + i * 0.065).map((y) => (
              <Box
                key={y}
                p={[(x0 + x1) / 2, y, z]}
                s={[ancho, 0.035, 0.09]}
                color={C.marco}
              />
            ))}
          </>
        ) : (
          <>
            <Tubo
              p={[(x0 + x1) / 2, 0.95, 0.25]}
              h={ancho}
              color={C.metal}
              eje="x"
            />
            {[x0 + 0.12, x0 + ancho / 3, x0 + (2 * ancho) / 3, x1 - 0.12].map(
              (x) => (
                <Tubo
                  key={x}
                  p={[x, 0.475, 0.25]}
                  h={0.95}
                  r={0.018}
                  color={C.metal}
                />
              ),
            )}
          </>
        )}
      </group>
    </Corte>
  );
}

const tableros: Caja[] = M.puestos.map((p) => ({
  p: [p.x, M.mesa.alto, p.z],
  s: [0.994, 1, 0.994],
  rot: p.rot,
}));
const bordes: Caja[] = M.puestos.map((p) => ({
  p: [p.x, M.mesa.alto - 0.006, p.z],
  s: [1, 1, 1],
  rot: p.rot,
}));
function Tableros() {
  const geometry = useMemo(() => crearGeometriaMesaL418(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <Cajas items={bordes} color={C.negro} geometry={geometry} />
      <Cajas items={tableros} color={C.tablero} geometry={geometry} />
    </>
  );
}
const patas: Caja[] = M.puestos.flatMap((p) => {
  const out: Caja[] = [];
  const corners = M.mesa.contorno.map(([x, z]) => ({
    x: p.x + 0.82 * (x * Math.cos(p.rot) + z * Math.sin(p.rot)),
    z: p.z + 0.82 * (-x * Math.sin(p.rot) + z * Math.cos(p.rot)),
  }));
  corners.forEach((v, i) => {
    out.push({ p: [v.x, 0.365, v.z], s: [0.036, 0.73, 0.036] });
    const next = corners[(i + 1) % corners.length];
    const dx = next.x - v.x,
      dz = next.z - v.z;
    out.push({
      p: [(v.x + next.x) / 2, 0.65, (v.z + next.z) / 2],
      s: [Math.hypot(dx, dz), 0.045, 0.035],
      rot: -Math.atan2(dz, dx),
    });
  });
  return out;
});
const laptops: Caja[] = M.laptops.map((p) => ({
  p: [p.x, 0.79, p.z],
  s: [0.36, 0.025, 0.25],
}));
const tapasLaptop: Caja[] = M.laptops.map((p) => ({
  p: [p.x, 0.805, p.z],
  s: [0.34, 0.008, 0.235],
}));
const sillas: Caja[] = M.sillas.flatMap((s) => {
  const out: Caja[] = [];
  const coord = (x: number, y: number, z: number): V3 => [
    s.x + x * Math.cos(s.rot) + z * Math.sin(s.rot),
    y,
    s.z - x * Math.sin(s.rot) + z * Math.cos(s.rot),
  ];
  out.push({ p: coord(0, 0.45, 0), s: [0.42, 0.065, 0.4], rot: s.rot });
  out.push({ p: coord(0, 0.67, -0.2), s: [0.38, 0.32, 0.055], rot: s.rot });
  out.push({ p: coord(0, 0.91, -0.2), s: [0.32, 0.055, 0.055], rot: s.rot });
  for (const dx of [-0.16, 0.16])
    out.push({ p: coord(dx, 0.85, -0.2), s: [0.045, 0.12, 0.055], rot: s.rot });
  out.push({ p: coord(0, 0.26, 0), s: [0.06, 0.35, 0.06] });
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    out.push({
      p: coord(Math.sin(a) * 0.15, 0.09, Math.cos(a) * 0.15),
      s: [0.035, 0.035, 0.32],
      rot: s.rot + a,
    });
    out.push({
      p: coord(Math.sin(a) * 0.28, 0.045, Math.cos(a) * 0.28),
      s: [0.065, 0.075, 0.07],
      rot: s.rot + a,
    });
  }
  return out;
});

function Pizarra({ z }: { z: number }) {
  return (
    <group position={[0.52, 0, z]}>
      <Box p={[0, 1.45, 0]} s={[0.065, 1.35, 1.04]} color={C.negro} />
      <Box p={[0.04, 1.45, 0]} s={[0.016, 1.25, 0.94]} color="#fafaf5" />
      {[-0.44, 0.44].map((dz) => (
        <group key={dz}>
          <Box p={[0, 0.42, dz]} s={[0.045, 0.8, 0.045]} color={C.negro} />
          <Box p={[0, 0.1, dz]} s={[0.7, 0.045, 0.045]} color={C.negro} />
          {[-0.3, 0.3].map((dx) => (
            <Tubo
              key={dx}
              p={[dx, 0.045, dz]}
              h={0.04}
              r={0.045}
              color={C.negro}
              eje="z"
            />
          ))}
        </group>
      ))}
    </group>
  );
}

function Armario({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      <Box p={[0, 1.03, 0]} s={[0.92, 2.06, 0.47]} color="#dadcd7" />
      <Box p={[0, 1.05, 0.246]} s={[0.82, 1.92, 0.018]} color="#536368" />
      <Box
        p={[0, 1.05, 0.26]}
        s={[0.8, 1.88, 0.014]}
        color={C.vidrio}
        opacity={0.2}
      />
      {[0.16, 0.62, 1.08, 1.54, 2.0].map((y) => (
        <Box key={y} p={[0, y, 0.27]} s={[0.83, 0.025, 0.06]} color="#dbded9" />
      ))}
      <Box p={[0, 1.05, 0.28]} s={[0.025, 1.9, 0.025]} color="#dce0dd" />
      <Tubo p={[0.06, 1.03, 0.3]} h={0.19} r={0.012} color={C.metal} />
    </group>
  );
}

function Ventilador({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Tubo p={[0, 0.04, 0]} r={0.25} h={0.05} color={C.negro} />
      <Tubo p={[0, 0.59, 0]} r={0.018} h={1.1} color={C.negro} />
      <mesh position={[0, 1.35, 0]}>
        <torusGeometry args={[0.27, 0.012, 8, 32]} />
        <meshStandardMaterial color={C.negro} />
      </mesh>
      <Tubo p={[0, 1.35, 0]} r={0.07} h={0.11} color={C.negro} eje="z" />
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0, 1.35, 0.012]}
          rotation={[0, 0, (i * Math.PI) / 4]}
        >
          <boxGeometry args={[0.015, 0.52, 0.008]} />
          <meshStandardMaterial color={C.negro} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, 1.35, -0.015]}
          rotation={[0, 0, (i * Math.PI * 2) / 3]}
        >
          <boxGeometry args={[0.12, 0.36, 0.015]} />
          <meshStandardMaterial color="#53585a" transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function Servicios({ capas }: { capas: Capas }) {
  const entrada = M.puertas.find((p) => p.uso === "entradaSalida")!;
  const ductoX0 = M.reservado.x1 + 0.08;
  const ductoX1 = 9.7;
  return (
    <>
      <group visible={capas.techo}>
        <mesh position={[M.L / 2, M.H, M.W / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[M.L, M.W]} />
          <meshStandardMaterial color={C.panel} roughness={1} />
        </mesh>
        {[0.2, 2.9, 8.85, 11.6].map((x) => (
          <Box
            key={x}
            p={[x, M.H - 0.23, M.W / 2]}
            s={[0.4, 0.46, M.W]}
            color={C.concreto}
          />
        ))}
        {[0.18, M.W - 0.18].map((z) => (
          <Box
            key={z}
            p={[M.L / 2, M.H - 0.2, z]}
            s={[M.L, 0.4, 0.35]}
            color={C.concreto}
          />
        ))}
        {[1.68, 10.3].map((x) => {
          const z0 = x - 0.145 < M.reservado.x1 ? M.reservado.z1 + 0.08 : 0.2;
          const z1 = M.W - 0.2;
          return (
            <group key={x}>
              <Box
                p={[x, M.H - 0.52, (z0 + z1) / 2]}
                s={[0.28, 0.055, z1 - z0]}
                color={C.metal}
              />
              {Array.from(
                { length: Math.floor((M.W - 0.8) / 0.36) + 1 },
                (_, i) => 0.4 + i * 0.36,
              )
                .filter((z) => z - 0.011 >= z0 && z + 0.011 <= z1)
                .map((z) => (
                  <Box
                    key={z}
                    p={[x, M.H - 0.485, z]}
                    s={[0.29, 0.015, 0.022]}
                    color="#858e93"
                  />
                ))}
            </group>
          );
        })}
        <Box
          p={[5.95, M.H - 0.49, M.W - 0.55]}
          s={[8.55, 0.055, 0.3]}
          color={C.metal}
        />
        {M.enrolladores.map((p, i) => (
          <group key={i}>
            <Box
              p={[p.x, M.H - 0.39, p.z]}
              s={[0.2, 0.22, 0.17]}
              color="#1b1d1f"
            />
            <Tubo
              p={[p.x, M.H - 0.39, p.z + 0.09]}
              h={0.035}
              r={0.115}
              color="#35383b"
              eje="z"
            />
            <Tubo p={[p.x, 1.62, p.z]} h={1.62} r={0.009} color="#222426" />
            <Box p={[p.x, 0.85, p.z]} s={[0.16, 0.055, 0.07]} color="#2d3032" />
          </group>
        ))}
        {[3.15, 7.3].map((x) => (
          <Tubo
            key={x}
            p={[x, M.H - 0.03, M.W / 2]}
            h={0.04}
            r={0.15}
            color="#f1f0e9"
          />
        ))}
      </group>
      <group visible={capas.luminarias}>
        {M.luminarias.map((p, i) => (
          <group key={i}>
            {[-0.5, 0.5].map((dx) => (
              <Tubo
                key={dx}
                p={[p.x + dx, M.H - 0.22, p.z]}
                h={0.42}
                r={0.006}
                color={C.negro}
              />
            ))}
            <Box
              p={[p.x, M.H - 0.45, p.z]}
              s={[1.4, 0.065, 0.11]}
              color="#f9f8ee"
              glow
            />
          </group>
        ))}
      </group>
      <group visible={capas.ventilacion}>
        <Box
          p={[(ductoX0 + ductoX1) / 2, M.H - 0.46, 0.85]}
          s={[ductoX1 - ductoX0, 0.27, 0.34]}
          color={C.metal}
        />
        <Tubo
          p={[8.82, M.H - 0.46, 0.85]}
          h={1.05}
          r={0.23}
          color="#e0dfd4"
          eje="x"
        />
        {[2.9, 8.82].map((x) => (
          <group key={x}>
            <Box
              p={[x, M.H - 0.46, 1.16]}
              s={[0.48, 0.24, 0.72]}
              color={C.metal}
            />
            <Box
              p={[x, M.H - 0.6, 1.45]}
              s={[0.5, 0.04, 0.5]}
              color="#777f80"
            />
            {Array.from({ length: 7 }, (_, i) => 1.24 + i * 0.065).map((z) => (
              <Box
                key={z}
                p={[x, M.H - 0.625, z]}
                s={[0.47, 0.015, 0.023]}
                color="#e1e1d9"
              />
            ))}
          </group>
        ))}
        <Ventilador x={9.8} z={1.1} />
        <Ventilador x={10.1} z={M.W - 0.6} />
      </group>
      <group visible={capas.contraincendios}>
        <Tubo
          p={[M.L / 2, M.H - 0.14, M.W / 2]}
          h={M.L - 0.4}
          r={0.024}
          color={C.rojo}
          eje="x"
        />
        {[M.reservado.x1 + 0.15, 6.5, 10.15].map((x) => (
          <group key={x}>
            <Tubo
              p={[x, M.H - 0.14, M.W / 2]}
              h={M.W - 1}
              r={0.021}
              color={C.rojo}
              eje="z"
            />
            {[0.5, M.W - 0.5].map((z) => (
              <Tubo
                key={z}
                p={[x, M.H - 0.19, z]}
                h={0.08}
                r={0.018}
                color="#b8a18a"
              />
            ))}
          </group>
        ))}
        <Box
          p={[entrada.x, 2.5, entrada.z - 0.15]}
          s={[0.38, 0.18, 0.025]}
          color="#238052"
          glow
        />
        <Box
          p={[1.77, 2.35, M.W - 0.63]}
          s={[0.16, 0.19, 0.05]}
          color={C.rojo}
        />
      </group>
    </>
  );
}

function Nodo({
  id,
  position,
  selected,
  onSelect,
}: {
  id: NodoId;
  position: V3;
  selected: boolean;
  onSelect: (n: NodoId) => void;
}) {
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
      >
        <sphereGeometry args={[selected ? 0.115 : 0.085, 16, 12]} />
        <meshStandardMaterial
          color={selected ? "#ffd36a" : "#39bce6"}
          emissive="#1483a7"
          emissiveIntensity={0.6}
        />
      </mesh>
      <Html
        center
        position={[0, 0.2, 0]}
        distanceFactor={13}
        style={{ pointerEvents: "none" }}
      >
        <span className="whitespace-nowrap rounded bg-slate-950/85 px-1.5 py-0.5 text-[9px] text-cyan-100">
          {NODO_META[id].etiqueta} · propuesto
        </span>
      </Html>
    </group>
  );
}

/** Reset the camera without replacing its WebGL context. */
function Controles({ resetKey }: { resetKey: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (resetKey === 0) return;
    camera.position.set(...M.camara);
    // Restore the applied target, not the constructor's default (0,0,0).
    if (
      controls &&
      "target" in controls &&
      controls.target instanceof Vector3
    ) {
      controls.target.set(M.L / 2 - 0.25, 0.9, M.W / 2);
      if ("update" in controls && typeof controls.update === "function")
        controls.update();
    }
    invalidate();
  }, [resetKey, camera, controls, invalidate]);
  return (
    <OrbitControls
      target={[M.L / 2 - 0.25, 0.9, M.W / 2]}
      minDistance={2}
      maxDistance={34}
      maxPolarAngle={Math.PI / 2.02}
      enableDamping={false}
      makeDefault
    />
  );
}

export function L418Scene({
  aula,
  capas,
  selected,
  onSelect,
  resetKey = 0,
}: {
  aula: Aula;
  capas: Capas;
  selected: NodoId | null;
  onSelect: (n: NodoId) => void;
  resetKey?: number;
}) {
  return (
    <div
      className="h-full w-full"
      data-testid="l418-scene"
      aria-label="Gemelo 3D del aula L-418"
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: M.camara, fov: 43 }}
        gl={{ antialias: true, powerPreference: "low-power" }}
      >
        <color attach="background" args={["#141c24"]} />
        <ambientLight intensity={1.4} />
        <hemisphereLight args={["#f0f4f8", "#a7a39a", 1.8]} />
        <directionalLight position={[2, 12, 4]} intensity={2.3} />
        <directionalLight position={[8, 6, -4]} intensity={1} />
        <Cajas items={suelos} color={C.piso} />
        <group visible={capas.estructura}>
          {/* Sealed approximate shell; independent of outer cutaway and Techo. */}
          <Cajas items={murosReservados} color={C.muro} />
          <Box {...reservado.base} color={C.piso} />
          <Puerta puerta={puertaReservada} />
          <Corte eje="x" limite={0} positivo>
            <Box
              p={[-0.1, M.H / 2, M.W / 2]}
              s={[0.2, M.H, M.W + 0.2]}
              color={C.muro}
            />
          </Corte>
          <Corte eje="x" limite={M.L} positivo={false}>
            <Box
              p={[M.L + 0.1, M.H / 2, M.W / 2]}
              s={[0.2, M.H, M.W + 0.2]}
              color={C.muro}
            />
          </Corte>
          {M.columnas.map((p, i) => (
            <Box
              key={i}
              p={[p.x, M.H / 2, p.z]}
              s={[p.largo, M.H, p.fondo]}
              color={C.concreto}
            />
          ))}
        </group>
        <Lateral indice={0} capas={capas} />
        <Lateral indice={1} capas={capas} />
        <Servicios capas={capas} />
        <group visible={capas.mobiliario}>
          <Tableros />
          <Cajas items={patas} color={C.negro} />
          {M.pizarras.map((z) => (
            <Pizarra key={z} z={z} />
          ))}
          <Box
            p={[0.16, 1.7, M.proyeccionZ]}
            s={[0.05, 1.75, 2.8]}
            color="#25282a"
          />
          <Box
            p={[0.194, 1.72, M.proyeccionZ]}
            s={[0.015, 1.65, 2.69]}
            color="#f6f5ee"
          />
          <Box
            p={[0.18, 2.65, M.proyeccionZ]}
            s={[0.13, 0.1, 2.95]}
            color="#d1d3cf"
          />
          <Tubo
            p={[0.21, 0.64, M.proyeccionZ]}
            h={0.38}
            r={0.008}
            color={C.negro}
          />
          <group position={[M.escritorio.x, 0, M.escritorio.z]}>
            {[-0.5, 0.5].map((z) => (
              <Box
                key={z}
                p={[0, 0.39, z]}
                s={[0.62, 0.75, 0.08]}
                color="#dedfd9"
              />
            ))}
            <Box p={[0.27, 0.4, 0]} s={[0.1, 0.65, 0.92]} color="#dedfd9" />
            <Box p={[0, 0.785, 0]} s={[0.74, 0.04, 1.22]} color={C.tablero} />
            {[0.23, 0.48].map((y) => (
              <Box
                key={y}
                p={[0.32, y, 0]}
                s={[0.012, 0.012, 0.92]}
                color="#a2a7a5"
              />
            ))}
          </group>
          {M.armarios.map((a) => (
            <Armario key={a.z} x={a.x} z={a.z} />
          ))}
          <Tubo
            p={[M.tacho.x, 0.3, M.tacho.z]}
            h={0.58}
            r={0.17}
            color={C.metal}
          />
          <Tubo
            p={[M.tacho.x, 0.61, M.tacho.z]}
            h={0.12}
            r={0.17}
            color={C.negro}
          />
        </group>
        <group visible={capas.sillas}>
          <Cajas items={sillas} color={C.negro} />
          <group position={[M.sillaDocente.x, 0, M.sillaDocente.z]}>
            <Box p={[0, 0.48, 0]} s={[0.48, 0.08, 0.46]} color={C.negro} />
            <Box p={[-0.2, 0.85, 0]} s={[0.08, 0.65, 0.46]} color={C.negro} />
            <Tubo p={[0, 0.26, 0]} h={0.42} r={0.04} color={C.negro} />
            <Box p={[0, 0.07, 0]} s={[0.6, 0.04, 0.05]} color={C.negro} />
            <Box p={[0, 0.07, 0]} s={[0.05, 0.04, 0.6]} color={C.negro} />
          </group>
        </group>
        <group visible={capas.equipos}>
          <Cajas items={laptops} color="#2b2e31" />
          <Cajas items={tapasLaptop} color="#44494c" />
          <Box
            p={[2.5, M.H - 0.6, M.proyeccionZ]}
            s={[0.36, 0.14, 0.28]}
            color="#f0f0e9"
          />
          <Tubo
            p={[2.5, M.H - 0.25, M.proyeccionZ]}
            h={0.5}
            r={0.02}
            color={C.metal}
          />
          <Tubo
            p={[2.31, M.H - 0.6, M.proyeccionZ + 0.06]}
            h={0.025}
            r={0.04}
            color="#272b2e"
            eje="x"
          />
          <Box
            p={[M.escritorio.x, 0.83, M.escritorio.z]}
            s={[0.31, 0.025, 0.24]}
            color="#303538"
          />
          <Box
            p={[M.equipoMural.x, M.equipoMural.y, M.equipoMural.z]}
            s={[0.13, 0.85, 0.55]}
            color="#cccfc9"
          />
          <Box
            p={[M.equipoMural.x + 0.07, M.equipoMural.y, M.equipoMural.z]}
            s={[0.015, 0.22, 0.16]}
            color="#d9bc3e"
          />
        </group>
        {capas.sensores && (
          <group>
            {aula.nodos.map((id) => (
              <Nodo
                key={id}
                id={id}
                position={M.sensores[id]}
                selected={selected === id}
                onSelect={onSelect}
              />
            ))}
          </group>
        )}
        <Controles resetKey={resetKey} />
      </Canvas>
    </div>
  );
}
