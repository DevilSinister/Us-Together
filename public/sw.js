const CACHE = "us-together-shell-v2";
const SHELL = ["/offline", "/icon.svg", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

/**
 * Navigations fall back to the offline page when the network fails. The response is
 * never written to the cache, so an authenticated page is not retained — only the
 * static offline shell is. An installed app launches at /home, so excluding that
 * route would show the browser's own error page on the first offline launch.
 */
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline")));
});

/**
 * Push payloads carry an envelope, never content: a generic title the server already
 * wrote into the notification row, a category, and a target path. Nothing here can
 * disclose a note body, a wishlist purchase secret, or a gift plan, because the
 * server never puts those in the payload.
 *
 * iOS revokes a subscription that receives a push without showing a notification, so
 * every branch shows one, including the malformed-payload branch.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title : "Us Together";
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/notifications";
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof payload.body === "string" ? payload.body : "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: typeof payload.tag === "string" && payload.tag ? payload.tag : url,
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/notifications", self.location.origin);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if (new URL(client.url).origin === target.origin && "focus" in client) {
        if ("navigate" in client) client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  }));
});

/**
 * The browser can rotate a subscription without the page open. Re-subscribing here
 * keeps delivery alive; the server upserts on endpoint and prunes the stale row.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    try {
      const response = await fetch("/api/push/key", { credentials: "include" });
      if (!response.ok) return;
      const { key } = await response.json();
      if (!key) return;
      const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), replaces: event.oldSubscription ? event.oldSubscription.endpoint : null }),
      });
    } catch {
      // Delivery resumes the next time the app opens and re-registers.
    }
  })());
});
