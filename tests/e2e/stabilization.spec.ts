import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { login } from "./helpers";

test("an anonymous visitor is sent to the login page and back after signing in", async ({ page }) => {
  await page.goto("/alertas");
  await expect(page).toHaveURL(/\/acceso\?next=%2Falertas$/);
  await login(page, "/alertas");
  await expect(page.getByRole("heading", { name: "Alertas", exact: true })).toBeVisible();
});

test("a wrong password shows a generic error and keeps the user on the login page", async ({ page }) => {
  await page.goto("/acceso");
  await page.getByLabel("Correo institucional").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Contraseña").fill("contraseña-incorrecta-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText(/No se pudo iniciar sesión/)).toBeVisible();
  await expect(page).toHaveURL(/\/acceso/);
});

test("the dashboard shows live data from the backend, and the session survives a reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await expect(page.getByRole("heading", { name: "Panel general" })).toBeVisible();
  await expect(page.getByText(/Estado en vivo a las/)).toBeVisible();
  // the access token is memory-only: a reload must restore the session from the refresh cookie
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Panel general" })).toBeVisible();
  await expect(page.getByText(/Estado en vivo a las/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("nothing sensitive is written to web storage", async ({ page }) => {
  await login(page);
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\./); // no JWT
  expect(storage).not.toMatch(/refresh/i);
});

test("the event log exports the exact SYS-10.1 CSV columns", async ({ page }) => {
  await login(page, "/log");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const csv = await readFile((await (await downloadPromise).path())!, "utf8");
  expect(csv.split(/\r?\n/)[0]).toBe(
    "ts,aula,id_evento,tipo,severidad,fuente,valor,umbral,actor,estado_resultante",
  );
});

test("an open alert can be acknowledged and stays acknowledged after a reload", async ({ page }) => {
  await login(page, "/alertas");
  const boton = page.getByRole("button", { name: "Acusar recibo" }).first();
  test.skip((await boton.count()) === 0, "no hay alertas abiertas sin acuse en este entorno");
  await boton.click();
  await expect(page.getByText(/Acuse registrado/)).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText(/Acusado por/).first()).toBeVisible();
});

test("a revoked session sends the user back to the login page", async ({ page, context }) => {
  await login(page);
  await context.clearCookies(); // drops the refresh cookie
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/acceso/);
});
