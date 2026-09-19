"use client";

// Community incident reporting backed by `POST /api/incidentes` (Spring Boot).
// The page shows exactly which operational team is notified; the report is
// always attributed to the signed-in account.

import { useState } from "react";
import Link from "next/link";
import { SirenIcon, SendIcon, PhoneCallIcon } from "lucide-react";
import {
  CATALOGO_INCIDENTES,
  CATEGORIAS_ORDENADAS,
  CLASE_PRIORIDAD,
  destinatariosDe,
  validarBorrador,
  type CategoriaIncidente,
} from "@/lib/incidents/catalog";
import { Button } from "@/components/ui/button";
import { crearIncidente } from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
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

export default function ReportarPage() {
  const [categoria, setCategoria] = useState<CategoriaIncidente>("emergencia_medica");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [guardados, setGuardados] = useState<ReporteGuardado[]>([]);

  const info = CATALOGO_INCIDENTES[categoria];

  const enviar = async () => {
    const r = validarBorrador({ categoria, ubicacion, descripcion });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const creado = await crearIncidente(r.borrador);
      setGuardados((prev) => [{ id: creado.id, ...r.borrador }, ...prev]);
      setUbicacion("");
      setDescripcion("");
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo enviar el reporte. Inténtalo nuevamente."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight md:text-4xl">
          <SirenIcon className="size-8 text-primary" aria-hidden />
          Reportar un incidente
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Tu reporte llega al personal correspondiente según la categoría.
          En emergencias graves llama primero a Seguridad UTEC o al 105/106.
        </p>
      </header>

      <div className="glow-border space-y-4 rounded-xl border bg-card p-4 shadow-sm">
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
          El reporte queda a tu nombre y puedes verlo en{" "}
          <Link href="/reportes" className="underline underline-offset-4">
            Reportes
          </Link>
          .
        </p>
      </div>

      {guardados.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">
            Reportes enviados en esta sesión
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
