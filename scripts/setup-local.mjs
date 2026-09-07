import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  console.log(".env.local ya existe; no se modificó.");
} else {
  const secret = randomBytes(48).toString("base64url");
  writeFileSync(
    ".env.local",
    `# Solo desarrollo local. No subir a Git.\nDEMO_ADMIN_PIN=2026\nAUTH_SESSION_SECRET=${secret}\n`,
    { flag: "wx" },
  );
  console.log(
    "Configuración local creada. PIN de demostración: 2026. No usar ese PIN en un despliegue público.",
  );
}
