import { afterEach, describe, expect, it, vi } from "vitest";
import { useApp } from "@/lib/store";
import thresholds from "@/data/umbrales.json";

afterEach(() => {
  vi.unstubAllGlobals();
  useApp.setState({ rol: "visualizador", umbrales: thresholds });
});

describe("read-only store actions", () => {
  it("rejects threshold changes by a visualizador even outside the UI", () => {
    useApp.setState({ rol: "visualizador", umbrales: thresholds });
    useApp
      .getState()
      .setUmbrales({ ...thresholds, umbralTemp: 28 }, "administrador");
    expect(useApp.getState().umbrales.umbralTemp).toBe(thresholds.umbralTemp);
  });
  it("revalidates the server session before changing local thresholds", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ rol: "visualizador" }),
        }),
    );
    useApp.setState({ rol: "administrador", umbrales: thresholds });
    await useApp
      .getState()
      .setUmbrales({ ...thresholds, umbralTemp: 28 }, "administrador");
    expect(useApp.getState().umbrales.umbralTemp).toBe(thresholds.umbralTemp);
    expect(useApp.getState().rol).toBe("visualizador");
  });
  it("does not write when the server cannot confirm the session", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network unavailable")),
    );
    useApp.setState({ rol: "administrador", umbrales: thresholds });
    await useApp
      .getState()
      .setUmbrales({ ...thresholds, umbralTemp: 28 }, "administrador");
    expect(useApp.getState().umbrales.umbralTemp).toBe(thresholds.umbralTemp);
    expect(useApp.getState().rol).toBe("visualizador");
  });
  it("ignores an administrator response that arrives after logout", async () => {
    let resolveSession!: (value: unknown) => void;
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSession = resolve;
            }),
        )
        .mockResolvedValue({ ok: true }),
    );
    useApp.setState({ rol: "administrador" });
    const pending = useApp.getState().refreshSession();
    await useApp.getState().setRol("visualizador");
    resolveSession({ ok: true, json: async () => ({ rol: "administrador" }) });
    await pending;
    expect(useApp.getState().rol).toBe("visualizador");
  });
  it("does not grant administrator role from a client-only setter", () => {
    useApp.setState({ rol: "visualizador" });
    useApp.getState().setRol("administrador");
    expect(useApp.getState().rol).toBe("visualizador");
  });
});
