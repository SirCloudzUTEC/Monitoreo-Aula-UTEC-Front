import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ModeloAulaCodigo } from "@/lib/types";

const route = vi.hoisted(() => ({ codigo: "L-418" as ModeloAulaCodigo }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ codigo: route.codigo }),
  usePathname: () => `/aula/${route.codigo}`,
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("@/components/layout/theme-toggle", () => ({
  ThemeToggle: () => null,
}));
vi.mock("@/components/layout/aviso-errores", () => ({
  AvisoErrores: () => null,
}));
vi.mock("@/lib/use-online", () => ({ useOnline: () => true }));
vi.mock("@/components/three/twin-viewer", () => ({ TwinViewer: () => null }));
vi.mock("@/components/plano/plano-svg", () => ({ PlanoSvg: () => null }));
vi.mock("@/lib/api/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks")>()),
  useEventosAbiertos: () => ({ abiertos: [] }),
  useCerrarSesion: () => () => {},
  useEstados: () => ({
    estados: { "L-419": "Libre", "A-1001": "Libre" },
    valores: { "L-419": {}, "A-1001": {} },
    antiguedadMs: { "L-419": 0, "A-1001": 0 },
  }),
}));

import { AppShell } from "@/components/layout/app-shell";
import AulaPage from "@/app/aula/[codigo]/page";
const text = (markup: string) =>
  markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

describe("ficha fotográfica sin telemetría inventada", () => {
  it("muestra L-418 con propuestas y estimaciones, no con lecturas ni estado falsos", () => {
    route.codigo = "L-418";
    const markup = renderToStaticMarkup(createElement(AulaPage));
    const content = text(markup);
    expect(content).toContain("Sin telemetría conectada");
    expect(content).toContain("Dimensiones estimadas");
    expect(content).toContain("Capacidad del modelo: 32 puestos");
    expect(content).toContain("Aire acondicionado no confirmado");
    expect(content).toContain("32 mesas individuales confirmadas");
    expect(content).toContain("Nodos propuestos");
    expect(content).toContain("Sensores propuestos");
    expect(content).not.toContain("Lecturas actuales");
    expect(content).not.toContain("Lecturas simuladas");
    expect(content).not.toContain("Sensores instalados");
    expect(markup).not.toContain('href="/pantalla/L-418"');
  });

  it.each([
    ["L-419", "Con aire acondicionado"],
    ["A-1001", "Sin aire acondicionado"],
  ] as const)(
    "conserva las lecturas reales y metadatos de %s",
    (codigo, hvac) => {
      route.codigo = codigo;
      const content = text(renderToStaticMarkup(createElement(AulaPage)));
      expect(content).toContain(hvac);
      expect(content).toContain("Lecturas actuales");
      expect(content).toContain("Sensores instalados");
      expect(content).not.toContain("Sin telemetría conectada");
    },
  );
});

it("incluye el modelo en la navegación sin anunciar telemetría para él", () => {
  route.codigo = "L-418";
  const markup = renderToStaticMarkup(
    createElement(AppShell, null, "Contenido"),
  );
  const sidebar = markup.match(/<aside\b[\s\S]*?<\/aside>/)?.[0] ?? "";
  expect.soft(sidebar).toContain('href="/aula/L-418"');
  expect
    .soft(text(markup))
    .toContain("Modelo fotográfico estimado · sin telemetría conectada");
  expect
    .soft(text(markup))
    .not.toContain("Datos en vivo de los sensores de las aulas");
});
