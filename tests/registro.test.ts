import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/data/db";
import { POST } from "@/app/api/auth/registro/route";

vi.mock("@/lib/data/db", () => ({ db: vi.fn() }));
const mockDb = vi.mocked(db);

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/auth/registro", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    body: JSON.stringify(body),
  });

const validBody = {
  email: "estudiante@utec.edu.pe",
  nombre: "Un Estudiante",
  password: "una-password-larga-42",
};

describe("POST /api/auth/registro", () => {
  it("rejects a cross-site request", async () => {
    const response = await POST(req(validBody, { "sec-fetch-site": "cross-site" }));
    expect(response.status).toBe(403);
  });

  it("rejects a non-institutional email", async () => {
    const response = await POST(req({ ...validBody, email: "a@gmail.com" }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing or empty name", async () => {
    const response = await POST(req({ ...validBody, nombre: "  " }));
    expect(response.status).toBe(400);
  });

  it.each(["corta1", validBody.email, "password123"])(
    "rejects a weak password %s",
    async (password) => {
      const response = await POST(req({ ...validBody, password }));
      expect(response.status).toBe(400);
    },
  );

  it("fails closed without a configured database", async () => {
    mockDb.mockReturnValueOnce(null);
    const response = await POST(req(validBody));
    expect(response.status).toBe(503);
  });

  it("creates a pending account for a non-superadmin email", async () => {
    const sql = vi.fn(async (strings: TemplateStringsArray) =>
      strings.join(" ").toLowerCase().includes("insert")
        ? [{ email: validBody.email }]
        : [],
    );
    mockDb.mockReturnValueOnce(sql as never);
    const response = await POST(req(validBody));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual({ ok: true, pendiente: true });
  });

  it("returns a generic conflict message when the email is already registered", async () => {
    const sql = vi.fn(async () => []);
    mockDb.mockReturnValueOnce(sql as never);
    const response = await POST(req(validBody));
    expect(response.status).toBe(409);
  });
});
