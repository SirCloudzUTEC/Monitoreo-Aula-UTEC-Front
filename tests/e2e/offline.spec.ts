import { expect, test } from "@playwright/test";

const simulatedTime = (page: import("@playwright/test").Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("aula-digital:session:v2") || "{}")
        .simNowMs,
  );

test("offline reload keeps cached readings frozen and API responses JSON", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Panel general" }),
  ).toBeVisible();
  await expect(
    page.getByText("Demostración · datos simulados, sin sensores conectados", {
      exact: true,
    }),
  ).toBeVisible();
  const saved = await simulatedTime(page);
  expect(saved).toBeGreaterThan(0);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Panel general" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sin conexión · solo lectura", { exact: true }),
  ).toBeVisible();
  // Check actual server reachability, not navigator.onLine (which Chrome can
  // report true after reloading a service-worker page under offline emulation).
  const response = await page.evaluate(async () => {
    const result = await fetch("/api/session");
    return {
      status: result.status,
      contentType: result.headers.get("content-type"),
    };
  });
  expect(response.status).toBe(503);
  expect(response.contentType).toContain("application/json");
  await page.clock.install();
  await page.clock.runFor(10_000);
  expect(await simulatedTime(page)).toBe(saved);
  await context.setOffline(false);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Demostración · datos simulados, sin sensores conectados", {
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
