import type { PushSubscription } from "web-push";
import { isRecord } from "@/lib/validation";

/** Strict push-provider allowlist: never turn the server into an arbitrary HTTP relay. */
export function validSubscription(value: unknown): value is PushSubscription {
  if (
    !isRecord(value) ||
    typeof value.endpoint !== "string" ||
    value.endpoint.length > 2048 ||
    !isRecord(value.keys)
  )
    return false;
  try {
    const url = new URL(value.endpoint);
    const allowed =
      url.hostname === "fcm.googleapis.com" ||
      url.hostname === "updates.push.services.mozilla.com" ||
      url.hostname === "web.push.apple.com" ||
      url.hostname.endsWith(".notify.windows.com");
    if (
      !allowed ||
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      url.hash
    )
      return false;
    return (
      typeof value.keys.p256dh === "string" &&
      /^[A-Za-z0-9_-]{87}={0,2}$/.test(value.keys.p256dh) &&
      typeof value.keys.auth === "string" &&
      /^[A-Za-z0-9_-]{22}={0,2}$/.test(value.keys.auth)
    );
  } catch {
    return false;
  }
}

export function safeNotificationPath(value: unknown): string {
  return typeof value === "string" &&
    /^\/(?:alertas|ajustes)(?:[?#].*)?$/.test(value)
    ? value
    : "/alertas";
}
