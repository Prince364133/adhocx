// AdhocX Enterprise Mobility — Firebase Cloud Messaging Service Worker
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Push Messages
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notificationTitle = payload.notification?.title || payload.data?.title || 'AdhocX Alert';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || '',
      icon: payload.notification?.icon || '/adhocx_icon.png',
      badge: '/adhocx_icon.png',
      image: payload.notification?.image || payload.data?.imageUrl,
      data: payload.data || {},
      tag: payload.data?.tag || `adhocx-${Date.now()}`,
      renotify: true,
      requireInteraction: payload.data?.requireInteraction === 'true',
      actions: [
        { action: 'open', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (err) {
    console.error('Error processing background push message in service worker:', err);
  }
});

// Handle Notification Click / Open
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const actionUrl = event.notification.data?.actionUrl || '/notifications';
  const notificationId = event.notification.data?.id;

  // Track interaction if notificationId present
  if (notificationId) {
    try {
      fetch(`/api/notifications/in-app/${notificationId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
    } catch (_) {}
  }

  // Focus existing open tab or navigate to target URL
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(actionUrl)) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(actionUrl);
      }
    })
  );
});
