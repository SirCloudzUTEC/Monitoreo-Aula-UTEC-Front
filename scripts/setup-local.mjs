import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Variables of the previous architecture (Auth.js + Neon + MQTT in Next.js). The frontend no longer
// reads them: they belong to the backend, and a leftover DATABASE_URL / private key in a project that
// serves JavaScript to browsers is a liability.
const OBSOLETAS = [
  "AUTH_SECRET",
  "AUTH_TEST_BYPASS_SECRET",
  "DATABASE_URL",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "MICROSOFT_OAUTH_CLIENT_ID",
  "SUPERADMIN_EMAIL",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "NEXT_PUBLIC_MQTT_WS_URL",
  "MQTT_USER",
  "MQTT_PASS",
];

if (existsSync(".env.local")) {
  console.log(".env.local ya existe; no se modificó.");
  const claves = new Set(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1])
      .filter(Boolean),
  );
  const sobran = OBSOLETAS.filter((k) => claves.has(k));
  if (sobran.length > 0) {
    console.warn(
      `\nAVISO: .env.local todavía define variables que el frontend ya no usa:\n  ${sobran.join("\n  ")}\n` +
        "Bórralas (y de las variables de Vercel también); rota las que hayan salido de tu equipo.",
    );
  }
  if (!claves.has("NEXT_PUBLIC_API_BASE_URL")) {
    console.warn("\nAVISO: falta NEXT_PUBLIC_API_BASE_URL (obligatoria en producción).");
  }
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
