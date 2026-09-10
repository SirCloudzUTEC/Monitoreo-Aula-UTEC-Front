"use client";

// F4 — classroom digital twin: 2D SVG floor plan (spec positions or the
// outline imported in F5) plus component, node and sensor tables (blocks.json).

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanoSvg, type PlanoImportado } from "@/components/plano/plano-svg";
import { useApp, CODIGOS_AULA } from "@/lib/store";
import { loadLocal } from "@/lib/data/storage";
import { getAula } from "@/lib/simulator/profiles";
import { CLASE_ESTADO, ETIQUETA_ESTADO, formatearValor } from "@/lib/format";
import blocks from "@/data/blocks.json";
import type { AulaCodigo, NodoSpec, SensorSpec } from "@/lib/types";
import { cn } from "@/lib/utils";

const SENSORES = blocks.sensores as SensorSpec[];
const NODOS = blocks.nodos as NodoSpec[];

export default function AulaPage() {
  const params = useParams<{ codigo: string }>();
  const codigo = decodeURIComponent(params.codigo) as AulaCodigo;
  const valido = CODIGOS_AULA.includes(codigo);
  const estado = useApp((s) => (valido ? s.estados[codigo] : "Cerrada"));
  const valores = useApp((s) => (valido ? s.valores[codigo] : undefined));
  const [plano, setPlano] = useState<PlanoImportado | null>(null);

  useEffect(() => {
    // localStorage is client-only: it must be read after mount (SSR renders null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (valido) setPlano(loadLocal<PlanoImportado | null>(`plano:${codigo}`, null));
  }, [valido, codigo]);

  if (!valido) notFound();
  const aula = getAula(codigo);
  const nodos = NODOS.filter((n) => aula.nodos.includes(n.id));
  const sensorIds = new Set(nodos.flatMap((n) => n.sensores));
  const sensores = SENSORES.filter((s) => sensorIds.has(s.id));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{aula.nombre}</h1>
          <span className={cn("rounded-full px-3 py-0.5 text-sm font-medium", CLASE_ESTADO[estado])}>
            {ETIQUETA_ESTADO[estado]}
          </span>
          <a
            href={`/pantalla/${codigo}`}
            target="_blank"
            rel="noopener"
            className="ml-auto text-sm text-muted-foreground underline hover:text-foreground"
          >
            Ver pantalla TV ↗
          </a>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-4">
          <Badge variant="secondary" className="justify-center py-1.5 text-sm">
            {aula.largo} × {aula.ancho} × {aula.alto} m
          </Badge>
          <Badge variant="secondary" className="justify-center py-1.5 text-sm">
            Aforo: {aula.aforo} personas
          </Badge>
          <Badge variant="secondary" className="justify-center py-1.5 text-sm">
            {aula.ventanas} ventana{aula.ventanas === 1 ? "" : "s"} · {aula.puertas} puerta
          </Badge>
          <Badge variant="secondary" className="justify-center py-1.5 text-sm">
            {aula.aireAcondicionado ? "Con aire acondicionado" : "Sin aire acondicionado"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Plano 2D</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanoSvg aula={aula} plano={plano} className="w-full" />
          <p className="mt-3 text-sm text-muted-foreground">
            {plano
              ? `Contorno importado (${plano.origen ?? "archivo"}${plano.nombre ? `: ${plano.nombre}` : ""}). `
              : "Contorno según especificación. "}
            Puedes importar un plano CSV/DXF en{" "}
            <Link href="/importar" className="underline">
              Importar plano
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Lecturas actuales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["temperatura", "humedad", "co2", "pm25", "lux", "ruido", "ocupacion", "puerta"] as const).map(
            (m) => (
              <div key={m} className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-xs text-muted-foreground">
                  {m === "pm25" ? "PM2.5" : m === "co2" ? "CO₂" : m.charAt(0).toUpperCase() + m.slice(1)}
                </div>
                <div className="font-mono text-base font-semibold tabular-nums">
                  {formatearValor(m, valores?.[m])}
                </div>
              </div>
            ),
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">
            Nodos del aula <span className="font-normal text-muted-foreground">({nodos.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nodo</TableHead>
                <TableHead>MCU</TableHead>
                <TableHead>Conectividad</TableHead>
                <TableHead>Alimentación</TableHead>
                <TableHead>Sensores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodos.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.nombre}</TableCell>
                  <TableCell>{n.mcu}</TableCell>
                  <TableCell>{n.conectividad}</TableCell>
                  <TableCell>{n.alimentacion}</TableCell>
                  <TableCell className="text-xs">{n.sensores.join(", ") || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">
            Sensores instalados <span className="font-normal text-muted-foreground">({sensores.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sensor</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Magnitudes</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Exactitud</TableHead>
                <TableHead>Interfaz</TableHead>
                <TableHead className="text-right">Costo (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sensores.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell>{s.modelo}</TableCell>
                  <TableCell className="text-xs">{s.magnitudes.join(", ")}</TableCell>
                  <TableCell className="text-xs">{s.rango}</TableCell>
                  <TableCell className="text-xs">{s.exactitud}</TableCell>
                  <TableCell>{s.interfaz}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.costoAproxUSD}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">
            El lector de credenciales guarda solo un hash: nunca identidades ni imágenes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Componentes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-base sm:grid-cols-2">
            {aula.componentes.map((c) => (
              <li key={c.id} className="text-muted-foreground">
                {c.nombre}: <span className="font-mono text-foreground">{c.cantidad}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
