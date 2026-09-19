// Seeds the single default superuser account so there is always a way in
// once self-registration is gone: diego.godoy.t@utec.edu.pe / HolaEquipo1234.
// Idempotent (upserts). Change the password after the first login — this
// script always resets it back to the default, so don't run it again on a
// database where that account's password has already been rotated.
import { randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { loadEnvFile } from "node:process";

loadEnvFile(new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const EMAIL = "diego.godoy.t@utec.edu.pe";
const NOMBRE = "Diego Godoy";
const PASSWORD = "HolaEquipo1234";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("NO_DATABASE_URL");
  process.exit(1);
}

// Same scrypt scheme as src/lib/auth/password.ts — kept duplicated here
// because this script runs standalone via plain Node, not through Next.js.
const N = 16384;
const r = 8;
const p = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const salt = randomBytes(SALT_LEN);
const derived = scryptSync(PASSWORD, salt, KEY_LEN, { N, r, p });
const hash = `scrypt:${N}:${r}:${p}:${salt.toString("hex")}:${derived.toString("hex")}`;

const sql = neon(url);
await sql`
  insert into usuarios (email, nombre, rol, estado, password_hash)
  values (${EMAIL}, ${NOMBRE}, 'superadmin', 'aprobada', ${hash})
  on conflict (email) do update set
    rol = 'superadmin',
    estado = 'aprobada',
    password_hash = excluded.password_hash
`;

console.log(`Superusuario listo: ${EMAIL}`);
console.log(`Contraseña: ${PASSWORD} (cámbiala después de tu primer ingreso; este script la reinicia cada vez que se ejecuta).`);
