// Light persistence for pure per-browser conveniences (sound preference,
// dashboard classroom picks, imported floor plan, contact drafts). Everything
// that matters (thresholds, schedule, events, sessions) lives in the backend.
// Every access is guarded — private windows or SSR must never crash the app.

const PREFIX = "aula-digital:";

export function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or blocked: settings simply won't persist
  }
}

/** Triggers a browser download of in-memory text content (CSV, JSON, templates…). */
export function descargarArchivo(nombre: string, contenido: string, tipo: string): void {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
