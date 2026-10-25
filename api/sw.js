// Service worker přehledu objednávek (rozsah /api/): jen upozornění na telefon (Web Push), nic se necachuje.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.title || 'Ovocnářství Holub', {
    body: d.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/favicon-32.png',
    tag: d.tag || undefined,
    data: { url: d.url || 'rozvoz.php' },
  }))
})

// Ťuknutí na upozornění: otevřená aplikace přejde na danou stránku, jinak se otevře nová.
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || 'rozvoz.php', self.registration.scope).href
  e.waitUntil((async () => {
    const okna = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const o of okna) {
      if (o.url.startsWith(self.registration.scope) && 'navigate' in o) {
        await o.focus()
        return o.navigate(url)
      }
    }
    return self.clients.openWindow(url)
  })())
})
