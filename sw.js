const C = "obs-portal-v5";
const APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "offline.html",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "KanzalLulu-Regular.ttf",
  "d3.v7.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(C).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== C).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Google Apps Script API calls must bypass cache
  if (u.hostname.includes("script.google.com") || u.hostname.includes("script.googleusercontent.com")) {
    return;
  }

  // HTML Navigation: Network-First with Cache fallback, then offline.html
  if (e.request.mode === "navigate" || (e.request.headers.get("accept") && e.request.headers.get("accept").includes("text/html"))) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const c = res.clone();
          caches.open(C).then(cache => cache.put(e.request, c));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          if (cached) return cached;
          const fallback = await caches.match("./index.html");
          if (fallback) return fallback;
          return caches.match("offline.html");
        })
    );
    return;
  }

  // Static Assets (fonts, images, scripts, styles): Cache-First with Network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const c = res.clone();
          caches.open(C).then(cache => cache.put(e.request, c));
        }
        return res;
      }).catch(() => {
        if (e.request.destination === "image") {
          return caches.match("icon-192.png");
        }
      });
    })
  );
});
