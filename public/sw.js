// Arbora service worker — handles push notifications and background sync.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ---------- Push notifications ----------
self.addEventListener('push', (event) => {
  let data = { title: 'Arbora reminder', body: 'Time to check in on your habit.' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_e) {}

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'arbora-reminder',
    data: { url: data.url || '/' },
    vibrate: [120, 60, 120],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) return w.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// ---------- Background Sync ----------
// When connectivity returns or the browser triggers a deferred sync,
// wake any open Arbora client and ask it to flush its outbox. If no
// clients are open we open a hidden one so IndexedDB + Supabase auth
// (stored in the page) can replay queued mutations.
async function triggerOutboxFlush() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length) {
    for (const c of clients) c.postMessage({ type: 'flush-outbox' });
    return;
  }
  // No open client — try opening one in the background. Some browsers ignore
  // this outside a notification click; that's acceptable, the page will flush
  // next time the user opens the app.
  try {
    await self.clients.openWindow('/?sw-flush=1');
  } catch (_) {}
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'arbora-outbox') {
    event.waitUntil(triggerOutboxFlush());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'arbora-outbox-periodic') {
    event.waitUntil(triggerOutboxFlush());
  }
});
