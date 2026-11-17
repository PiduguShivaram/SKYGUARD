// SkyGuard Service Worker for Browser Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'SkyGuard Emergency Alert';
    const options = {
      body: data.body || 'A new weather or disaster advisory has been issued.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: {
        url: data.url || '/',
        id: data.id,
        severity: data.severity,
      },
      tag: data.tag || `skyguard-alert-${Date.now()}`,
      requireInteraction: data.severity === 'Extreme' || data.severity === 'Severe',
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SkyGuard SW] Failed to parse push notification payload:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
