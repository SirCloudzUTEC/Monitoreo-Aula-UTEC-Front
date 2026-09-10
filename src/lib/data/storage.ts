// Light persistence: localStorage for settings/acks, IndexedDB for the event log.
// Every access is guarded — private windows or SSR must never crash the app.

import type { LogRow } from "@/lib/events/log";

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

// ---------------------------------------------------------------------------
// IndexedDB: event log history (survives reloads, 90-day retention applied on load)

const DB_NAME = "aula-digital-utec";
const DB_VERSION = 1;
const STORE_LOG = "log";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_LOG)) {
          db.createObjectStore(STORE_LOG, { keyPath: "id_evento" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function guardarLogRows(rows: LogRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const finish = () => {
      db.close();
      resolve();
    };
    try {
      const tx = db.transaction(STORE_LOG, "readwrite");
      tx.oncomplete = finish;
      tx.onabort = finish;
      tx.onerror = finish;
      const store = tx.objectStore(STORE_LOG);
      for (const row of rows) store.put(row);
    } catch {
      finish();
    }
  });
}

export async function cargarLogRows(): Promise<LogRow[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_LOG, "readonly");
      const req = tx.objectStore(STORE_LOG).getAll();
      tx.oncomplete = () => {
        db.close();
        resolve((req.result as LogRow[]) ?? []);
      };
      tx.onabort = () => {
        db.close();
        resolve([]);
      };
      tx.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

export async function borrarLog(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const finish = () => {
      db.close();
      resolve();
    };
    try {
      const tx = db.transaction(STORE_LOG, "readwrite");
      tx.oncomplete = finish;
      tx.onabort = finish;
      tx.onerror = finish;
      tx.objectStore(STORE_LOG).clear();
    } catch {
      finish();
    }
  });
}
