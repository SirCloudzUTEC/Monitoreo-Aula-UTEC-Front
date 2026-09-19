import { describe, expect, it, vi } from "vitest";
import type { CuentaUsuario } from "@/lib/auth/identity";
import { auth } from "@/auth";
import { db } from "@/lib/data/db";
import { GET } from "@/app/api/reportes/route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/data/db", () => ({ db: vi.fn() }));
const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);

const miembro: CuentaUsuario = {
  email: "miembro@utec.edu.pe",
  nombre: "Miembro",
  rol: "miembro",
  ambitos: [],
  estado: "aprobada",
};

const admin: CuentaUsuario = {
  email: "admin@utec.edu.pe",
  nombre: "Admin",
  rol: "admin_operativo",
  ambitos: [],
  estado: "aprobada",
};

/** Each call to the mocked `sql` tagged template returns the next queued
 * result, matching the order the route issues its queries in. */
function sqlSecuencia(respuestas: unknown[]) {
  let i = 0;
  return vi.fn(async () => respuestas[i++]);
}

describe("GET /api/reportes", () => {
  it("reports database status without a report list when unconfigured", async () => {
    // db() is checked before auth(), so auth() is never even called here.
    mockDb.mockReturnValueOnce(null);
    const response = await GET();
    const data = await response.json();
    expect(data).toEqual({ configurada: false, total: 0, reportes: [] });
  });

  it("returns no report list without a session", async () => {
    mockAuth.mockResolvedValueOnce(null as never);
    mockDb.mockReturnValueOnce(sqlSecuencia([[{ total: 3 }]]) as never);
    const response = await GET();
    const data = await response.json();
    expect(data.total).toBe(3);
    expect(data.reportes).toEqual([]);
  });

  it("scopes to the caller's own reports for a plain member", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: miembro } as never);
    const propios = [
      {
        id: 1,
        categoria: "otro",
        prioridad: "baja",
        ubicacion: "L-419",
        descripcion: "algo",
        estado: "abierto",
        creado_en: new Date().toISOString(),
        reportado_por_email: null,
      },
    ];
    mockDb.mockReturnValueOnce(sqlSecuencia([[{ total: 3 }], propios]) as never);
    const response = await GET();
    const data = await response.json();
    expect(data.reportes).toEqual(propios);
  });

  it("lists every report with the reporter's email for atender_incidentes", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: admin } as never);
    const todos = [
      {
        id: 2,
        categoria: "robo",
        prioridad: "critica",
        ubicacion: "A-1001",
        descripcion: "algo grave",
        estado: "abierto",
        creado_en: new Date().toISOString(),
        reportado_por_email: "otro@utec.edu.pe",
      },
    ];
    mockDb.mockReturnValueOnce(sqlSecuencia([[{ total: 3 }], todos]) as never);
    const response = await GET();
    const data = await response.json();
    expect(data.reportes).toEqual(todos);
  });
});
