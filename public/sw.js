// Phase 1: cache navigated documents/assets only. API and RSC payloads are never mixed with HTML.
const CACHE_PREFIX = "aula-digital-";
const CACHE = `${CACHE_PREFIX}v2`;
const PRECACHE = [
  "/",
  "/alertas",
  "/log",
  "/ajustes",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({ error: "Sin conexión: solo lectura." }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
              },
            },
          ),
      ),
    );
    return;
  }
  if (
    request.headers.get("RSC") === "1" ||
    url.searchParams.has("_rsc") ||
    url.pathname === "/sw.js"
  )
    return;
  const document = request.mode === "navigate";
  const asset =
    url.pathname.startsWith("/_next/static/") ||
    ["image", "font", "style", "script"].includes(request.destination);
  if (!document && !asset) return;
  const response = (async () => {
    const cache = await caches.open(CACHE);
    const key = document ? url.pathname : request;
    try {
      const result = await fetch(request);
      if (
        result.ok &&
        (!document || result.headers.get("content-type")?.includes("text/html"))
      ) {
        await cache.put(key, result.clone()).catch(() => {});
      }
      return result;
    } catch {
      const stored = await cache.match(key);
      if (stored) return stored;
      if (document) {
        const home = await cache.match("/");
        if (home) return home;
        return new Response(
          "Sin conexión. Abre la aplicación una vez con internet.",
          {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          },
        );
      }
      return Response.error();
    }
  })();
  event.respondWith(response);
});

function notificationPath(value) {
  return typeof value === "string" &&
    /^\/(?:alertas|ajustes)(?:[?#].*)?$/.test(value)
    ? value
    : "/alertas";
}

self.addEventListener("push", (event) => {
  let data = { titulo: "Aula Digital UTEC", cuerpo: "", url: "/alertas" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* plain push uses safe defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.cuerpo,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: notificationPath(data.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = notificationPath(event.notification.data?.url);
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            await client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
