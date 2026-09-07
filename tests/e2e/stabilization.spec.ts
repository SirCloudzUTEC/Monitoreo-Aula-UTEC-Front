import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function login(page: Page) {
  await page.goto("/ajustes");
  await page.getByRole("button", { name: "Entrar como administrador" }).click();
  await page
    .getByRole("textbox", { name: "PIN de administrador", exact: true })
    .fill(process.env.UTEC_TEST_PIN || "2026");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Volver a visualizador" }),
  ).toBeVisible();
}

const checkpoint = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("aula-digital:session:v2") || "{}"),
  );

test("visualizador cannot acknowledge alerts or save an imported plan", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-07T15:30:00-05:00") });
  await page.goto("/alertas", { waitUntil: "networkidle" });
  const buttons = page.getByRole("button", { name: "Acusar recibo" });
  expect(await buttons.count()).toBeGreaterThan(0);
  for (const button of await buttons.all()) await expect(button).toBeDisabled();
  await page.goto("/importar");
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "outline.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("x,y\n0,0\n10,0\n10,6\n0,6\n"),
    });
  await expect(
    page.getByRole("button", { name: "Guardar plano para L-419" }),
  ).toBeDisabled();
});

test("administrator can inject, acknowledge and reload without losing log rows", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await page.goto("/simulador");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reanudar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inyectar", exact: true }).click();
  await expect
    .poll(async () =>
      (await checkpoint(page)).recentLog.some(
        (row: { tipo: string; fuente: string }) =>
          row.tipo === "aforo_excedido" && row.fuente === "inyeccionManual",
      ),
    )
    .toBe(true);
  const before = await checkpoint(page);
  const event = before.recentLog.findLast(
    (row: { tipo: string; fuente: string }) =>
      row.tipo === "aforo_excedido" && row.fuente === "inyeccionManual",
  );
  expect(event).toBeTruthy();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: /^Alertas/ })
    .first()
    .click();
  const card = page
    .locator("div.rounded-lg.border.p-3")
    .filter({ hasText: "Aforo excedido" })
    .first();
  await card.getByRole("button", { name: "Acusar recibo" }).click();
  await expect
    .poll(async () =>
      (await checkpoint(page)).recentLog.some(
        (row: { tipo: string; fuente: string }) =>
          row.tipo === "acuse" && row.fuente === event.id_evento,
      ),
    )
    .toBe(true);
  const saved = await checkpoint(page);
  expect(
    saved.recentLog.some(
      (row: { tipo: string; fuente: string }) =>
        row.tipo === "acuse" && row.fuente === event.id_evento,
    ),
  ).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  const restored = await checkpoint(page);
  expect(
    restored.recentLog.map((row: { id_evento: string }) => row.id_evento),
  ).toEqual(
    expect.arrayContaining(
      saved.recentLog.map((row: { id_evento: string }) => row.id_evento),
    ),
  );
  await page.goto("/log");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv.split(/\r?\n/)[0]).toBe(
    "ts,aula,id_evento,tipo,severidad,fuente,valor,umbral,actor,estado_resultante",
  );
  expect(csv).toContain(event.id_evento);
  expect(csv).toContain(`ACK-${event.id_evento}`);
  expect(errors).toEqual([]);
});

test("expired server session blocks local event injection without a reload", async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto("/simulador");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reanudar", exact: true }),
  ).toBeVisible();
  const saved = await checkpoint(page);
  await context.clearCookies();
  await page.getByRole("button", { name: "Inyectar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inyectar", exact: true }),
  ).not.toBeVisible();
  expect((await checkpoint(page)).recentLog).toEqual(saved.recentLog);
});

test("forged role header is forbidden and authenticated malformed input is rejected", async ({
  request,
}) => {
  const seed = await (await request.get("/api/umbrales")).json();
  expect(
    (
      await request.post("/api/umbrales", {
        headers: { "x-rol": "administrador" },
        data: seed,
      })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/serie?aula=NO-EXISTE")).status()).toBe(400);
  expect(
    (
      await request.post("/api/session", {
        data: { pin: process.env.UTEC_TEST_PIN || "2026" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/umbrales", {
        data: "null",
        headers: { "content-type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect((await request.post("/api/umbrales", { data: seed })).status()).toBe(
    200,
  );
});
