// Contract test: the enum unions hard-coded in the frontend must match the
// values the backend serves at `GET /api/meta/enums`. It needs a running
// backend, so it only runs when UTEC_API_BASE_URL is set (CI with the stack up,
// or locally: UTEC_API_BASE_URL=http://localhost:8080 npm test).

import { describe, expect, it } from "vitest";
import { AMBITOS, PERMISOS, ROLES } from "@/lib/auth/identity";
import { CATALOGO_EVENTOS } from "@/lib/events/catalog";
import { SEVERIDADES } from "@/lib/types";
import { UNIDADES } from "@/lib/units";

const base = process.env.UTEC_API_BASE_URL;

describe.skipIf(!base)("frontend/backend enum contract", () => {
  const cargar = async (): Promise<Record<string, string[]>> => {
    const res = await fetch(`${base}/api/meta/enums`, { headers: { "X-Client": "web" } });
    expect(res.status).toBe(200);
    return res.json();
  };
  const ordenados = (xs: readonly string[]) => [...xs].sort();

  it("magnitudes", async () => {
    expect(ordenados((await cargar()).magnitud)).toEqual(ordenados(Object.keys(UNIDADES)));
  });
  it("event types", async () => {
    expect(ordenados((await cargar()).tipoEvento)).toEqual(ordenados(Object.keys(CATALOGO_EVENTOS)));
  });
  it("severities", async () => {
    expect(ordenados((await cargar()).severidad)).toEqual(ordenados(SEVERIDADES));
  });
  it("roles, permissions and scopes", async () => {
    const e = await cargar();
    expect(ordenados(e.rol)).toEqual(ordenados(ROLES));
    expect(ordenados(e.permiso)).toEqual(ordenados(PERMISOS));
    expect(ordenados(e.ambito)).toEqual(ordenados(AMBITOS));
  });
});
