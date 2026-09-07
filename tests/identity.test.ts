import { afterEach, describe, expect, it } from "vitest";
import {
  correoSuperadmin,
  esCorreoInstitucional,
  estadoInicial,
  permisosDe,
  proveedorIdentidadConfigurado,
  puede,
  rolInicial,
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

afterEach(() => {
  delete process.env.SUPERADMIN_EMAIL;
  delete process.env.GOOGLE_OAUTH_CLIENT_ID;
  delete process.env.MICROSOFT_OAUTH_CLIENT_ID;
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

describe("superadmin bootstrap", () => {
  it("grants superadmin only to the configured email", () => {
    process.env.SUPERADMIN_EMAIL = "Directora@utec.edu.pe";
    expect(rolInicial("directora@utec.edu.pe")).toBe("superadmin");
    expect(rolInicial("otra@utec.edu.pe")).toBe("miembro");
  });

  it("ignores a non-institutional superadmin configuration", () => {
    process.env.SUPERADMIN_EMAIL = "alguien@gmail.com";
    expect(correoSuperadmin()).toBeNull();
    expect(rolInicial("alguien@gmail.com")).toBe("miembro");
  });

  it("auto-approves only the superadmin account", () => {
    expect(estadoInicial("superadmin")).toBe("aprobada");
    expect(estadoInicial("miembro")).toBe("pendiente");
    expect(estadoInicial("admin_operativo")).toBe("pendiente");
  });
});

describe("permissions", () => {
  it("members can view, report and receive alerts, nothing else", () => {
    const c = cuenta({ rol: "miembro" });
    expect(puede(c, "reportar_incidente")).toBe(true);
    expect(puede(c, "atender_incidentes")).toBe(false);
    expect(puede(c, "gestionar_usuarios")).toBe(false);
  });

  it("operational admins additionally attend incidents", () => {
    const c = cuenta({ rol: "admin_operativo", ambitos: ["seguridad"] });
    expect(puede(c, "atender_incidentes")).toBe(true);
    expect(puede(c, "gestionar_dispositivos")).toBe(false);
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

describe("identity provider configuration", () => {
  it("reports unconfigured when no client id exists", () => {
    expect(proveedorIdentidadConfigurado()).toBe(false);
  });

  it("reports configured with a Google or Microsoft client id", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
    expect(proveedorIdentidadConfigurado()).toBe(true);
  });
});
