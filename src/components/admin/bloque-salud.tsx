"use client";

// Dashboard block 2 (admins): operational health at a glance. Each indicator links to the page
// where it is handled and is hidden when the account lacks that page's permission.

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AVISO_LATIDO_MS } from "@/app/dispositivos/nodos";
import {
  LECTURA_OBSOLETA_MS,
  useDispositivos,
  useEstados,
  useIncidentesSinAtender,
} from "@/lib/api/hooks";
import { CODIGOS_AULA } from "@/lib/aulas";
import { puede } from "@/lib/auth/identity";
import { useApp } from "@/lib/store";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";

type Tono = "ok" | "aviso" | "critico";

const CLASE_TONO: Record<Tono, string> = {
  ok: "text-emerald-700 dark:text-emerald-400",
  aviso: "text-amber-700 dark:text-amber-400",
  critico: "text-red-600",
};

interface Indicador {
  clave: string;
  etiqueta: string;
  /** null = still loading */
  valor: number | string | null;
  tono: Tono;
  href?: string;
  detalle?: string;
}

function Chip({ i }: { i: Indicador }) {
  const contenido = (
    <>
      <div className="text-xs text-muted-foreground">{i.etiqueta}</div>
      {i.valor === null ? (
        <Skeleton className="mt-1 h-6 w-12" />
      ) : (
        <div className={cn("text-xl font-semibold tabular-nums", CLASE_TONO[i.tono])}>{i.valor}</div>
      )}
      {i.detalle && i.valor !== null && <div className="text-xs text-muted-foreground">{i.detalle}</div>}
    </>
  );
  const clase = cn(
    "rounded-lg border p-3",
    // a healthy indicator stays visible (so it is clear it was checked) but recedes
    i.valor !== null && i.tono === "ok" && "opacity-80",
    i.href && "transition-colors hover:bg-muted",
  );
  return i.href ? (
    <Link href={i.href} className={clase}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

export function BloqueSalud() {
  const cuenta = useApp((s) => s.cuenta);
  const online = useOnline();
  const { antiguedadMs, nowMs } = useEstados();
  const incidentes = useIncidentesSinAtender();
  const dispositivos = useDispositivos();

  const indicadores: Indicador[] = [];

  if (cuenta && puede(cuenta, "atender_incidentes")) {
    const n = incidentes.data ?? null;
    indicadores.push({
      clave: "incidentes",
      etiqueta: "Incidentes sin atender",
      valor: n,
      tono: n ? "aviso" : "ok",
      href: "/reportes",
    });
  }

  if (cuenta && puede(cuenta, "gestionar_dispositivos")) {
    // needs the backend clock to judge a heartbeat's age
    const lista = dispositivos.data;
    const n =
      lista && nowMs > 0
        ? lista.filter(
            (d) =>
              !d.activo ||
              !d.ultimoLatidoEn ||
              nowMs - new Date(d.ultimoLatidoEn).getTime() > AVISO_LATIDO_MS,
          ).length
        : null;
    indicadores.push({
      clave: "nodos",
      etiqueta: "Nodos sin latido o bloqueados",
      valor: n,
      tono: n ? "aviso" : "ok",
      href: "/dispositivos",
    });
  }

  const cargadas = CODIGOS_AULA.every((a) => antiguedadMs[a] !== null);
  const obsoletas = CODIGOS_AULA.filter((a) => {
    const t = antiguedadMs[a];
    return t !== null && t > LECTURA_OBSOLETA_MS;
  }).length;
  indicadores.push({
    clave: "obsoletas",
    etiqueta: "Aulas con datos obsoletos",
    valor: cargadas ? obsoletas : null,
    tono: obsoletas > 0 ? "aviso" : "ok",
    href: "/aulas",
    detalle: `sin lectura en más de ${Math.round(LECTURA_OBSOLETA_MS / 60_000)} min`,
  });

  indicadores.push({
    clave: "conexion",
    etiqueta: "Conexión con el servidor",
    valor: online ? "En vivo" : "Sin conexión",
    tono: online ? "ok" : "critico",
  });

  return (
    <Card aria-label="Salud operativa">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Salud operativa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {indicadores.map((i) => (
            <Chip key={i.clave} i={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
