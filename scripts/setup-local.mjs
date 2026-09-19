import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  console.log(".env.local ya existe; no se modificó.");
} else {
  writeFileSync(
    ".env.local",
    `# Solo desarrollo local. No subir a Git.\n` +
      `# Backend Spring Boot (ver ../backend). Su CORS_ALLOWED_ORIGINS debe incluir http://localhost:3000.\n` +
      `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080\n` +
      `# Clave pública VAPID (la misma que VAPID_PUBLIC_KEY del backend) para Web Push:\n` +
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY=\n`,
    { flag: "wx" },
  );
  console.log(
    "Configuración local creada. Levanta el backend (../backend) y entra con la cuenta " +
      "superusuario que el backend siembra en su primer arranque (ver su README/.env).",
  );
}
