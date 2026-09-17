import { afterEach, describe, expect, it, vi } from "vitest";
import { useApp } from "@/lib/store";
import thresholds from "@/data/umbrales.json";
import type { CuentaUsuario } from "@/lib/auth/identity";

const miembro: CuentaUsuario = {
  email: "miembro@utec.edu.pe",
  nombre: "Miembro",
  rol: "miembro",
  ambitos: [],
  estado: "aprobada",
};

const superadmin: CuentaUsuario = {
  email: "superadmin@utec.edu.pe",
  nombre: "Superadmin",
  rol: "superadmin",
  ambitos: [],
  estado: "aprobada",
};

afterEach(() => {
  vi.unstubAllGlobals();
  useApp.setState({ cuenta: null, umbrales: thresholds });
});

describe("read-only store actions", () => {
  it("rejects threshold changes with no signed-in account", async () => {
    useApp.setState({ cuenta: null, umbrales: thresholds });
    await useApp.getState().setUmbrales({ ...thresholds, umbralTemp: 28 });
    expect(useApp.getState().umbrales.umbralTemp).toBe(thresholds.umbralTemp);
  });
  it("rejects threshold changes from an account without gestionar_dispositivos, without hitting the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    useApp.setState({ cuenta: miembro, umbrales: thresholds });
    await useApp.getState().setUmbrales({ ...thresholds, umbralTemp: 28 });
    expect(useApp.getState().umbrales.umbralTemp).toBe(thresholds.umbralTemp);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("revalidates the server session before writing, and rejects a since-downgraded account", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ cuenta: miembro }) }),
    );
    useApp.setState({ cuenta: superadmin, umbrales: thresholds });
    await useApp.getState().setUmbrales({ ...thresholds, umbralTemp: 28 });
    expect(useApp.getState().umbrales.umbralTemp).toBe(thresholds.umbralTemp);
    expect(useApp.getState().cuenta).toEqual(miembro);
  });
  it("does not write when the server cannot confirm the session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network unavailable")),
    );
    useApp.setState({ cuenta: superadmin, umbrales: thresholds });
    await useApp.getState().setUmbrales({ ...thresholds, umbralTemp: 28 });
    expect(useApp.getState().umbrales.umbralTemp).toBe(thresholds.umbralTemp);
  });
  it("writes once the server confirms an authorized account", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ cuenta: superadmin }),
        }),
    );
    useApp.setState({ cuenta: superadmin, umbrales: thresholds });
    await useApp.getState().setUmbrales({ ...thresholds, umbralTemp: 28 });
    expect(useApp.getState().umbrales.umbralTemp).toBe(28);
  });
});
