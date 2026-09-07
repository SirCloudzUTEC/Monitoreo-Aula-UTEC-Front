"use client";

// Assistant surface: immersive orb + chat composer.
// Providers are NOT connected yet — the UI says so honestly and no
// simulated AI responses are produced. Microphone starts OFF and voice
// mode stays disabled until a real audio pipeline exists.

import { useState } from "react";
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

// Real availability is decided server-side once API keys are configured.
const PROVEEDORES: ProviderOption[] = [
  { id: "anthropic", etiqueta: "Anthropic · Claude", disponible: false },
  { id: "openai", etiqueta: "OpenAI · GPT", disponible: false },
  { id: "xai", etiqueta: "xAI · Grok", disponible: false },
];

export default function AsistentePage() {
  const [proveedor, setProveedor] = useState<string>("anthropic");
  const [mensaje, setMensaje] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const estado: OrbState = "listo";

  const enviar = () => {
    const texto = mensaje.trim();
    if (!texto) return;
    // No provider is configured yet: state that clearly instead of faking a reply.
    setAvisos((prev) => [
      ...prev.slice(-4),
      "El asistente aún no tiene un proveedor de IA conectado. Este mensaje no fue enviado.",
    ]);
    setMensaje("");
  };

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
            {avisos.map((aviso, i) => (
              <li
                key={i}
                className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {aviso}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2 rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-2">
            <Select value={proveedor} onValueChange={setProveedor}>
              <SelectTrigger
                className="h-8 w-44 text-xs"
                aria-label="Proveedor y modelo de IA"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVEEDORES.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.etiqueta}
                    {!p.disponible && " · pendiente"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-44 justify-start gap-2 text-xs text-muted-foreground"
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
                enviar();
              }
            }}
            rows={2}
            placeholder="Escribe tu mensaje…"
            aria-label="Mensaje para el asistente"
            className="min-h-16 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            onClick={enviar}
            size="icon"
            aria-label="Enviar mensaje"
            disabled={mensaje.trim().length === 0}
          >
            <SendIcon className="size-4" aria-hidden />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Los proveedores de IA se conectarán con claves del servidor; ninguna
          clave se expone en el navegador.
        </p>
      </div>
    </div>
  );
}
