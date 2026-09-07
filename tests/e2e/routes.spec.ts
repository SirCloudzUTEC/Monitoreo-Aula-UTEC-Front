import { expect, test } from "@playwright/test";

for (const path of [
  "/",
  "/aula/L-419",
  "/aula/A-1001",
  "/modulo/aire",
  "/pantalla/A-1001",
  "/importar",
  "/log",
  "/simulador",
  "/asistente",
  "/acceso",
  "/reportar",
]) {
  test(`desktop route ${path} loads without JavaScript errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
    if (path.startsWith("/pantalla/")) {
      const fontSizes = await page
        .locator(".font-mono.font-bold")
        .evaluateAll((elements) =>
          elements.map((element) =>
            parseFloat(getComputedStyle(element).fontSize),
          ),
        );
      expect(fontSizes.length).toBeGreaterThan(0);
      expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(32);
    }
  });
}

for (const path of ["/", "/aula/L-419", "/ajustes"]) {
  test(`mobile route ${path} fits the viewport`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
