import { afterEach, describe, expect, it } from "vitest";
import {
  esProveedor,
  estadoProveedores,
  proveedorDisponible,
  validarPeticionChat,
} from "@/lib/assistant/providers";

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
});

describe("provider registry", () => {
  it("recognizes only the declared providers", () => {
    expect(esProveedor("anthropic")).toBe(true);
    expect(esProveedor("openai")).toBe(true);
    expect(esProveedor("xai")).toBe(true);
    expect(esProveedor("gemini")).toBe(false);
    expect(esProveedor("toString")).toBe(false);
    expect(esProveedor(7)).toBe(false);
  });

  it("reports providers unavailable without configured keys", () => {
    expect(proveedorDisponible("anthropic")).toBe(false);
    expect(estadoProveedores().every((p) => !p.disponible)).toBe(true);
  });

  it("reports a provider available once its key exists", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.OPENAI_API_KEY = "   ";
    expect(proveedorDisponible("anthropic")).toBe(true);
    expect(proveedorDisponible("openai")).toBe(false); // blank is not configured
    const estados = Object.fromEntries(
      estadoProveedores().map((p) => [p.id, p.disponible]),
    );
    expect(estados).toEqual({ anthropic: true, openai: false, xai: false });
  });

  it("never exposes env var names or key material to the client shape", () => {
    process.env.ANTHROPIC_API_KEY = "super-secret";
    for (const estado of estadoProveedores()) {
      const claves = Object.keys(estado).sort();
      expect(claves).toEqual(["disponible", "etiqueta", "id"]);
      expect(JSON.stringify(estado)).not.toContain("super-secret");
    }
  });
});

describe("validarPeticionChat", () => {
  it("accepts a valid request and trims the message", () => {
    expect(
      validarPeticionChat({ mensaje: "  hola  ", proveedor: "openai" }),
    ).toEqual({ ok: true, mensaje: "hola", proveedor: "openai" });
  });

  it("rejects unknown providers and empty or oversized messages", () => {
    expect(validarPeticionChat({ mensaje: "hola", proveedor: "otro" }).ok).toBe(false);
    expect(validarPeticionChat({ mensaje: "   ", proveedor: "xai" }).ok).toBe(false);
    expect(
      validarPeticionChat({ mensaje: "a".repeat(4001), proveedor: "xai" }).ok,
    ).toBe(false);
    expect(validarPeticionChat({}).ok).toBe(false);
  });
});
