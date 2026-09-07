import { expect, test } from "@playwright/test";

test("settings hydrates without a server/browser capability mismatch", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/ajustes", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Ajustes", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("legacy dashboard and configuration URLs remain available", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Panel general" })).toBeVisible();
  await page.goto("/configuracion");
  await expect(page).toHaveURL(/\/ajustes$/);
});
