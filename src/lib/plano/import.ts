// F5 — floor-plan import: CSV points, DXF (LINE / LWPOLYLINE only) and a JSON
// polygon fallback. Coordinates are meters; mm/cm drawings are auto-scaled.

import DxfParser from "dxf-parser";
import type { PosicionPlano } from "@/lib/types";

export interface ResultadoImport {
  puntos: PosicionPlano[];
  origen: "csv" | "dxf" | "json";
  aviso?: string;
}

function normalizar(puntos: PosicionPlano[], origen: ResultadoImport["origen"]): ResultadoImport {
  if (puntos.length < 3) {
    throw new Error("El contorno necesita al menos 3 puntos.");
  }
  // translate to origin
  const minX = Math.min(...puntos.map((p) => p.x));
  const minY = Math.min(...puntos.map((p) => p.y));
  let pts = puntos.map((p) => ({ x: p.x - minX, y: p.y - minY }));
  // unit heuristic: classroom-sized outlines are < 50 m
  const maxDim = Math.max(...pts.map((p) => Math.max(p.x, p.y)));
  let aviso: string | undefined;
  if (maxDim > 1000) {
    pts = pts.map((p) => ({ x: p.x / 1000, y: p.y / 1000 }));
    aviso = "Coordenadas grandes: se asumieron milímetros y se convirtieron a metros.";
  } else if (maxDim > 50) {
    pts = pts.map((p) => ({ x: p.x / 100, y: p.y / 100 }));
    aviso = "Coordenadas grandes: se asumieron centímetros y se convirtieron a metros.";
  }
  return { puntos: pts, origen, aviso };
}

/** CSV: one "x,y" pair per line; an optional "x,y" header is skipped. */
export function parseCsvPlano(texto: string): ResultadoImport {
  const puntos: PosicionPlano[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const t = linea.trim();
    if (!t) continue;
    const [xs, ys] = t.split(/[,;]\s*/);
    const x = Number(xs);
    const y = Number(ys);
    if (Number.isFinite(x) && Number.isFinite(y)) puntos.push({ x, y });
  }
  return normalizar(puntos, "csv");
}

/** JSON: { "puntos": [{"x":0,"y":0}, ...] } or [[x,y], ...]. */
export function parseJsonPlano(texto: string): ResultadoImport {
  const data: unknown = JSON.parse(texto);
  let puntos: PosicionPlano[] = [];
  if (Array.isArray(data)) {
    puntos = data
      .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2)
      .map(([x, y]) => ({ x: Number(x), y: Number(y) }));
  } else if (data && typeof data === "object" && Array.isArray((data as { puntos?: unknown }).puntos)) {
    puntos = ((data as { puntos: unknown[] }).puntos as { x: number; y: number }[])
      .filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))
      .map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  }
  return normalizar(puntos, "json");
}

interface EntidadDxf {
  type: string;
  vertices?: { x: number; y: number }[];
}

/** DXF: takes the longest LWPOLYLINE, or chains LINE segments if none. */
export function parseDxfPlano(texto: string): ResultadoImport {
  const parser = new DxfParser();
  const dxf = parser.parseSync(texto);
  const entidades = (dxf?.entities ?? []) as EntidadDxf[];

  const polilineas = entidades.filter(
    (e) => (e.type === "LWPOLYLINE" || e.type === "POLYLINE") && (e.vertices?.length ?? 0) >= 3,
  );
  if (polilineas.length > 0) {
    const mejor = polilineas.reduce((a, b) =>
      (b.vertices?.length ?? 0) > (a.vertices?.length ?? 0) ? b : a,
    );
    return normalizar(
      mejor.vertices!.map((v) => ({ x: v.x, y: v.y })),
      "dxf",
    );
  }

  const lineas = entidades.filter((e) => e.type === "LINE" && (e.vertices?.length ?? 0) >= 2);
  if (lineas.length >= 3) {
    // chain segments end-to-start (greedy nearest endpoint)
    const segs = lineas.map((l) => [l.vertices![0], l.vertices![1]] as const);
    const puntos: PosicionPlano[] = [{ ...segs[0][0] }, { ...segs[0][1] }];
    const usados = new Set([0]);
    while (usados.size < segs.length) {
      const fin = puntos[puntos.length - 1];
      let mejorI = -1;
      let mejorP: PosicionPlano | null = null;
      let mejorD = Infinity;
      segs.forEach(([a, b], i) => {
        if (usados.has(i)) return;
        const da = (a.x - fin.x) ** 2 + (a.y - fin.y) ** 2;
        const db = (b.x - fin.x) ** 2 + (b.y - fin.y) ** 2;
        if (da < mejorD) [mejorD, mejorI, mejorP] = [da, i, { x: b.x, y: b.y }];
        if (db < mejorD) [mejorD, mejorI, mejorP] = [db, i, { x: a.x, y: a.y }];
      });
      if (mejorI < 0 || !mejorP) break;
      usados.add(mejorI);
      puntos.push(mejorP);
    }
    return normalizar(puntos, "dxf");
  }

  throw new Error(
    "El DXF no contiene LWPOLYLINE ni suficientes LINE. Exporta el contorno como polilínea o usa la plantilla CSV/JSON.",
  );
}

export function parsePlano(nombre: string, texto: string): ResultadoImport {
  const ext = nombre.toLowerCase().split(".").pop();
  if (ext === "csv" || ext === "txt") return parseCsvPlano(texto);
  if (ext === "json") return parseJsonPlano(texto);
  if (ext === "dxf") return parseDxfPlano(texto);
  throw new Error(`Formato no soportado: .${ext}. Usa CSV, DXF o JSON.`);
}

export const PLANTILLA_CSV = `x,y
0,0
10,0
10,6
0,6
`;

export const PLANTILLA_JSON = `{
  "puntos": [
    { "x": 0, "y": 0 },
    { "x": 10, "y": 0 },
    { "x": 10, "y": 6 },
    { "x": 0, "y": 6 }
  ]
}
`;
