import { expect, login, test } from "./helpers";

test("losing the connection switches the app to read-only and recovers on reconnect", async ({
  page,
}) => {
  const context = page.context(); // the shared, signed-in context (not the default `context` fixture)
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await expect(
    page.getByText("Datos en vivo de los sensores de las aulas", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await expect(
    page.getByText("Sin conexión con el servidor · solo lectura", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByText("Datos en vivo de los sensores de las aulas", { exact: true }),
  ).toBeVisible({ timeout: 35_000 });
  expect(errors).toEqual([]);
});
