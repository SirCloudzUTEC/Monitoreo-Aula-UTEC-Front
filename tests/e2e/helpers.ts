import { expect, type Page } from "@playwright/test";

/** Signs in through the real login form against the backend. */
export async function login(page: Page, destino = "/") {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password)
    throw new Error("Define E2E_EMAIL y E2E_PASSWORD para las pruebas e2e.");
  await page.goto(`/acceso?next=${encodeURIComponent(destino)}`);
  await page.getByLabel("Correo institucional").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(new RegExp(`${destino === "/" ? "/$" : destino}`));
}
