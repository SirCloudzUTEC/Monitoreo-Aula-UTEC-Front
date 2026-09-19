"use client";

// Browser-side Web Push helpers (F2/F8): permission, VAPID subscription
// (registered in the backend, which sends the real pushes) and a test
// notification.

import { ApiError } from "@/lib/api/client";
import {
  eliminarPush,
  enviarPush,
  listarUsuarios,
  registrarPush,
} from "@/lib/api/endpoints";
import { loadLocal, saveLocal } from "@/lib/data/storage";

function base64UrlToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSoportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function suscripcionActual(): Promise<PushSubscription | null> {
  if (!pushSoportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg?.active ? reg.pushManager.getSubscription() : null;
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
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active)
    throw new Error(
      "La PWA aún no está lista; recarga la página con conexión.",
    );
  const existente = await reg.pushManager.getSubscription();
  const sub =
    existente ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(clave).buffer as ArrayBuffer,
    }));
  try {
    const { id } = await registrarPush(sub.toJSON());
    saveLocal("pushSubId", id);
  } catch (e) {
    throw new Error(
      e instanceof ApiError && e.status === 403
        ? "Tu cuenta no puede recibir alertas todavía."
        : "No se pudo registrar el push. Verifica tu sesión.",
    );
  }
  return sub;
}

export async function desuscribirPush(): Promise<void> {
  const sub = await suscripcionActual();
  const id = loadLocal<number | null>("pushSubId", null);
  if (id !== null) {
    // best effort: the browser subscription is dropped either way
    await eliminarPush(id).catch(() => {});
    saveLocal("pushSubId", null);
  }
  await sub?.unsubscribe();
}

/**
 * Called before signing out: drops this browser's server-side subscription and the browser
 * subscription itself, so the account that just left stops receiving alerts on a shared computer.
 * Best effort: a failure here must never trap the user inside the session.
 */
export async function liberarPushAlSalir(): Promise<void> {
  const limite = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  try {
    await Promise.race([desuscribirPush(), limite]);
  } catch {
    saveLocal("pushSubId", null);
  }
}

const PRUEBA = {
  titulo: "Prueba · Aula Digital UTEC",
  cuerpo: "Las notificaciones push funcionan. ✓",
  path: "/ajustes",
};

/**
 * Sends a test push to the signed-in account. The backend endpoint targets a
 * user id (omitting it would broadcast to everyone), and only a superadmin can
 * look up their own id; everyone else gets a local notification, which still
 * proves the browser permission and the service worker display path.
 * Returns an error text on failure.
 */
export async function probarPush(email: string): Promise<string | null> {
  const sub = await suscripcionActual();
  if (!sub) return "No hay suscripción activa.";
  try {
    const propio = (await listarUsuarios().catch(() => null))?.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (propio) {
      const { enviados } = await enviarPush({ usuarioId: propio.id, ...PRUEBA });
      return enviados > 0 ? null : "El servidor no pudo entregar la notificación.";
    }
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return "La PWA aún no está lista.";
    await reg.showNotification(PRUEBA.titulo, {
      body: PRUEBA.cuerpo,
      icon: "/icon-192.png",
      data: { url: PRUEBA.path },
    });
    return null;
  } catch (e) {
    return e instanceof ApiError ? e.message : "No se pudo enviar la prueba.";
  }
}
