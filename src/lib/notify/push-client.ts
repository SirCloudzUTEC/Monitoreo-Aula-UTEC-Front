"use client";

// Browser-side Web Push helpers (F2/F8): permission, VAPID subscription and a
// test notification through /api/push/send.

function base64UrlToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSoportado(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function suscripcionActual(): Promise<PushSubscription | null> {
  if (!pushSoportado()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Subscribes this browser to Web Push. Throws with a Spanish message on failure. */
export async function suscribirPush(): Promise<PushSubscription> {
  if (!pushSoportado()) {
    throw new Error("Este navegador no soporta notificaciones push.");
  }
  const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!clave) {
    throw new Error(
      "Faltan las claves VAPID. Genera con `npx web-push generate-vapid-keys` y configura .env.local (ver README).",
    );
  }
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    throw new Error("Permiso de notificaciones denegado.");
  }
  const reg = await navigator.serviceWorker.ready;
  const existente = await reg.pushManager.getSubscription();
  const sub =
    existente ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(clave).buffer as ArrayBuffer,
    }));
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return sub;
}

export async function desuscribirPush(): Promise<void> {
  const sub = await suscripcionActual();
  await sub?.unsubscribe();
}

/** Sends a test push to this browser. Returns the API error text if it fails. */
export async function probarPush(): Promise<string | null> {
  const sub = await suscripcionActual();
  if (!sub) return "No hay suscripción activa.";
  const res = await fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      titulo: "Prueba · Aula Digital UTEC",
      cuerpo: "Las notificaciones push funcionan. ✓",
      url: "/ajustes",
    }),
  });
  if (res.ok) return null;
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `Error ${res.status}`;
}
