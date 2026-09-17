import { describe, expect, it } from "vitest";
import {
  fortalezaPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password", async () => {
    const hash = await hashPassword("un-password-valido-123");
    expect(await verifyPassword("un-password-valido-123", hash)).toBe(true);
  });
  it("rejects a wrong password", async () => {
    const hash = await hashPassword("un-password-valido-123");
    expect(await verifyPassword("otro-password-distinto", hash)).toBe(false);
  });
  it("produces a different hash each time (random salt)", async () => {
    const a = await hashPassword("mismo-password-123");
    const b = await hashPassword("mismo-password-123");
    expect(a).not.toBe(b);
  });
  it.each(["", "no-scrypt-prefix", "scrypt:abc:def", "scrypt:1:1:1:zz:zz"])(
    "rejects a malformed stored hash %s without throwing",
    async (stored) => {
      await expect(verifyPassword("cualquiera", stored)).resolves.toBe(false);
    },
  );
});

describe("fortalezaPassword", () => {
  const email = "estudiante@utec.edu.pe";
  it("accepts a reasonably long, non-obvious password", () => {
    expect(fortalezaPassword("frase-larga-y-unica-42", email)).toBeNull();
  });
  it("rejects short passwords", () => {
    expect(fortalezaPassword("corta1", email)).not.toBeNull();
  });
  it("rejects a password equal to the email", () => {
    expect(fortalezaPassword(email, email)).not.toBeNull();
  });
  it("rejects a common weak password", () => {
    expect(fortalezaPassword("password123", email)).not.toBeNull();
  });
  it("rejects a non-string value", () => {
    expect(fortalezaPassword(12345678901, email)).not.toBeNull();
  });
});
