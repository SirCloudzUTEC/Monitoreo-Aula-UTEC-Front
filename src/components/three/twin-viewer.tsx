"use client";

// Shared 3D twin viewer: full-viewport scene with layer toggles (left rail),
// fullscreen with one click, and sensor inspection. Used standalone on
// /aula/[codigo]/3d and embedded as the FIRST view on the aula page.

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeftIcon,
  ArmchairIcon,
  BoxIcon,
  FanIcon,
  FlameIcon,
  LampCeilingIcon,
  LayersIcon,
  MaximizeIcon,
  MinimizeIcon,
  MonitorIcon,
  RadioIcon,
  RotateCcwIcon,
  Rows3Icon,
  SquareStackIcon,
} from "lucide-react";
import type { Aula, NodoId } from "@/lib/types";
import {
  CAPAS_TODAS,
  NODO_META,
  buildLayout,
  type Capas,
} from "@/components/three/classroom-layout";
import { cn } from "@/lib/utils";

const ClassroomScene = dynamic(
  () => import("@/components/three/classroom-scene").then((m) => m.ClassroomScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-white/60">
        Cargando aula 3D…
      </div>
    ),
  },
);

const CAPA_DEFS: { id: keyof Capas; label: string; icon: typeof BoxIcon }[] = [
  { id: "estructura", label: "Concreto y muros", icon: BoxIcon },
  { id: "vidrios", label: "Vidrios", icon: SquareStackIcon },
  { id: "techo", label: "Techo y datos", icon: LayersIcon },
  { id: "luminarias", label: "Luminarias", icon: LampCeilingIcon },
  { id: "ventilacion", label: "Ventilación", icon: FanIcon },
  { id: "contraincendios", label: "Contraincendios", icon: FlameIcon },
  { id: "mobiliario", label: "Mobiliario", icon: Rows3Icon },
  { id: "equipos", label: "Equipos", icon: MonitorIcon },
  { id: "sillas", label: "Sillas", icon: ArmchairIcon },
  { id: "sensores", label: "Sensores", icon: RadioIcon },
];

export function TwinViewer({
  aula,
  embedded = false,
  className,
}: {
  aula: Aula;
  /** true when the viewer lives inside the aula page (hides the back link) */
  embedded?: boolean;
  className?: string;
}) {
  const [selected, setSelected] = useState<NodoId | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
  const [capas, setCapas] = useState<Capas>(CAPAS_TODAS);
  const [isFull, setIsFull] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const toggleFull = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFull(false);
      } else {
        await el.requestFullscreen();
        setIsFull(true);
      }
    } catch {
      setIsFull((f) => !f);
    }
  }, []);

  const meta = selected ? NODO_META[selected] : null;
  const lay = useMemo(() => buildLayout(aula), [aula]);

  return (
    <div
      ref={shellRef}
      className={cn(
        "glow-border relative w-full overflow-hidden rounded-xl border bg-[#0d1319]",
        className,
      )}
    >
      <ClassroomScene
        key={sceneKey}
        aula={aula}
        capas={capas}
        selected={selected}
        onSelect={setSelected}
      />

      {/* top-left: back link (standalone) + badge */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        {!embedded && (
          <Link
            href={`/aula/${aula.codigo}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1.5 text-xs text-white/85 backdrop-blur hover:bg-black/75 hover:text-white"
          >
            <ArrowLeftIcon className="size-3.5" aria-hidden />
            {aula.nombre}
          </Link>
        )}
        <span className="rounded-full bg-[#37bbec]/15 px-2.5 py-1 text-[11px] text-[#7fd4f5] backdrop-blur">
          Gemelo 3D{lay.estimada ? " · proporciones estimadas de fotos" : ""}
        </span>
      </div>

      {/* top-right: reset + fullscreen */}
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSceneKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1.5 text-xs text-white/85 backdrop-blur hover:bg-black/75 hover:text-white"
        >
          <RotateCcwIcon className="size-3.5" aria-hidden />
          Reiniciar vista
        </button>
        <button
          type="button"
          onClick={toggleFull}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#37bbec] px-2.5 py-1.5 text-xs font-medium text-[#04202e] hover:bg-[#5ecbf3]"
        >
          {isFull ? (
            <MinimizeIcon className="size-3.5" aria-hidden />
          ) : (
            <MaximizeIcon className="size-3.5" aria-hidden />
          )}
          {isFull ? "Salir" : "Pantalla completa"}
        </button>
      </div>

      {/* left rail: layer toggles */}
      <aside className="absolute left-3 top-1/2 flex w-40 -translate-y-1/2 flex-col gap-1 rounded-lg bg-black/55 p-2 backdrop-blur">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Capas
        </p>
        {CAPA_DEFS.map(({ id, label, icon: Icon }) => {
          const on = capas[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => setCapas((c) => ({ ...c, [id]: !c[id] }))}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                on
                  ? "bg-[#37bbec]/20 text-[#a7e1f8]"
                  : "text-white/40 hover:bg-white/10 hover:text-white/70",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {label}
              <span
                className={cn(
                  "ml-auto size-1.5 rounded-full",
                  on ? "bg-[#37bbec]" : "bg-white/20",
                )}
                aria-hidden
              />
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCapas(CAPAS_TODAS)}
          className="mt-1 rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          Mostrar todo
        </button>
      </aside>

      {/* sensor inspection panel */}
      {meta && selected && (
        <aside className="absolute right-3 top-14 w-64 rounded-lg border border-white/10 bg-black/70 p-3 text-sm text-white shadow-lg backdrop-blur">
          <h2 className="font-semibold">{meta.etiqueta}</h2>
          <p className="mt-1 text-xs text-white/65">{meta.descripcion}</p>
          <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-white/50">
            Mediciones en vivo y zonas de peligro llegan en el nivel 3.
          </p>
        </aside>
      )}

      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/55 px-2.5 py-1.5 text-[11px] text-white/80 backdrop-blur">
        Arrastra para orbitar · rueda para acercar · clic en un sensor para inspeccionarlo
      </p>
    </div>
  );
}
