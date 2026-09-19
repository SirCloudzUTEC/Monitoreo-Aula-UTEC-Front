import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("settings hydrates without a server/browser capability mismatch", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "/ajustes");
  await expect(page.getByRole("heading", { name: "Ajustes", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("legacy dashboard and configuration URLs remain available", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Panel general" })).toBeVisible();
  await page.goto("/configuracion");
  await expect(page).toHaveURL(/\/ajustes$/);
});
