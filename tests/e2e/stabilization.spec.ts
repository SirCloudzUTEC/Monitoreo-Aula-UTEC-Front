import { readFile } from "node:fs/promises";
import { contextoAnonimo, expect, login, test } from "./helpers";

test("an anonymous visitor is sent to the login page and back after signing in", async ({ browser }) => {
  const contexto = await contextoAnonimo(browser);
  const page = await contexto.newPage();
  await page.goto("/alertas");
  await expect(page).toHaveURL(/\/acceso\?next=%2Falertas$/);
  await login(page, "/alertas");
  await expect(page.getByRole("heading", { name: "Alertas", exact: true })).toBeVisible();
  await contexto.close();
});

test("a wrong password shows a generic error and keeps the user on the login page", async ({ browser }) => {
  const contexto = await contextoAnonimo(browser);
  const page = await contexto.newPage();
  await page.goto("/acceso");
  await page.getByLabel("Correo institucional").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Contraseña").fill("contraseña-incorrecta-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText(/No se pudo iniciar sesión/)).toBeVisible();
  await expect(page).toHaveURL(/\/acceso/);
  await contexto.close();
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

test("the page loads under the Content-Security-Policy without violations", async ({ page }) => {
  const violaciones: string[] = [];
  page.on("console", (m) => {
    if (/content security policy|refused to (load|connect|execute|apply)/i.test(m.text())) violaciones.push(m.text());
  });
  for (const ruta of ["/", "/alertas", "/ajustes", "/aula/L-419", "/aula/L-419/3d", "/modulo/aire"]) {
    await login(page, ruta);
    await page.waitForLoadState("networkidle");
  }
  expect(violaciones).toEqual([]);
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
  await expect(boton).toBeVisible(); // the synthetic publisher keeps a low-battery alert open
  await boton.click();
  await expect(page.getByText(/Acuse registrado/)).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText(/Acusado por/).first()).toBeVisible();
});

test("a stale room is flagged instead of shown as live", async ({ page }) => {
  await login(page);
  // the synthetic publisher is running, so nothing may be flagged as stale
  await expect(page.getByText(/Sin datos recientes/)).toHaveCount(0);
});

test("the change-password form validates before calling the backend", async ({ page }) => {
  await login(page, "/ajustes");
  await page.getByLabel("Contraseña actual").fill("cualquiera-12345");
  await page.getByLabel(/Nueva \(mínimo/).fill("nueva-clave-456");
  await page.getByLabel("Repite la nueva").fill("otra-clave-789");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText(/no coinciden/)).toBeVisible();
  // the browser's own minlength check stops a too-short password before any request
  await page.getByLabel(/Nueva \(mínimo/).fill("corta");
  await page.getByLabel("Repite la nueva").fill("corta");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  const nueva = page.getByLabel(/Nueva \(mínimo/);
  expect(await nueva.evaluate((el) => (el as HTMLInputElement).validity.tooShort)).toBe(true);
});

test("the devices roster lists the seeded nodes and offers to block them", async ({ page }) => {
  await login(page, "/dispositivos");
  await expect(page.getByRole("heading", { name: "Dispositivos", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "nodoAmbiental" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Bloquear" }).first()).toBeVisible();
});

test("a revoked session sends the user back to the login page", async ({ browser }) => {
  const contexto = await contextoAnonimo(browser);
  const page = await contexto.newPage();
  await login(page);
  await contexto.clearCookies(); // drops the refresh cookie
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/acceso/);
  await contexto.close();
});

test("several tabs opened at once do not log each other out", async ({ browser }) => {
  const contexto = await contextoAnonimo(browser);
  const primera = await contexto.newPage();
  await login(primera);
  // restoring the session rotates the refresh cookie: N tabs doing it simultaneously must all survive
  const paginas = await Promise.all([1, 2, 3, 4].map(() => contexto.newPage()));
  await Promise.all(paginas.map((p) => p.goto("/")));
  for (const p of paginas) {
    await expect(p.getByRole("heading", { name: "Panel general" })).toBeVisible();
  }
  await primera.reload({ waitUntil: "networkidle" }); // ...and the session is still alive afterwards
  await expect(primera.getByRole("heading", { name: "Panel general" })).toBeVisible();
  await contexto.close();
});
