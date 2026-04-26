/* Swetrix push notifications service worker. */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const arrayBufferToBase64 = (buffer) => {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const buildSubscriptionFormData = (subscription) => {
  const sub = subscription.toJSON()
  const endpoint = sub.endpoint || subscription.endpoint
  const p256dh = sub.keys?.p256dh || arrayBufferToBase64(subscription.getKey?.('p256dh'))
  const auth = sub.keys?.auth || arrayBufferToBase64(subscription.getKey?.('auth'))

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Incomplete web push subscription')
  }

  const formData = new FormData()
  formData.set('intent', 'webpush-subscribe')
  formData.set('name', 'Browser')
  formData.set('endpoint', endpoint)
  formData.set('keys', JSON.stringify({ p256dh, auth }))
  formData.set('userAgent', self.navigator?.userAgent || '')
  return formData
}

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
  const tag = data.tag || data.alert_id || data.id || url

  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url },
    tag,
    renotify: true,
    timestamp: Date.now(),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options ?? { userVisibleOnly: true })
      .then((subscription) =>
        fetch('/notification-channel', {
          method: 'POST',
          body: buildSubscriptionFormData(subscription),
          credentials: 'same-origin',
        }),
      )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to update web push subscription: ${response.status}`)
        }
      })
      .catch((error) => {
        console.error(error)
        throw error
      }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  let targetUrl
  try {
    targetUrl = new URL(url, self.location.origin)
  } catch {
    targetUrl = new URL('/', self.location.origin)
  }
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl.href && 'focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl.href)
        }
        return null
      }),
  )
})
