// Server-side AI provider registry. API keys live ONLY in env vars on the
// server; the client never sees them. A provider is usable when its key is
// configured — until then the API reports it honestly as pending.

export type ProveedorId = "anthropic" | "openai" | "xai";

export interface ProveedorInfo {
  id: ProveedorId;
  etiqueta: string;
  /** Env var that must be set server-side to enable the provider. */
  envVar: string;
}

export const PROVEEDORES: Record<ProveedorId, ProveedorInfo> = {
  anthropic: {
    id: "anthropic",
    etiqueta: "Anthropic · Claude",
    envVar: "ANTHROPIC_API_KEY",
  },
  openai: {
    id: "openai",
    etiqueta: "OpenAI · GPT",
    envVar: "OPENAI_API_KEY",
  },
  xai: {
    id: "xai",
    etiqueta: "xAI · Grok",
    envVar: "XAI_API_KEY",
  },
};

export function esProveedor(value: unknown): value is ProveedorId {
  return typeof value === "string" && Object.hasOwn(PROVEEDORES, value);
}

/** Availability is a server-side fact derived from configured keys. */
export function proveedorDisponible(id: ProveedorId): boolean {
  const value = process.env[PROVEEDORES[id].envVar];
  return typeof value === "string" && value.trim().length > 0;
}

export interface EstadoProveedor {
  id: ProveedorId;
  etiqueta: string;
  disponible: boolean;
}

/** Safe to send to the client: labels and availability, never keys. */
export function estadoProveedores(): EstadoProveedor[] {
  return Object.values(PROVEEDORES).map((p) => ({
    id: p.id,
    etiqueta: p.etiqueta,
    disponible: proveedorDisponible(p.id),
  }));
}

const LIMITE_MENSAJE = 4000;

export type ValidacionMensaje =
  | { ok: true; mensaje: string; proveedor: ProveedorId }
  | { ok: false; error: string };

export function validarPeticionChat(input: {
  mensaje?: unknown;
  proveedor?: unknown;
}): ValidacionMensaje {
  if (!esProveedor(input.proveedor)) {
    return { ok: false, error: "Elige un proveedor de IA válido." };
  }
  const mensaje =
    typeof input.mensaje === "string" ? input.mensaje.trim() : "";
  if (mensaje.length === 0) {
    return { ok: false, error: "Escribe un mensaje." };
  }
  if (mensaje.length > LIMITE_MENSAJE) {
    return {
      ok: false,
      error: `El mensaje supera el límite de ${LIMITE_MENSAJE} caracteres.`,
    };
  }
  return { ok: true, mensaje, proveedor: input.proveedor };
}
