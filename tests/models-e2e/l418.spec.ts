import { expect, test } from "./fixtures";

test("L-418 identifica el recinto cerrado sin afirmar su interior y deja inspeccionar la planta", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/aula/L-418/3d");
  await expect(
    page.getByText(
      "Planta con entrante · recinto reservado cerrado (interior no levantado).",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByTestId("l418-geometry-version")).toHaveText(
    "Fondo reservado: 2.4 m · paso exterior: 2.67 m (estimados).",
  );
  await expect(
    page.getByText("Nodo ambiental · propuesto", { exact: true }),
  ).toBeVisible();
  for (const name of [
    "Techo y datos",
    "Luminarias",
    "Contraincendios",
    "Sensores",
  ]) {
    const button = page.getByRole("button", { name, exact: true });
    if ((await button.getAttribute("aria-pressed")) === "true")
      await button.click();
  }
  await page.mouse.move(2, 95);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: "test-results/l418-team-model.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("L-418 conserva la identificación del fondo tras una recarga controlada por service worker", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/aula/L-418/3d");
  const version = page.getByTestId("l418-geometry-version");
  const esperado =
    "Fondo reservado: 2.4 m · paso exterior: 2.67 m (estimados).";
  await expect(version).toHaveText(esperado);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.reload();
  await expect(version).toHaveText(esperado);
  await expect(
    page.getByText("Nodo ambiental · propuesto", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("L-418 carga su modelo propio con 32 mesas y conserva las capas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/aula/L-418/3d");
  await expect(page.getByTestId("l418-scene")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByText("Gemelo 3D · proporciones estimadas de fotos"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Entrada/salida: junto al tacho · Zona reservada: junto al escritorio.",
      { exact: true },
    ),
  ).toBeVisible();
  const chairs = page.getByRole("button", { name: "Sillas", exact: true });
  await chairs.click();
  await expect(chairs).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Mostrar todo", exact: true }).click();
  await expect(chairs).toHaveAttribute("aria-pressed", "true");
  const sensors = page.getByRole("button", { name: "Sensores", exact: true });
  const sensorLabels = page
    .getByTestId("l418-scene")
    .getByText(/ · propuesto$/);
  await expect(sensorLabels).toHaveCount(5);
  const labels = await sensorLabels.all();
  for (const label of labels) await expect(label).toBeVisible();
  await sensors.click();
  await expect(sensors).toHaveAttribute("aria-pressed", "false");
  for (const label of labels) await expect(label).toBeHidden();
  await sensors.click();
  await expect(sensors).toHaveAttribute("aria-pressed", "true");
  await expect(sensorLabels).toHaveCount(5);
  for (const label of labels) await expect(label).toBeVisible();
  const canvas = page.locator("canvas");
  const markers = [
    "Nodo ambiental · propuesto",
    "Nodo ventana 2 · propuesto",
  ].map((name) => page.getByText(name, { exact: true }));
  for (const marker of markers) await expect(marker).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const initial = await Promise.all(
    markers.map((marker) => marker.boundingBox()),
  );
  expect(initial.every(Boolean)).toBe(true);
  await canvas.evaluate((el) =>
    el.setAttribute("data-reset-probe", "persistent"),
  );
  const bounds = (await canvas.boundingBox())!;
  const x = bounds.x + bounds.width * 0.7;
  const y = bounds.y + bounds.height * 0.35;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 30, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      Math.abs((await markers[1].boundingBox())!.x - initial[1]!.x),
    )
    .toBeGreaterThan(2);
  await page
    .getByRole("button", { name: "Reiniciar vista", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-reset-probe", "persistent");

  for (const [i, marker] of markers.entries()) {
    await expect
      .poll(
        async () => {
          const restored = await marker.boundingBox();
          if (!restored) return Infinity;
          // Html labels are center-anchored; their distanceFactor can change
          // text size on the first interaction without moving the 3D point.
          return Math.hypot(
            restored.x +
              restored.width / 2 -
              (initial[i]!.x + initial[i]!.width / 2),
            restored.y +
              restored.height / 2 -
              (initial[i]!.y + initial[i]!.height / 2),
          );
        },
        {
          message: "Reiniciar restaura la proyección de los sensores",
          timeout: 10000,
        },
      )
      .toBeLessThan(2);
  }
  await page.mouse.move(2, 95);
  await page.screenshot({ path: "test-results/l418-3d.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("la ficha no ofrece TV ni lecturas para el modelo no conectado", async ({
  page,
}) => {
  await page.goto("/aula/L-418");
  await expect(
    page.getByText("Sin telemetría conectada", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^Nodos propuestos/ }),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^Sensores propuestos/ }),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^Lecturas actuales$/ }),
  ).toHaveCount(0);
  await expect(page.locator('a[href="/pantalla/L-418"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ver plano 2D (vista clásica)", exact: true })
    .click();
  await expect(page.getByText(/Esquema 2D simplificado/)).toBeVisible();
});

test("el modelo se descubre desde el panel en móvil sin entrar en el monitoreo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const modelos = page.getByRole("region", { name: "Modelos 3D fotográficos" });
  await modelos.getByRole("link", { name: "Ver ficha y modelo" }).click();
  await expect(page).toHaveURL(/\/aula\/L-418$/);
  await expect(
    page.getByText("Sin telemetría conectada", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
});

test("el modelo conserva la puerta de autenticación institucional", async ({
  page,
  backend,
}) => {
  backend.signedIn = false;
  await page.goto("/aula/L-418/3d");
  await expect(page).toHaveURL(/\/acceso\?next=/);
  await expect(page.getByTestId("l418-scene")).toHaveCount(0);
});

test("los errores de un aula monitorizada siguen visibles, no se disfrazan de modelo", async ({
  page,
  backend,
}) => {
  backend.failedRoom = "L-419";
  await page.goto("/aula/L-418/3d");
  await expect(page.getByTestId("l418-scene")).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "No se pudieron cargar" }),
  ).toContainText("Fallo de contrato controlado");
});

for (const codigo of ["L-419", "A-1001"] as const) {
  test(`${codigo} conserva su ficha y su escena existentes`, async ({
    page,
  }) => {
    await page.goto(`/aula/${codigo}`);
    await expect(
      page.getByRole("heading", { name: `Aula ${codigo}`, exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: /^Lecturas actuales$/ }),
    ).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByTestId("l418-scene")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Techo y datos", exact: true }),
    ).toBeVisible();
  });
}
