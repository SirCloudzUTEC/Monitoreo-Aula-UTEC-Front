"use client";

// Community incident reporting backed by /api/reportes (Neon PostgreSQL).
// The page shows exactly which operational team is notified, and reports
// honestly whether the database stored the report.

import { useEffect, useState } from "react";
import { SirenIcon, SendIcon, PhoneCallIcon, DatabaseIcon } from "lucide-react";
import {
  CATALOGO_INCIDENTES,
  CATEGORIAS_ORDENADAS,
  destinatariosDe,
  validarBorrador,
  type CategoriaIncidente,
} from "@/lib/incidents/catalog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReporteGuardado {
  id: number;
  categoria: CategoriaIncidente;
  ubicacion: string;
  descripcion: string;
}

const CLASE_PRIORIDAD: Record<string, string> = {
  critica: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200",
  alta: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200",
  media: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  baja: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};

export default function ReportarPage() {
  const [categoria, setCategoria] = useState<CategoriaIncidente>("emergencia_medica");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [guardados, setGuardados] = useState<ReporteGuardado[]>([]);
  const [bd, setBd] = useState<{ configurada: boolean; total: number } | null>(null);

  const info = CATALOGO_INCIDENTES[categoria];

  useEffect(() => {
    let cancelado = false;
    fetch("/api/reportes")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelado && data) setBd(data);
      })
      .catch(() => {
        // Status stays unknown; submitting still reports the real outcome.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const enviar = async () => {
    const r = validarBorrador({ categoria, ubicacion, descripcion });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r.borrador),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error ?? "No se pudo enviar el reporte. Inténtalo nuevamente.",
        );
        return;
      }
      setGuardados((prev) => [
        { id: data.id, ...r.borrador },
        ...prev,
      ]);
      setBd((prev) =>
        prev ? { ...prev, total: prev.total + 1 } : prev,
      );
      setUbicacion("");
      setDescripcion("");
    } catch {
      setError("Sin conexión con el servidor. El reporte no fue enviado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <SirenIcon className="size-5 text-primary" aria-hidden />
          Reportar un incidente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu reporte llega al personal correspondiente según la categoría.
          En emergencias graves llama primero a Seguridad UTEC o al 105/106.
        </p>
        {bd && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <DatabaseIcon className="size-3.5" aria-hidden />
            {bd.configurada
              ? `Base de datos conectada · ${bd.total} reporte${bd.total === 1 ? "" : "s"} registrado${bd.total === 1 ? "" : "s"}`
              : "Base de datos pendiente de configurar en este entorno"}
          </p>
        )}
      </header>

      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="categoria">
            ¿Qué ocurrió?
          </label>
          <Select
            value={categoria}
            onValueChange={(v) => setCategoria(v as CategoriaIncidente)}
          >
            <SelectTrigger id="categoria" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_ORDENADAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATALOGO_INCIDENTES[c].nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{info.ejemplos}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-0.5 font-medium capitalize ${CLASE_PRIORIDAD[info.prioridad]}`}
          >
            Prioridad {info.prioridad}
          </span>
          <span className="text-muted-foreground">
            Se notificará a: <strong>{destinatariosDe(categoria)}</strong>
          </span>
        </div>

        {info.recordarEmergencias && (
          <p className="flex items-start gap-2 rounded-md border border-red-300/50 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200">
            <PhoneCallIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Si hay riesgo inmediato para personas, contacta primero a Seguridad
            UTEC o a emergencias (105 policía / 106 ambulancia). El reporte no
            reemplaza la llamada.
          </p>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="ubicacion">
            ¿Dónde?
          </label>
          <input
            id="ubicacion"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            maxLength={120}
            placeholder="Aula, piso o zona (ej. L-419, piso 4)"
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="descripcion">
            Describe lo ocurrido
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Qué viste, cuándo y cualquier detalle útil…"
            className="w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          onClick={() => void enviar()}
          disabled={enviando}
          className="w-full gap-2 sm:w-auto"
        >
          <SendIcon className="size-4" aria-hidden />
          {enviando ? "Enviando…" : "Enviar reporte"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Mientras el inicio de sesión institucional está pendiente, los
          reportes se registran como demostración, sin identificar al autor.
        </p>
      </div>

      {guardados.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">
            Reportes guardados en la base de datos
          </h2>
          <ul className="space-y-2">
            {guardados.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <strong>
                    #{r.id} · {CATALOGO_INCIDENTES[r.categoria].nombre}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {r.ubicacion} · notificado a {destinatariosDe(r.categoria)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.descripcion}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
