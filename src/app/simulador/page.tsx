"use client";

// F7 — simulator control (administrator only): scenario per classroom,
// speed 1×/10×/60×, pause/resume and manual event injection.

import Link from "next/link";
import { PauseIcon, PlayIcon, SlidersHorizontalIcon, ZapIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp, CODIGOS_AULA } from "@/lib/store";
import { CATALOGO_EVENTOS, TIPOS_FUERA_NOMINAL } from "@/lib/events/catalog";
import { horaLarga } from "@/lib/format";
import type { AulaCodigo, Escenario, TipoEvento, Velocidad } from "@/lib/types";

const ESCENARIOS: Record<Escenario, string> = {
  clase_normal: "Clase normal",
  aula_libre: "Aula libre",
  aforo_excedido: "Aforo excedido",
  puerta_trabada: "Puerta trabada",
  co2_alto: "CO₂ alto",
  intruso_ventana: "Intruso en ventana",
  nodo_caido: "Nodo caído",
};

export default function SimuladorPage() {
  const rol = useApp((s) => s.rol);
  const escenarios = useApp((s) => s.escenarios);
  const setEscenario = useApp((s) => s.setEscenario);
  const velocidad = useApp((s) => s.velocidad);
  const setVelocidad = useApp((s) => s.setVelocidad);
  const corriendo = useApp((s) => s.corriendo);
  const setCorriendo = useApp((s) => s.setCorriendo);
  const inyectarEvento = useApp((s) => s.inyectarEvento);
  const simNowMs = useApp((s) => s.simNowMs);
  const [aulaIny, setAulaIny] = useState<AulaCodigo>("L-419");
  const [tipoIny, setTipoIny] = useState<TipoEvento>("aforo_excedido");

  if (rol !== "administrador") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <SlidersHorizontalIcon className="mx-auto mb-4 size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">Simulador</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es solo para el rol <strong>administrador</strong>. Cambia de rol con el PIN
          en{" "}
          <Link href="/ajustes" className="underline">
            Ajustes
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SlidersHorizontalIcon className="size-6 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold">Simulador</h1>
        <span className="ml-auto font-mono text-sm tabular-nums text-muted-foreground">
          Hora simulada: {simNowMs ? horaLarga(simNowMs) : "--:--:--"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        La simulación corre sola al abrir la app (modo automático). Aquí puedes cambiar el
        escenario de cada aula, acelerar el tiempo o inyectar un evento puntual.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reloj de simulación</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant={corriendo ? "outline" : "default"} onClick={() => setCorriendo(!corriendo)}>
            {corriendo ? (
              <>
                <PauseIcon className="size-4" aria-hidden /> Pausar
              </>
            ) : (
              <>
                <PlayIcon className="size-4" aria-hidden /> Reanudar
              </>
            )}
          </Button>
          <div className="flex items-center gap-1" role="group" aria-label="Velocidad">
            {([1, 10, 60] as Velocidad[]).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={velocidad === v ? "default" : "outline"}
                onClick={() => setVelocidad(v)}
              >
                ×{v}
              </Button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            A ×60, 1 minuto real = 1 hora simulada (útil para probar persistencias de 10 min).
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Escenario por aula</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {CODIGOS_AULA.map((a) => (
            <div key={a} className="flex items-center gap-3">
              <span className="w-20 font-medium">{a}</span>
              <Select value={escenarios[a]} onValueChange={(v) => setEscenario(a, v as Escenario)}>
                <SelectTrigger className="w-56" aria-label={`Escenario de ${a}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ESCENARIOS) as Escenario[]).map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESCENARIOS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            El escenario cambia las señales simuladas (ocupación, CO₂, puerta, etc.); las alertas
            aparecen cuando la condición persiste el tiempo configurado en los umbrales.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inyectar evento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={aulaIny} onValueChange={(v) => setAulaIny(v as AulaCodigo)}>
            <SelectTrigger className="w-28" aria-label="Aula">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODIGOS_AULA.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoIny} onValueChange={(v) => setTipoIny(v as TipoEvento)}>
            <SelectTrigger className="w-64" aria-label="Tipo de evento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_FUERA_NOMINAL.map((t) => (
                <SelectItem key={t} value={t}>
                  {CATALOGO_EVENTOS[t].nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => inyectarEvento(aulaIny, tipoIny)}>
            <ZapIcon className="size-4" aria-hidden /> Inyectar
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            El evento inyectado se abre de inmediato (fuente: inyección manual) y se cierra al
            acusar recibo en{" "}
            <Link href="/alertas" className="underline">
              Alertas
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
