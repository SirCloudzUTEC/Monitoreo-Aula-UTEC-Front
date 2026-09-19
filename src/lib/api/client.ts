// Thin fetch wrapper over the Spring Boot backend (docs/BACKEND_SPRINGBOOT.md).
//
// - The access token lives ONLY in this module's memory (never localStorage /
//   sessionStorage), so an XSS cannot lift it from storage. The long-lived
//   refresh token is an httpOnly cookie the browser sends on its own; JS
//   never sees it.
// - On a 401 it makes exactly one silent `POST /api/auth/refresh` (shared by
//   every request that fails at the same moment) and retries the original
//   request once.
// - Backend errors are RFC 7807 `ProblemDetail`; they become `ApiError`.

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/+$/, "");

/** Marks a request as coming from our web client: the backend requires it on the cookie-driven auth endpoints (CSRF defence). */
const CLIENT_HEADER = { "X-Client": "web" } as const;

export class ApiError extends Error {
  constructor(
    /** HTTP status; 0 when the server could not be reached at all. */
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get sinConexion(): boolean {
    return this.status === 0;
  }
}

/** Human-readable text for any thrown value, for toasts and inline errors. */
export function mensajeDeError(e: unknown, porDefecto = "Ocurrió un error."): string {
  return e instanceof ApiError ? e.message : porDefecto;
}

let accessToken: string | null = null;
let alPerderSesion: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Called when a refresh fails, i.e. the session is really gone. */
export function onSesionPerdida(handler: (() => void) | null): void {
  alPerderSesion = handler;
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface Opciones {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Endpoints that must not carry a bearer token or trigger a refresh (login/refresh). */
  publico?: boolean;
  signal?: AbortSignal;
}

function url(path: string, query?: Query): string {
  const u = new URL(`${API_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function problema(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => null)) as {
    detail?: string;
    title?: string;
  } | null;
  return new ApiError(
    res.status,
    data?.detail ?? data?.title ?? `Error ${res.status} del servidor.`,
  );
}

async function enviar(path: string, o: Opciones): Promise<Response> {
  const headers: Record<string, string> = { ...CLIENT_HEADER };
  if (o.body !== undefined) headers["Content-Type"] = "application/json";
  if (!o.publico && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    return await fetch(url(path, o.query), {
      method: o.method ?? "GET",
      headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
      // only the auth endpoints exchange the refresh cookie
      credentials: path.startsWith("/api/auth/") ? "include" : "omit",
      cache: "no-store",
      signal: o.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "Sin conexión con el servidor.");
  }
}

type ResultadoRefresh = "ok" | "expirada" | "sin_conexion";
let refrescando: Promise<ResultadoRefresh> | null = null;

/** One refresh at a time: concurrent 401s wait for the same round trip. */
export function refrescarSesion(): Promise<ResultadoRefresh> {
  refrescando ??= (async (): Promise<ResultadoRefresh> => {
    try {
      const res = await enviar("/api/auth/refresh", { method: "POST", publico: true });
      if (!res.ok) {
        setAccessToken(null);
        return "expirada";
      }
      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      return "ok";
    } catch {
      // network failure: the session may still be valid, don't drop it
      return "sin_conexion";
    } finally {
      refrescando = null;
    }
  })();
  return refrescando;
}

export async function api<T = void>(path: string, o: Opciones = {}): Promise<T> {
  let res = await enviar(path, o);
  if (res.status === 401 && !o.publico) {
    const r = await refrescarSesion();
    if (r === "ok") res = await enviar(path, o);
    else if (r === "expirada") alPerderSesion?.();
  }
  if (!res.ok) throw await problema(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
