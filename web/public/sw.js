/* Swetrix push notifications service worker. */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Swetrix', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || data.subject || 'Swetrix'
  const body = data.body || data.message || ''
  const url = data.url || data.dashboard_url || '/'

  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url },
    timestamp: Date.now(),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
      return null
    }),
  )
})
