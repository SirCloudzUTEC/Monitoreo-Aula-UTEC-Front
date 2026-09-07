// Smoke test: inserts a superadmin + incident + notification inside a
// transaction-like flow, verifies constraints, and cleans up. Real DB, no
// secrets printed.
import { neon } from "@neondatabase/serverless";
import { loadEnvFile } from "node:process";

loadEnvFile(new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const sql = neon(process.env.DATABASE_URL);

// 1. valid user
const [u] = await sql`
  insert into usuarios (email, nombre, rol, estado)
  values ('smoke.test@utec.edu.pe', 'Prueba', 'superadmin', 'aprobada')
  on conflict (email) do update set nombre = excluded.nombre
  returning id, email, rol`;
console.log("USER OK:", u.email, u.rol);

// 2. invalid domain must be rejected by the DB constraint
let rejected = false;
try {
  await sql`insert into usuarios (email) values ('intruso@gmail.com')`;
} catch {
  rejected = true;
}
console.log("GMAIL REJECTED BY DB:", rejected);

// 3. incident + notification
const [i] = await sql`
  insert into incidentes (categoria, prioridad, ubicacion, descripcion, reportado_por)
  values ('robo', 'critica', 'Aula L-419', 'Prueba de humo del esquema inicial.', ${u.id})
  returning id, estado`;
const [n] = await sql`
  insert into notificaciones (incidente_id, ambito)
  values (${i.id}, 'seguridad')
  returning id`;
console.log("INCIDENT OK:", i.id, i.estado, "NOTIFICATION OK:", n.id);

// 4. cleanup
await sql`delete from incidentes where id = ${i.id}`;
await sql`delete from usuarios where email = 'smoke.test@utec.edu.pe'`;
const [{ count }] = await sql`select count(*)::int as count from usuarios`;
console.log("CLEANUP DONE, remaining users:", count);
