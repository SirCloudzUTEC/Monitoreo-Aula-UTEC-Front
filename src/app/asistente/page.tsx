"use client";

// Assistant surface: immersive orb + chat composer backed by /api/asistente.
// Availability comes from the SERVER (which providers have keys configured);
// messages go through the real API and pending providers produce an honest
// 501/503 notice, never a simulated AI reply. Microphone starts OFF.

import { useEffect, useState } from "react";
import { MicOffIcon, SendIcon } from "lucide-react";
import { ParticleOrb, type OrbState } from "@/components/assistant/particle-orb";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProviderOption {
  id: string;
  etiqueta: string;
  disponible: boolean;
}

interface Aviso {
  id: number;
  texto: string;
}

export default function AsistentePage() {
  const [proveedores, setProveedores] = useState<ProviderOption[]>([]);
  const [proveedor, setProveedor] = useState<string>("anthropic");
  const [mensaje, setMensaje] = useState("");
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [estado, setEstado] = useState<OrbState>("listo");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/asistente")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelado && data?.proveedores) setProveedores(data.proveedores);
      })
      .catch(() => {
        // Availability stays unknown; the composer still explains pending state on send.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const avisar = (texto: string) =>
    setAvisos((prev) => [...prev.slice(-3), { id: Date.now(), texto }]);

  const enviar = async () => {
    const texto = mensaje.trim();
    if (!texto || estado === "procesando") return;
    setEstado("procesando");
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: texto, proveedor }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        avisar(
          data?.error ??
            "No se pudo contactar al asistente. Inténtalo nuevamente.",
        );
        setEstado(data?.pendiente ? "listo" : "error");
        if (!data?.pendiente) return;
      }
      setMensaje("");
      setEstado("listo");
    } catch {
      avisar("Sin conexión con el servidor. El mensaje no fue enviado.");
      setEstado("error");
    }
  };

  const etiquetaProveedor = (p: ProviderOption) =>
    `${p.etiqueta}${p.disponible ? "" : " · pendiente"}`;

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-between gap-6 py-4">
      <header className="w-full max-w-2xl text-center">
        <h1 className="text-xl font-semibold">Asistente del campus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversa sobre las aulas, alertas y reportes autorizados para tu rol.
        </p>
      </header>

      <div className="flex flex-col items-center gap-4">
        <ParticleOrb state={estado} size={300} />
        <p
          className="text-sm capitalize text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Estado: {estado}
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-3">
        {avisos.length > 0 && (
          <ul className="space-y-1" aria-live="polite">
            {avisos.map((aviso) => (
              <li
                key={aviso.id}
                className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {aviso.texto}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2 rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-2">
            <Select value={proveedor} onValueChange={setProveedor}>
              <SelectTrigger
                className="h-8 w-48 text-xs"
                aria-label="Proveedor y modelo de IA"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(proveedores.length > 0
                  ? proveedores
                  : [
                      {
                        id: "anthropic",
                        etiqueta: "Anthropic · Claude",
                        disponible: false,
                      },
                    ]
                ).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {etiquetaProveedor(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-48 justify-start gap-2 text-xs text-muted-foreground"
              disabled
              title="La conversación por voz se habilitará cuando exista captura de audio real y consentida"
            >
              <MicOffIcon className="size-3.5" aria-hidden />
              Micrófono desactivado
            </Button>
          </div>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar();
              }
            }}
            rows={2}
            placeholder="Escribe tu mensaje…"
            aria-label="Mensaje para el asistente"
            className="min-h-16 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            onClick={() => void enviar()}
            size="icon"
            aria-label="Enviar mensaje"
            disabled={mensaje.trim().length === 0 || estado === "procesando"}
          >
            <SendIcon className="size-4" aria-hidden />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Los proveedores de IA se conectan con claves del servidor; ninguna
          clave se expone en el navegador.
        </p>
      </div>
    </div>
  );
}
