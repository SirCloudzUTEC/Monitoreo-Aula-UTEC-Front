import { describe, expect, it } from "vitest";
import {
  CATALOGO_INCIDENTES,
  CATEGORIAS_ORDENADAS,
  destinatariosDe,
  validarBorrador,
} from "@/lib/incidents/catalog";

describe("incident catalog", () => {
  it("covers every ordered category exactly once", () => {
    expect([...CATEGORIAS_ORDENADAS].sort()).toEqual(
      Object.keys(CATALOGO_INCIDENTES).sort(),
    );
    expect(new Set(CATEGORIAS_ORDENADAS).size).toBe(
      CATEGORIAS_ORDENADAS.length,
    );
  });

  it("routes every category to at least one operational scope", () => {
    for (const item of Object.values(CATALOGO_INCIDENTES)) {
      expect(item.destinatarios.length).toBeGreaterThan(0);
    }
  });

  it("routes theft to security and medical emergencies to wellbeing first", () => {
    expect(CATALOGO_INCIDENTES.robo.destinatarios).toEqual(["seguridad"]);
    expect(CATALOGO_INCIDENTES.emergencia_medica.destinatarios[0]).toBe(
      "bienestar",
    );
    expect(destinatariosDe("emergencia_medica")).toBe(
      "Bienestar y Salud y Seguridad",
    );
  });

  it("flags critical categories with the emergency reminder", () => {
    for (const categoria of ["robo", "conducta_peligrosa", "emergencia_medica"] as const) {
      expect(CATALOGO_INCIDENTES[categoria].prioridad).toBe("critica");
      expect(CATALOGO_INCIDENTES[categoria].recordarEmergencias).toBe(true);
    }
  });
});

describe("validarBorrador", () => {
  const valido = {
    categoria: "robo",
    ubicacion: "Aula L-419",
    descripcion: "Sustrajeron una laptop del segundo pupitre.",
  };

  it("accepts a well-formed report and trims fields", () => {
    const r = validarBorrador({
      ...valido,
      ubicacion: "  Aula L-419  ",
    });
    expect(r).toEqual({
      ok: true,
      borrador: { ...valido, ubicacion: "Aula L-419" },
    });
  });

  it("rejects unknown categories and prototype-pollution keys", () => {
    expect(validarBorrador({ ...valido, categoria: "inexistente" }).ok).toBe(false);
    expect(validarBorrador({ ...valido, categoria: 7 }).ok).toBe(false);
    // "toString" exists on Object.prototype but is not a real category:
    // the `in` check must not be fooled by inherited keys.
    expect(validarBorrador({ ...valido, categoria: "toString" }).ok).toBe(false);
  });

  it("requires a bounded location", () => {
    expect(validarBorrador({ ...valido, ubicacion: "" }).ok).toBe(false);
    expect(validarBorrador({ ...valido, ubicacion: "x".repeat(121) }).ok).toBe(false);
  });

  it("requires a meaningful, bounded description", () => {
    expect(validarBorrador({ ...valido, descripcion: "corto" }).ok).toBe(false);
    expect(
      validarBorrador({ ...valido, descripcion: "y".repeat(2001) }).ok,
    ).toBe(false);
  });
});
