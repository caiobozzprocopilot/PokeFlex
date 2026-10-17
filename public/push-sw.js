// Notificações push do PokeFlex. Carregado pelo service worker gerado pelo vite-plugin-pwa (workbox.importScripts).

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'PokeFlex'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || '/' },
      lang: 'pt-BR',
    }),
  )
})

// Toque na notificação: volta para a aba do PokeFlex já aberta (na tela certa) ou abre uma nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) {
        await open.focus()
        return open.navigate(target).catch(() => open.postMessage({ type: 'navigate', url: target }))
      }
      return self.clients.openWindow(target)
    })(),
  )
})
