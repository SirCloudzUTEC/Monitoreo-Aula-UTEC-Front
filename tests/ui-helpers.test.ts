import { describe, expect, it } from "vitest";
import { validarPasswordNueva } from "@/app/ajustes/cambiar-password";
import { ambitosPara, errorDeRol } from "@/app/usuarios/editar-usuario";
import { nodosAdmitidos } from "@/app/dispositivos/nodos";
import { haceCuanto } from "@/components/modules/aviso-obsoleto";

describe("validarPasswordNueva", () => {
  it("mirrors the backend bounds and rules", () => {
    expect(validarPasswordNueva("vieja-clave-123", "corta", "corta")).toMatch(/al menos 12/);
    expect(validarPasswordNueva("vieja-clave-123", "x".repeat(129), "x".repeat(129))).toMatch(/128/);
    expect(validarPasswordNueva("misma-clave-123", "misma-clave-123", "misma-clave-123")).toMatch(/distinta/);
    expect(validarPasswordNueva("vieja-clave-123", "nueva-clave-456", "otra-clave-789")).toMatch(/no coinciden/);
    expect(validarPasswordNueva("vieja-clave-123", "nueva-clave-456", "nueva-clave-456")).toBeNull();
  });
});

describe("ámbitos de un administrador operativo", () => {
  it("requires at least one scope, and only that role carries any", () => {
    expect(errorDeRol("admin_operativo", [])).toMatch(/al menos un ámbito/);
    expect(errorDeRol("admin_operativo", ["seguridad"])).toBeNull();
    expect(errorDeRol("miembro", [])).toBeNull();
    expect(errorDeRol("superadmin", [])).toBeNull();
    expect(ambitosPara("admin_operativo", ["ti", "seguridad"])).toEqual(["ti", "seguridad"]);
    expect(ambitosPara("miembro", ["ti"])).toEqual([]);
    expect(ambitosPara("superadmin", ["ti"])).toEqual([]);
  });
});

describe("nodosAdmitidos", () => {
  it("only offers the nodes a classroom can physically host", () => {
    const l419 = nodosAdmitidos("L-419"); // has door and windows
    expect(l419).toEqual(expect.arrayContaining(["nodoAmbiental", "procesadorAula", "nodoPuerta", "nodoVentana1"]));
    const a1001 = nodosAdmitidos("A-1001"); // no windows
    expect(a1001).toEqual(expect.arrayContaining(["nodoAmbiental", "procesadorAula", "nodoPuerta"]));
    expect(a1001).not.toContain("nodoVentana1");
    expect(a1001).not.toContain("nodoVentana2");
  });
});

describe("haceCuanto", () => {
  it("words the age of a reading", () => {
    expect(haceCuanto(20_000)).toBe("hace 1 min");
    expect(haceCuanto(7 * 60_000)).toBe("hace 7 min");
    expect(haceCuanto(3 * 3600_000)).toBe("hace 3 h");
    expect(haceCuanto(3 * 24 * 3600_000)).toBe("hace 3 d");
  });
});
