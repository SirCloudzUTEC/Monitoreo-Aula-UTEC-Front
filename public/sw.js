// Service worker: offline read mode (network-first with cache fallback for
// same-origin GET) + Web Push notifications.

const CACHE = "aula-digital-v1";
const PRECACHE = ["/", "/alertas", "/log", "/ajustes", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // network first; on success refresh the cache, on failure serve the cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (res.type === "basic" || res.type === "default")) {
          const copia = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit ?? caches.match("/")),
      ),
  );
});

self.addEventListener("push", (event) => {
  let data = { titulo: "Aula Digital UTEC", cuerpo: "", url: "/alertas" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // non-JSON payload: show defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.cuerpo,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/alertas";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
