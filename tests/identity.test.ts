import { describe, expect, it } from "vitest";
import {
  esCorreoInstitucional,
  permisosDe,
  puede,
  type CuentaUsuario,
} from "@/lib/auth/identity";

const cuenta = (extra: Partial<CuentaUsuario>): CuentaUsuario => ({
  email: "persona@utec.edu.pe",
  nombre: "Persona",
  rol: "miembro",
  ambitos: [],
  estado: "aprobada",
  ...extra,
});

describe("esCorreoInstitucional", () => {
  it("accepts standard institutional addresses", () => {
    expect(esCorreoInstitucional("ana.perez@utec.edu.pe")).toBe(true);
    expect(esCorreoInstitucional("a.perez-2@UTEC.EDU.PE")).toBe(true);
  });

  it("rejects personal and lookalike domains", () => {
    expect(esCorreoInstitucional("ana@gmail.com")).toBe(false);
    expect(esCorreoInstitucional("ana@utec.edu.pe.evil.com")).toBe(false);
    expect(esCorreoInstitucional("ana@sub.utec.edu.pe")).toBe(false);
    expect(esCorreoInstitucional("ana@utec.edu")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(esCorreoInstitucional("")).toBe(false);
    expect(esCorreoInstitucional("@utec.edu.pe")).toBe(false);
    expect(esCorreoInstitucional(".ana@utec.edu.pe")).toBe(false);
    expect(esCorreoInstitucional(null)).toBe(false);
    expect(esCorreoInstitucional(`${"a".repeat(255)}@utec.edu.pe`)).toBe(false);
  });
});

describe("permissions", () => {
  it("members can view, report and receive alerts, nothing else", () => {
    const c = cuenta({ rol: "miembro" });
    expect(puede(c, "reportar_incidente")).toBe(true);
    expect(puede(c, "atender_incidentes")).toBe(false);
    expect(puede(c, "gestionar_usuarios")).toBe(false);
  });

  it("operational admins additionally attend incidents and manage classrooms/devices, but not users", () => {
    const c = cuenta({ rol: "admin_operativo", ambitos: ["seguridad"] });
    expect(puede(c, "atender_incidentes")).toBe(true);
    expect(puede(c, "gestionar_dispositivos")).toBe(true);
    expect(puede(c, "gestionar_usuarios")).toBe(false);
  });

  it("superadmin manages users, devices and integrations", () => {
    const c = cuenta({ rol: "superadmin" });
    expect(puede(c, "gestionar_usuarios")).toBe(true);
    expect(puede(c, "gestionar_dispositivos")).toBe(true);
    expect(puede(c, "gestionar_integraciones")).toBe(true);
  });

  it("pending or suspended accounts hold no permissions", () => {
    expect(permisosDe(cuenta({ estado: "pendiente" }))).toEqual([]);
    expect(
      permisosDe(cuenta({ rol: "superadmin", estado: "suspendida" })),
    ).toEqual([]);
  });
});
