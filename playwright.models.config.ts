import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");

// Separate from playwright.config.ts: these frontend contracts intercept ALL
// backend traffic. They neither require real credentials nor validate Spring.
export default defineConfig({
  testDir: "./tests/models-e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/models-e2e.json" }],
  ],
  use: {
    baseURL: process.env.UTEC_BASE_URL || "http://127.0.0.1:3112",
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
});
