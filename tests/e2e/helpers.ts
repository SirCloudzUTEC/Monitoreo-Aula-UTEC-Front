import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL = process.env.UTEC_BASE_URL || "http://127.0.0.1:3101";
const VIEWPORT = { width: 1440, height: 1000 };

export { expect };

/**
 * The backend rate-limits logins (10 per 15 min per address+email), and the access token lives only
 * in memory, so a fresh browser context per test would need a fresh login per test. Instead, tests
 * share ONE context per worker: the refresh cookie stays in it and every new page restores the
 * session silently, exactly as a returning visitor's browser does. Tests that need a clean or
 * disposable session use `contextoAnonimo()` / `contextoNuevo()`.
 */
export const test = base.extend<object, { contextoCompartido: BrowserContext }>({
  contextoCompartido: [
    async ({ browser }, dar) => {
      const context = await browser.newContext({ baseURL: BASE_URL, viewport: VIEWPORT });
      await dar(context);
      await context.close();
    },
    { scope: "worker" },
  ],
  page: async ({ contextoCompartido }, dar) => {
    const page = await contextoCompartido.newPage();
    await dar(page);
    await page.close();
  },
});

/** A brand-new context with no cookies (an anonymous visitor). */
export async function contextoAnonimo(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ baseURL: BASE_URL, viewport: VIEWPORT });
}

/** Waits until the session bootstrap ("Cargando…") is over, whatever it decided. */
async function esperarArranque(page: Page) {
  await page.waitForFunction(() => !document.body.innerText.includes("Cargando…"));
}

/**
 * Opens `destino` signed in. If the shared context already holds a session it is restored from the
 * refresh cookie; otherwise the real login form is used (once per worker).
 */
export async function login(page: Page, destino = "/") {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password)
    throw new Error("Define E2E_EMAIL y E2E_PASSWORD para las pruebas e2e.");
  await page.goto(destino);
  await esperarArranque(page);
  if (new URL(page.url()).pathname === "/acceso") {
    await page.getByLabel("Correo institucional").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(new RegExp(destino === "/" ? "/$" : destino.replace(/[/?]/g, "\\$&")));
  }
  await esperarArranque(page);
}
