import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("L-418 · ruta a su modelo dedicado", () => {
  it("no envía L-418 a la escena genérica de L-419", () => {
    const viewer = readFileSync("src/components/three/twin-viewer.tsx", "utf8");
    expect(viewer).toContain('import("@/components/three/l418-scene")');
    expect(viewer).toMatch(/aula\.codigo === "L-418"/);
    expect(viewer).toContain("? L418Scene");
  });
});
