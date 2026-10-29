"use client";

// Config-driven table: the header row and every body row come from one
// `columnas` array, so a column is declared once instead of twice.

import { Button } from "@/components/ui/button";
import { FilasSkeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Vacio } from "@/components/common/layout";

export interface Columna<T> {
  titulo: string;
  celda: (fila: T) => React.ReactNode;
  className?: string;
  /** header cell classes (e.g. alignment) */
  claseTitulo?: string;
  /** false hides the column (e.g. admin-only columns) */
  visible?: boolean;
}

export function DataTable<T>({
  columnas,
  filas,
  clave,
}: {
  columnas: Columna<T>[];
  filas: T[];
  clave: (fila: T) => React.Key;
}) {
  const cols = columnas.filter((c) => c.visible !== false);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {cols.map((c) => (
            <TableHead key={c.titulo} className={c.claseTitulo}>
              {c.titulo}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => (
          <TableRow key={clave(f)}>
            {cols.map((c) => (
              <TableCell key={c.titulo} className={c.className}>
                {c.celda(f)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Loading skeleton → empty message → content, the three states of every admin list. */
export function EstadoLista({
  cargando,
  vacio,
  mensajeVacio,
  skeleton = { filas: 5, columnas: 4 },
  children,
}: {
  cargando: boolean;
  vacio: boolean;
  mensajeVacio: React.ReactNode;
  skeleton?: { filas: number; columnas: number };
  children: React.ReactNode;
}) {
  if (cargando) return <FilasSkeleton {...skeleton} />;
  if (vacio) return <Vacio className="py-0 text-left">{mensajeVacio}</Vacio>;
  return children;
}

/** "← Anterior · Página X de Y · Siguiente →" (pages are 0-based). */
export function Paginador({
  pagina,
  total,
  onChange,
  bloquearSiguiente = false,
}: {
  pagina: number;
  total: number;
  onChange: (p: number) => void;
  /** e.g. while the next page is still a placeholder */
  bloquearSiguiente?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => onChange(pagina - 1)}>
        ← Anterior
      </Button>
      <span className="text-muted-foreground">
        Página {pagina + 1} de {total}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={pagina >= total - 1 || bloquearSiguiente}
        onClick={() => onChange(pagina + 1)}
      >
        Siguiente →
      </Button>
    </div>
  );
}

export const totalPaginas = (elementos: number, porPagina: number) => Math.max(1, Math.ceil(elementos / porPagina));
