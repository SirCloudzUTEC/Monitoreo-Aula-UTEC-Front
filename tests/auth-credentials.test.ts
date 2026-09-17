import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/data/db";
import { hashPassword } from "@/lib/auth/password";
import { autenticarConCredenciales } from "@/lib/auth/credentials";

vi.mock("@/lib/data/db", () => ({ db: vi.fn() }));
const mockDb = vi.mocked(db);

type Row = {
  nombre: string;
  password_hash: string | null;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
};

function fakeSql(selectRows: Row[]) {
  const updates: unknown[][] = [];
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join(" ").toLowerCase();
    if (text.includes("select")) return Promise.resolve(selectRows);
    updates.push(values);
    return Promise.resolve([]);
  };
  return Object.assign(sql, { updates });
}

const EMAIL = "estudiante@utec.edu.pe";

describe("autenticarConCredenciales", () => {
  it("rejects a non-institutional email without touching the database", async () => {
    expect(await autenticarConCredenciales("a@gmail.com", "cualquiera-123")).toBeNull();
    expect(mockDb).not.toHaveBeenCalled();
  });

  it("fails closed when the database isn't configured", async () => {
    mockDb.mockReturnValueOnce(null);
    expect(await autenticarConCredenciales(EMAIL, "cualquiera-123")).toBeNull();
  });

  it("rejects an unknown email", async () => {
    mockDb.mockReturnValueOnce(fakeSql([]) as never);
    expect(await autenticarConCredenciales(EMAIL, "cualquiera-123")).toBeNull();
  });

  it("rejects an account that has no password set (OAuth-only)", async () => {
    mockDb.mockReturnValueOnce(
      fakeSql([
        { nombre: "Alguien", password_hash: null, intentos_fallidos: 0, bloqueado_hasta: null },
      ]) as never,
    );
    expect(await autenticarConCredenciales(EMAIL, "cualquiera-123")).toBeNull();
  });

  it("rejects a locked account even with the correct password", async () => {
    const hash = await hashPassword("password-correcto-123");
    const futuro = new Date(Date.now() + 60_000).toISOString();
    mockDb.mockReturnValueOnce(
      fakeSql([
        { nombre: "Alguien", password_hash: hash, intentos_fallidos: 5, bloqueado_hasta: futuro },
      ]) as never,
    );
    expect(await autenticarConCredenciales(EMAIL, "password-correcto-123")).toBeNull();
  });

  it("accepts the correct password and resets the failure counter", async () => {
    const hash = await hashPassword("password-correcto-123");
    const sql = fakeSql([
      { nombre: "Alguien", password_hash: hash, intentos_fallidos: 2, bloqueado_hasta: null },
    ]);
    mockDb.mockReturnValueOnce(sql as never);
    const cuenta = await autenticarConCredenciales(EMAIL, "password-correcto-123");
    expect(cuenta).toEqual({ email: EMAIL, nombre: "Alguien" });
    expect(sql.updates).toHaveLength(1);
    expect(sql.updates[0]).toEqual([EMAIL]);
  });

  it("rejects a wrong password and increments the failure counter without locking below the threshold", async () => {
    const hash = await hashPassword("password-correcto-123");
    const sql = fakeSql([
      { nombre: "Alguien", password_hash: hash, intentos_fallidos: 1, bloqueado_hasta: null },
    ]);
    mockDb.mockReturnValueOnce(sql as never);
    expect(await autenticarConCredenciales(EMAIL, "password-incorrecto")).toBeNull();
    expect(sql.updates[0]).toEqual(expect.arrayContaining([2, null, EMAIL]));
  });

  it("locks the account once the failure threshold is reached", async () => {
    const hash = await hashPassword("password-correcto-123");
    const sql = fakeSql([
      { nombre: "Alguien", password_hash: hash, intentos_fallidos: 4, bloqueado_hasta: null },
    ]);
    mockDb.mockReturnValueOnce(sql as never);
    expect(await autenticarConCredenciales(EMAIL, "password-incorrecto")).toBeNull();
    const [intentos, bloqueado] = sql.updates[0] as [number, string, string];
    expect(intentos).toBe(5);
    expect(typeof bloqueado).toBe("string");
  });
});
