/**
 * Claw Empire — Service Worker
 *
 * Strategy:
 *  - Static assets (JS, CSS, images): cache-first with background revalidation
 *  - Navigation (HTML): network-first, fall back to cached shell
 *  - API (/api/*) and WebSocket (/ws): always bypass — never cached
 *
 * Offline mutations: when a state-mutating fetch fails because the client is
 * offline, the request is stored in IndexedDB and replayed automatically
 * once connectivity is restored.
 */

const SW_VERSION = "1";
const STATIC_CACHE = `climpire-static-v${SW_VERSION}`;
const MUTATION_STORE = "offline-mutations";
const IDB_DB = "climpire-sw";
const IDB_VERSION = 1;

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(["/"]))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ── IDB helpers ──────────────────────────────────────────────────────────────
function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(MUTATION_STORE, {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueMutation(request) {
  const db = await openIdb();
  const body = await request.clone().text().catch(() => null);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, "readwrite");
    tx.objectStore(MUTATION_STORE).add({
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body,
      timestamp: Date.now(),
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function replayQueuedMutations() {
  const db = await openIdb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, "readonly");
    const req = tx.objectStore(MUTATION_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  for (const item of items) {
    try {
      const headers = Object.fromEntries(item.headers);
      await fetch(item.url, {
        method: item.method,
        headers,
        body: item.body || undefined,
      });
      // Remove from queue on success
      const tx = db.transaction(MUTATION_STORE, "readwrite");
      tx.objectStore(MUTATION_STORE).delete(item.id);
    } catch {
      // Still offline — leave in queue
    }
  }
}

// ── Fetch handler ────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip API routes and WebSocket upgrades — always go direct to network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) {
    // For non-GET mutations, queue offline and respond with a synthetic 202
    if (request.method !== "GET" && url.pathname.startsWith("/api/")) {
      event.respondWith(
        fetch(request.clone()).catch(async () => {
          await queueMutation(request);
          return new Response(JSON.stringify({ queued: true }), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );
    }
    return;
  }

  // Navigation requests — network-first, fall back to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) — cache-first, revalidate in background
  const isStaticAsset =
    url.pathname.match(/\.(js|css|woff2?|png|svg|ico|webp|jpg|jpeg)$/) ||
    url.pathname.startsWith("/sprites/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((c) => c.put(request, response.clone()));
          }
          return response;
        });
        // Return cached immediately; revalidate in background
        return cached || networkFetch;
      }),
    );
    return;
  }
});

// ── Replay queued mutations when back online ─────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "replay-mutations") {
    event.waitUntil(replayQueuedMutations());
  }
});

// ── Message channel: manual replay trigger from the app ──────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "REPLAY_MUTATIONS") {
    replayQueuedMutations().catch(() => {});
  }
});
