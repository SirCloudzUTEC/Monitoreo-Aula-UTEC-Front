// App-specific password hashing (scrypt via Node's built-in crypto — no
// extra dependency to audit). This password is never the user's real
// institutional UTEC credential; it only unlocks this app's own session.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LEN = 64;
const SALT_LEN = 16;

/** `scrypt:N:r:p:saltHex:hashHex` — self-describing so params can change later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const derived = await scrypt(password, salt, KEY_LEN, SCRYPT_PARAMS);
  const { N, r, p } = SCRYPT_PARAMS;
  return `scrypt:${N}:${r}:${p}:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (![N, r, p].every(Number.isInteger)) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const derived = await scrypt(password, salt, expected.length, { N, r, p });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Constant-shape dummy verification so a nonexistent account's login takes
 * about as long as a real one — otherwise timing reveals which emails are
 * registered. */
export async function verificarConSenuelo(password: string): Promise<boolean> {
  const senuelo = await hashPassword("senuelo-de-tiempo-constante");
  return verifyPassword(password, senuelo);
}

const DEBILES = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "qwerty123",
  "utec12345",
  "contrasena",
  "contraseña",
  "11111111",
  "00000000",
  "abcd1234",
]);

/** NIST 800-63B favors length over composition rules; still blocks the
 * obvious ones (equal to the email, or a known-weak password). */
export function fortalezaPassword(
  password: unknown,
  email: string,
): string | null {
  if (typeof password !== "string") return "La contraseña es requerida.";
  if (password.length < 10)
    return "La contraseña debe tener al menos 10 caracteres.";
  if (password.length > 128) return "La contraseña es demasiado larga.";
  const local = email.slice(0, email.indexOf("@")).toLowerCase();
  const lower = password.toLowerCase();
  if (lower === local || lower === email.toLowerCase())
    return "La contraseña no puede ser igual a tu correo.";
  if (DEBILES.has(lower))
    return "Esa contraseña es demasiado común; elige otra.";
  return null;
}
