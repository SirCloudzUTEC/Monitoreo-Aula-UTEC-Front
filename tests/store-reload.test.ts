import { afterEach, describe, expect, it, vi } from "vitest";

const entries = new Map<string, string>();
function browser(rol = "visualizador") {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    },
  });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rol }) }),
  );
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  entries.clear();
  vi.resetModules();
});

describe("browser session restoration", () => {
  it("freezes simulated readings while offline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T09:30:00-05:00"));
    browser();
    const { useApp } = await import("@/lib/store");
    useApp.getState().iniciar();
    const previous = useApp.getState().simNowMs;
    vi.stubGlobal("navigator", { onLine: false });
    vi.advanceTimersByTime(15_000);
    expect(useApp.getState().simNowMs).toBe(previous);
  });
  it("freezes cached readings when navigator says online but the server is unavailable", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T09:30:00-05:00"));
    browser();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    const { useApp } = await import("@/lib/store");
    useApp.getState().iniciar();
    await useApp.getState().refreshSession();
    const previous = useApp.getState().simNowMs;
    await vi.advanceTimersByTimeAsync(15_000);
    expect(useApp.getState().simNowMs).toBe(previous);
    expect(useApp.getState().connected).toBe(false);
  });
  it("keeps an acknowledged event and its audit rows across reloads", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T09:30:00-05:00"));
    browser("administrador");
    const { useApp } = await import("@/lib/store");
    useApp.getState().iniciar();
    await useApp.getState().refreshSession();
    await useApp.getState().inyectarEvento("L-419", "aforo_excedido");
    const event = useApp
      .getState()
      .abiertos.find((e) => e.tipo === "aforo_excedido")!;
    await useApp.getState().acusar("L-419", event.id_evento);
    const auditIds = useApp.getState().log.map((row) => row.id_evento);
    vi.clearAllTimers();
    vi.resetModules();
    const { useApp: reloaded } = await import("@/lib/store");
    reloaded.getState().iniciar();
    expect(reloaded.getState().log.map((row) => row.id_evento)).toEqual(
      expect.arrayContaining(auditIds),
    );
    expect(
      reloaded
        .getState()
        .abiertos.some((e) => e.id_evento === event.id_evento && !e.acuse),
    ).toBe(false);
  });
});
