import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CuentaUsuario } from "@/lib/auth/identity";
import { auth } from "@/auth";
import { db } from "@/lib/data/db";
import { GET, POST } from "@/app/api/usuarios/route";

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

const superadmin: CuentaUsuario = {
  email: "superadmin@utec.edu.pe",
  nombre: "Superadmin",
  rol: "superadmin",
  ambitos: [],
  estado: "aprobada",
};

const validBody = {
  email: "nuevo@utec.edu.pe",
  nombre: "Cuenta Nueva",
  rol: "miembro",
};

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/usuarios", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    body: JSON.stringify(body),
  });

describe("POST /api/usuarios", () => {
  it("rejects without a session", async () => {
    mockAuth.mockResolvedValueOnce(null as never);
    const response = await POST(req(validBody));
    expect(response.status).toBe(403);
  });

  it("rejects an account without gestionar_usuarios", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: miembro } as never);
    const response = await POST(req(validBody));
    expect(response.status).toBe(403);
  });

  it("rejects a cross-site request even from a superadmin session", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    const response = await POST(
      req(validBody, { "sec-fetch-site": "cross-site" }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects a non-institutional email", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    const response = await POST(req({ ...validBody, email: "a@gmail.com" }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing or empty name", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    const response = await POST(req({ ...validBody, nombre: "  " }));
    expect(response.status).toBe(400);
  });

  it("rejects an unknown role", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    const response = await POST(req({ ...validBody, rol: "root" }));
    expect(response.status).toBe(400);
  });

  it("fails closed without a configured database", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    mockDb.mockReturnValueOnce(null);
    const response = await POST(req(validBody));
    expect(response.status).toBe(503);
  });

  it("creates an approved account and returns a one-time generated password", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    const sql = vi.fn(async () => [{ email: validBody.email }]);
    mockDb.mockReturnValueOnce(sql as never);
    const response = await POST(req(validBody));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.email).toBe(validBody.email);
    expect(typeof data.password).toBe("string");
    expect(data.password.length).toBeGreaterThanOrEqual(10);
  });

  it("returns a conflict when the email already exists", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    const sql = vi.fn(async () => []);
    mockDb.mockReturnValueOnce(sql as never);
    const response = await POST(req(validBody));
    expect(response.status).toBe(409);
  });
});

describe("GET /api/usuarios", () => {
  it("rejects without gestionar_usuarios", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: miembro } as never);
    const response = await GET(
      new NextRequest("http://localhost/api/usuarios", {
        headers: { origin: "http://localhost" },
      }),
    );
    expect(response.status).toBe(403);
  });

  it("lists accounts for a superadmin session", async () => {
    mockAuth.mockResolvedValueOnce({ cuenta: superadmin } as never);
    const fila = {
      email: "a@utec.edu.pe",
      nombre: "A",
      rol: "miembro",
      estado: "aprobada",
      creado_en: new Date().toISOString(),
    };
    const sql = vi.fn(async () => [fila]);
    mockDb.mockReturnValueOnce(sql as never);
    const response = await GET(
      new NextRequest("http://localhost/api/usuarios", {
        headers: { origin: "http://localhost" },
      }),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.usuarios).toEqual([fila]);
  });
});
