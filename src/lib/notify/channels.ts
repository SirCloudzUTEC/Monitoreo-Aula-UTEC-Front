// Notification channels behind one adapter, so real integrations can be
// plugged in later without touching the alert flow.

import type { Evento } from "@/lib/types";

export interface NotificacionPayload {
  titulo: string;
  cuerpo: string;
  evento?: Evento;
  url?: string;
}

export interface NotificationChannel {
  id: "push" | "email" | "telegram";
  disponible(): boolean;
  enviar(payload: NotificacionPayload): Promise<boolean>;
}

/** Web Push: sends through our own API using the browser's stored subscription. */
export class PushChannel implements NotificationChannel {
  id = "push" as const;

  disponible(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  }

  async enviar(payload: NotificacionPayload): Promise<boolean> {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg?.active) return false;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return false;
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          titulo: payload.titulo,
          cuerpo: payload.cuerpo,
          url: payload.url ?? "/alertas",
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

/** TODO(phase 2): SMTP/Resend integration for operations contacts. */
export class EmailChannel implements NotificationChannel {
  id = "email" as const;
  disponible(): boolean {
    return false;
  }
  async enviar(): Promise<boolean> {
    console.info("[notify] email stub: configurar proveedor SMTP en fase 2");
    return false;
  }
}

/** TODO(phase 2): Telegram bot for the security team. */
export class TelegramChannel implements NotificationChannel {
  id = "telegram" as const;
  disponible(): boolean {
    return false;
  }
  async enviar(): Promise<boolean> {
    console.info("[notify] telegram stub: configurar bot en fase 2");
    return false;
  }
}

export const CANALES: NotificationChannel[] = [
  new PushChannel(),
  new EmailChannel(),
  new TelegramChannel(),
];

export async function notificarTodos(
  payload: NotificacionPayload,
): Promise<void> {
  await Promise.all(
    CANALES.filter((c) => c.disponible()).map((c) => c.enviar(payload)),
  );
}
