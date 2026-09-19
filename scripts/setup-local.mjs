import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  console.log(".env.local ya existe; no se modificó.");
} else {
  const secret = randomBytes(48).toString("base64url");
  writeFileSync(
    ".env.local",
    `# Solo desarrollo local. No subir a Git.\nAUTH_SECRET=${secret}\n` +
      `# Completa estas dos para probar el login real con Google (ver README):\n` +
      `GOOGLE_OAUTH_CLIENT_ID=\nGOOGLE_OAUTH_CLIENT_SECRET=\n` +
      `# El único superusuario por defecto (siémbralo con npm run seed:superadmin):\n` +
      `SUPERADMIN_EMAIL=diego.godoy.t@utec.edu.pe\n`,
    { flag: "wx" },
  );
  console.log(
    "Configuración local creada (AUTH_SECRET generado). Completa GOOGLE_OAUTH_CLIENT_ID/SECRET, " +
      "DATABASE_URL y corre `npm run seed:superadmin` para crear el superusuario por defecto " +
      "(diego.godoy.t@utec.edu.pe / HolaEquipo1234).",
  );
}
