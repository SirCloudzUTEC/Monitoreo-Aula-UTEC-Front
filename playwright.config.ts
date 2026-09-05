import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");
process.env.UTEC_TEST_PIN ??= process.env.DEMO_ADMIN_PIN;
if (!process.env.UTEC_TEST_PIN)
  throw new Error(
    "Configura UTEC_TEST_PIN o ejecuta npm run setup:local para probar la demo local.",
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
