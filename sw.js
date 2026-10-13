// Folio Forge service worker — offline-capable app shell
const VERSION = "ff-v1";
const SHELL = ["/", "/index.html", "/manifest.json", "/pwa.css", "/pwa.js",
  "/icons/icon-192.png", "/icons/icon-512.png"];
// Never cache live APIs
const BYPASS = ["api.github.com", "api.anthropic.com", "countapi.mileshilliard.com", "visitor-badge.laobi.icu"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (BYPASS.some((h) => url.hostname.includes(h))) return;
  // Pages: network first, fall back to cache when offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => {
      const copy = r.clone(); caches.open(VERSION).then((c) => c.put("/index.html", copy)); return r;
    }).catch(() => caches.match("/index.html")));
    return;
  }
  // Everything else (fonts, tailwind CDN, icons): stale-while-revalidate
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => {
      if (r && (r.ok || r.type === "opaque")) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
