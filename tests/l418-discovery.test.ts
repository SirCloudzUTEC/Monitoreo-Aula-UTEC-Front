import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/components/modules/aula-summary-card", () => ({
  AulaSummaryCard: () => null,
}));
import TodasLasAulasPage from "@/app/aulas/page";

it("permite descubrir L-418 aparte de las aulas con monitoreo, también en móvil", () => {
  const markup = renderToStaticMarkup(createElement(TodasLasAulasPage));
  expect(markup).toContain('href="/aula/L-418"');
  expect(markup).toContain('aria-label="Modelos 3D fotográficos"');
  expect(markup).toContain("Sin telemetría conectada");
  expect(markup).toContain('href="/aula/L-418/3d"');
});
