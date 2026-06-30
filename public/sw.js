/**
 * SkillSphere Service Worker
 * Caching strategy for PWA static assets.
 *
 * Strategies used:
 *  - Cache-first  : static assets (JS, CSS, fonts, images, icons)
 *  - Network-first: API routes and dynamic Next.js page data
 *  - Stale-while-revalidate: HTML pages (fast first paint + background refresh)
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `skillsphere-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `skillsphere-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `skillsphere-images-${CACHE_VERSION}`;

/** Static assets to pre-cache on install */
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/pwa/icon-192x192.png",
  "/icons/pwa/icon-512x512.png",
];

/** Max number of entries in the dynamic/image caches */
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 60,
  [IMAGE_CACHE]: 40,
};

// ---------------------------------------------------------------------------
// Install — pre-cache critical assets
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate — clean up old caches
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  const allowedCaches = new Set([STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !allowedCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch — route requests to the appropriate strategy
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin and known CDN requests
  if (
    request.method !== "GET" ||
    url.protocol === "chrome-extension:" ||
    url.hostname.includes("localhost") && url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // --- API routes: Network-first, fall back to cache ---
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // --- Next.js data / RSC payloads: Network-first ---
  if (
    url.pathname.startsWith("/_next/data/") ||
    url.searchParams.has("_rsc")
  ) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // --- Static assets: Cache-first (JS chunks, CSS, fonts) ---
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // --- Images: Cache-first with size-limited image cache ---
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|avif|ico)$/)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // --- HTML pages: Stale-while-revalidate ---
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Default: network with dynamic cache fallback
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ---------------------------------------------------------------------------
// Strategy helpers
// ---------------------------------------------------------------------------

/**
 * Cache-first: serve from cache; fetch & cache on miss.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await trimCache(cacheName);
    }
    return response;
  } catch {
    return new Response("Offline – resource not cached.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/**
 * Network-first: try network; fall back to cache on failure.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await trimCache(cacheName);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "You are offline and this resource is not cached." }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Stale-while-revalidate: return cache immediately; refresh in background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start background fetch regardless
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        await trimCache(cacheName);
      }
      return response;
    })
    .catch(() => null);

  // Return stale copy immediately if available, else await network
  return cached ?? fetchPromise;
}

// ---------------------------------------------------------------------------
// Cache size management — remove oldest entries above limit
// ---------------------------------------------------------------------------
async function trimCache(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > limit) {
    const toDelete = keys.slice(0, keys.length - limit);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// ---------------------------------------------------------------------------
// Push notifications (stub – extend as needed)
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "SkillSphere";
  const options = {
    body: data.body ?? "You have a new notification.",
    icon: "/icons/pwa/icon-192x192.png",
    badge: "/icons/pwa/icon-72x72.png",
    data: { url: data.url ?? "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url === target && "focus" in c);
        if (existing) return existing.focus();
        return clients.openWindow(target);
      })
  );
});
