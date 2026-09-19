import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");
// The e2e suite runs against the REAL stack: the Spring Boot backend must be up
// (NEXT_PUBLIC_API_BASE_URL, its CORS allowlist including UTEC_BASE_URL) and
// E2E_EMAIL / E2E_PASSWORD must be an approved account (a superadmin covers
// every screen).
if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD)
  throw new Error(
    "Define E2E_EMAIL y E2E_PASSWORD (cuenta aprobada del backend) para las pruebas e2e (ver README).",
  );

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }]],
  use: {
    baseURL: process.env.UTEC_BASE_URL || "http://127.0.0.1:3101",
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
});
