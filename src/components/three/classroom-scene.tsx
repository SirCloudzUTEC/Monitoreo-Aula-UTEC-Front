"use client";

// LOD 1 classroom shell, generated from real aula data (no hand-modeled
// assets): floor, walls, corridor glass, door, windows, and clickable
// sensor nodes. Furniture, ceiling detail, live danger zones, and the
// first-person walk mode arrive in later LODs.

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { Aula, NodoId } from "@/lib/types";

export interface NodoMeta {
  etiqueta: string;
  altura: number; // meters above floor
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

const COLOR = {
  floor: "#b9bcbe",
  wall: "#e8e6e2",
  concrete: "#a6a4a0",
  glass: "#9fc9dd",
  door: "#5d4a3a",
  sensor: "#37bbec",
  sensorSelected: "#f2b705",
};

function Wall({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={COLOR.wall} roughness={0.9} />
    </mesh>
  );
}

function Glass({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={COLOR.glass}
        transparent
        opacity={0.28}
        roughness={0.1}
        metalness={0.1}
      />
    </mesh>
  );
}

function SensorMarker({
  nodo,
  position,
  selected,
  onSelect,
}: {
  nodo: NodoId;
  position: [number, number, number];
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
        castShadow
      >
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial
          color={selected ? COLOR.sensorSelected : COLOR.sensor}
          emissive={selected ? COLOR.sensorSelected : COLOR.sensor}
          emissiveIntensity={selected ? 0.7 : 0.35}
        />
      </mesh>
      <Html
        center
        distanceFactor={9}
        position={[0, 0.28, 0]}
        style={{ pointerEvents: "none" }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            fontSize: "11px",
            padding: "2px 6px",
            borderRadius: "9999px",
            background: selected ? "rgba(242,183,5,0.92)" : "rgba(9,20,28,0.75)",
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
  const L = aula.largo; // x axis
  const W = aula.ancho; // z axis (data "y")
  const H = aula.alto;
  const T = 0.12; // wall thickness

  const puerta = aula.posiciones.puerta;
  const doorWidth = 1.05;
  const doorHeight = 2.1;

  // Windows live on the z=0 wall (facade). Pane width per real photos.
  const windowIds = ["ventana1", "ventana2"].filter(
    (v) => aula.posiciones[v] !== undefined,
  );
  const paneW = 1.9;

  return (
    <Canvas
      shadows
      camera={{ position: [L * 1.25, H * 2.6, W * 1.7], fov: 45 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#0d1319"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[L * 0.7, H * 3, W * 1.2]}
        intensity={1.1}
        castShadow
      />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / 2, 0, W / 2]} receiveShadow>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color={COLOR.floor} roughness={0.35} metalness={0.08} />
      </mesh>

      {/* facade wall (z=0): solid strips + glass panes where windows exist */}
      {windowIds.length > 0 ? (
        <>
          <Wall position={[L / 2, H - 0.3, 0]} size={[L, 0.6, T]} />
          <Wall position={[L / 2, 0.45, 0]} size={[L, 0.9, T]} />
          {windowIds.map((v) => {
            const wx = aula.posiciones[v].x + paneW / 2;
            return (
              <Glass key={v} position={[wx, 1.65, 0]} size={[paneW, 1.5, 0.04]} />
            );
          })}
          {/* solid segments between/around panes */}
          {(() => {
            const segs: { x0: number; x1: number }[] = [];
            let cursor = 0;
            for (const v of windowIds) {
              const start = aula.posiciones[v].x;
              if (start > cursor) segs.push({ x0: cursor, x1: start });
              cursor = start + paneW;
            }
            if (cursor < L) segs.push({ x0: cursor, x1: L });
            return segs.map((s, i) => (
              <Wall
                key={i}
                position={[(s.x0 + s.x1) / 2, 1.65, 0]}
                size={[s.x1 - s.x0, 1.5, T]}
              />
            ));
          })()}
        </>
      ) : (
        <Wall position={[L / 2, H / 2, 0]} size={[L, H, T]} />
      )}

      {/* back wall (z=W) */}
      <Wall position={[L / 2, H / 2, W]} size={[L, H, T]} />
      {/* east wall (x=L) */}
      <Wall position={[L, H / 2, W / 2]} size={[T, H, W]} />

      {/* corridor wall (x=0): glass partition with the real door opening */}
      {puerta ? (
        <>
          {/* segments beside the door (door spans z = puerta.y .. puerta.y+doorWidth) */}
          <Glass position={[0, H / 2, puerta.y / 2]} size={[T, H, puerta.y]} />
          <Glass
            position={[0, H / 2, (puerta.y + doorWidth + W) / 2]}
            size={[T, H, W - puerta.y - doorWidth]}
          />
          {/* lintel above the door */}
          <Wall
            position={[0, (doorHeight + H) / 2, puerta.y + doorWidth / 2]}
            size={[T, H - doorHeight, doorWidth]}
          />
          {/* the door itself */}
          <mesh position={[0, doorHeight / 2, puerta.y + doorWidth / 2]} castShadow>
            <boxGeometry args={[T + 0.02, doorHeight, doorWidth]} />
            <meshStandardMaterial color={COLOR.door} roughness={0.6} />
          </mesh>
        </>
      ) : (
        <Wall position={[0, H / 2, W / 2]} size={[T, H, W]} />
      )}

      {/* sensor nodes from real positions */}
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
        target={[L / 2, 1.2, W / 2]}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={3}
        maxDistance={35}
      />
    </Canvas>
  );
}
